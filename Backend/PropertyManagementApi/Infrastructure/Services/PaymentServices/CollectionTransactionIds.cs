using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace Infrastructure.Services.PaymentServices;

public static class CollectionTransactionIds
{
    private static string ReferenceHash(string category, string reference)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(category + ":" + reference)));

    public static async Task<string?> FindAsync(AppDbContext db, string category, string reference)
    {
        var hash = ReferenceHash(category, reference);
        return await db.Set<CollectionTransactionIdentity>().AsNoTracking()
            .Where(x => x.Category == category && (x.TransactionId == reference || x.ClientReferenceHash == hash))
            .Select(x => x.TransactionId).SingleOrDefaultAsync();
    }

    public static async Task<bool> IsIssuedAsync(AppDbContext db, string category, string transactionId)
        => await db.Set<CollectionTransactionIdentity>().AsNoTracking()
            .AnyAsync(x => x.Category == category && x.TransactionId == transactionId);

    public static async Task<string> CreateAsync(AppDbContext db, string category, string? clientReference = null)
    {
        DangoReferenceNumberAllocator.ValidateCategory(category);
        if (clientReference?.Length > 128)
            throw new ArgumentException("Client reference must not exceed 128 characters.", nameof(clientReference));
        if (string.IsNullOrWhiteSpace(clientReference)) clientReference = null;
        if (clientReference != null)
        {
            var existing = await FindAsync(db, category, clientReference);
            if (existing != null) return existing;
        }

        var identity = new CollectionTransactionIdentity
        {
            TransactionId = await DangoReferenceNumberAllocator.AllocateAsync(db, category, DateTime.UtcNow),
            Category = category,
            ClientReferenceHash = clientReference == null ? null : ReferenceHash(category, clientReference)
        };
        db.Add(identity);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            db.Entry(identity).State = EntityState.Detached;
            if (clientReference == null) throw;
            var existing = await FindAsync(db, category, clientReference);
            if (existing == null) throw;
            return existing;
        }
        db.Entry(identity).State = EntityState.Detached;
        return identity.TransactionId;
    }
}
