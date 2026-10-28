using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.PaymentServices.WalletSvc;

public static class WalletPayoutReversal
{
    public static async Task<bool> ReverseAsync(AppDbContext db, WalletTransaction request, bool matchById,
        bool pendingOnly = false, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var reason = string.IsNullOrWhiteSpace(request.ReasonAtTelecom) ? request.Description : request.ReasonAtTelecom;
        var vendorReference = request.VendorTranId;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var candidates = matchById ? db.WalletTransactions.Where(x => x.Id == request.Id)
            : db.WalletTransactions.Where(x => x.TransactionId == request.TransactionId);
        var originalQuery = candidates;
        if (pendingOnly)
            candidates = candidates.Where(x => x.TransactionId == request.TransactionId && x.Amount == request.Amount &&
                (x.Status == "PENDING AT TELCOM" || x.Status == "PENDING AT TELECOM" || x.Status == "PENDING AT THE BANK"));
        var claimed = await candidates.Where(x => x.Amount < 0 &&
            (x.Status == "PENDING" || x.Status == "PENDING_BANK_PAYOUT" || x.Status == "PENDING_WALLET_PAYOUT" ||
             x.Status == "PENDING AT TELCOM" || x.Status == "PENDING AT TELECOM" || x.Status == "PENDING AT THE BANK" ||
             x.Status == "FAILED AT TELECOM" || x.Status == "FAILED AT THE BANK" || x.Status == "FAILED_WALLET_TRANSFER"))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "REVERSED")
                .SetProperty(x => x.ReasonAtTelecom, reason)
                .SetProperty(x => x.VendorTranId, x => string.IsNullOrWhiteSpace(vendorReference) ? x.VendorTranId : vendorReference), ct);
        if (claimed == 0)
        {
            if (!pendingOnly && !await candidates.AnyAsync(ct)) throw new InvalidOperationException("Wallet transaction not found.");
            return false; // Already reversed, settled, or not a withdrawal: never credit it again.
        }
        var original = await originalQuery.AsNoTracking().SingleAsync(ct);
        var amount = Math.Abs(original.Amount);
        db.WalletTransactions.Add(new WalletTransaction
        {
            WalletId = original.WalletId, Amount = amount, Description = $"Reversal of transaction {original.TransactionId}",
            TransactionDate = DateTime.UtcNow, TransactionId = Guid.NewGuid().ToString(), Status = "REVERSAL",
            VendorTranId = original.TransactionId, ReasonAtTelecom = reason
        });
        await db.SaveChangesAsync(ct);
        var updated = await db.Wallets.Where(x => x.Id == original.WalletId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Balance, x => x.Balance + amount), ct);
        if (updated != 1) throw new InvalidOperationException("Wallet not found.");
        await transaction.CommitAsync(ct);
        // Keep any caller's tracked wallet and transaction consistent with the atomic database writes.
        foreach (var entry in db.ChangeTracker.Entries<Wallet>().Where(x => x.Entity.Id == original.WalletId).ToList())
            await entry.ReloadAsync(ct);
        foreach (var entry in db.ChangeTracker.Entries<WalletTransaction>().Where(x => x.Entity.Id == original.Id).ToList())
            await entry.ReloadAsync(ct);
        return true;
    }
}
