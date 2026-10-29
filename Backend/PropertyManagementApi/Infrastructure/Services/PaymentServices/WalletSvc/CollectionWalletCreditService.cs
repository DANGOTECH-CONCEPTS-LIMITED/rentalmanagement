using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.PaymentServices.WalletSvc;

public sealed class CollectionWalletCreditService(AppDbContext db, PaymentProviderSettingsService? settings = null)
{
    public async Task CreditUtilityAsync(int paymentId, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var claimed = await db.UtilityPayments.Where(x => x.Id == paymentId && x.Status == "SUCCESSFUL AT TELECOM")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "SUCCESSFUL"), ct);
        if (claimed == 0) return;
        var payment = await db.UtilityPayments.AsNoTracking().SingleAsync(x => x.Id == paymentId, ct);
        if (payment.WalletCreditedAtUtc == null)
        {
            var meter = await db.UtilityMeters.AsNoTracking().FirstOrDefaultAsync(x => x.MeterNumber == payment.MeterNumber, ct)
                ?? throw new InvalidOperationException("Utility meter was not found.");
            var wallet = await db.Wallets.AsNoTracking().FirstOrDefaultAsync(x => x.LandlordId == meter.LandLordId, ct)
                ?? throw new InvalidOperationException("Utility owner's wallet was not found.");
            await CreditAsync(wallet, (decimal)payment.Amount, payment.TransactionID,
                $"{payment.Description}. Meter {payment.MeterNumber}", ct);
            await db.UtilityPayments.Where(x => x.Id == paymentId)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.WalletCreditedAtUtc, DateTime.UtcNow), ct);
            if (settings != null)
            {
                await new BillPaymentSchedulingService(db)
                    .TryCreateAsync(payment, meter, (decimal)payment.Amount, settings, ct);
                await db.SaveChangesAsync(ct);
            }
        }
        await transaction.CommitAsync(ct);
    }

    public async Task CreditRentAsync(int paymentId, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var claimed = await db.TenantPayments.Where(x => x.Id == paymentId && x.PaymentStatus == "SUCCESSFUL AT TELECOM")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.PaymentStatus, "SUCCESSFUL"), ct);
        if (claimed == 0) return;
        var payment = await db.TenantPayments.AsNoTracking().Include(x => x.PropertyTenant).ThenInclude(x => x.Property)
            .SingleAsync(x => x.Id == paymentId, ct);
        if (payment.WalletCreditedAtUtc == null)
        {
            var owner = payment.PropertyTenant.Property!.OwnerId;
            var wallet = await db.Wallets.AsNoTracking().FirstOrDefaultAsync(x => x.LandlordId == owner, ct);
            if (wallet == null)
            {
                wallet = new Wallet { LandlordId = owner };
                db.Wallets.Add(wallet);
                await db.SaveChangesAsync(ct);
            }
            await CreditAsync(wallet, (decimal)payment.Amount, payment.TransactionId,
                $"{payment.Description}. Tenant {payment.PropertyTenant.FullName}", ct);
            await db.TenantPayments.Where(x => x.Id == paymentId)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.WalletCreditedAtUtc, DateTime.UtcNow), ct);
        }
        await transaction.CommitAsync(ct);
    }

    private async Task CreditAsync(Wallet wallet, decimal amount, string? reference, string description, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reference))
            throw new InvalidOperationException("A collection transaction ID is required before crediting a wallet.");
        // Recognize credits written before the durable marker was introduced.
        if (await db.WalletTransactions.AsNoTracking().AnyAsync(x => x.WalletId == wallet.Id &&
            x.TransactionId == reference && x.Amount > 0 && x.Status != "REVERSAL", ct)) return;
        db.WalletTransactions.Add(new WalletTransaction
        {
            WalletId = wallet.Id, Amount = amount, Description = description,
            TransactionId = reference, TransactionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
        await db.Wallets.Where(x => x.Id == wallet.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Balance, x => x.Balance + amount), ct);
    }
}
