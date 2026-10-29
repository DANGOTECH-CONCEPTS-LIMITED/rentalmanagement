using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Infrastructure.Services.PaymentServices;

public static class DangoReferenceNumberAllocator
{
    public static void ValidateCategory(string category)
    {
        // B is reserved for outbound NWSC bill payments; V is reserved for biller customer validation lookups.
        if (category is not ("U" or "R" or "W" or "B" or "V"))
            throw new ArgumentException("Dango payment category must be U (utility), R (rent), W (wallet), B (bill) or V (validation).", nameof(category));
    }

    public static async Task<string> AllocateAsync(AppDbContext db, string category, DateTime utcNow)
    {
        ValidateCategory(category);
        var date = utcNow.Date;
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var last = await db.Set<DangoPaymentReferenceAllocation>().AsNoTracking()
                .Where(x => x.DateUtc == date).MaxAsync(x => (long?)x.Sequence) ?? 0;
            var allocation = new DangoPaymentReferenceAllocation { DateUtc = date, Sequence = checked(last + 1) };
            db.Add(allocation);
            try
            {
                // The composite primary key arbitrates competing allocators across processes.
                await db.SaveChangesAsync();
                db.Entry(allocation).State = EntityState.Detached;
                return string.Create(CultureInfo.InvariantCulture, $"DANGO_{category}_{date:yyyyMMdd}_{allocation.Sequence}");
            }
            catch (DbUpdateException)
            {
                db.Entry(allocation).State = EntityState.Detached;
                if (!await db.Set<DangoPaymentReferenceAllocation>().AsNoTracking()
                    .AnyAsync(x => x.DateUtc == date && x.Sequence == allocation.Sequence))
                    throw;
            }
        }
        throw new InvalidOperationException("Unable to allocate a unique Dango reference. No payment was submitted.");
    }
}
