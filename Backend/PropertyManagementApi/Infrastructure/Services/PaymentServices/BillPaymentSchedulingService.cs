using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.PaymentServices;

// Creates at most one NWSC bill instruction per credited utility collection.
public sealed class BillPaymentSchedulingService(AppDbContext db)
{
    public const string NotApplicable = "N/A";

    public static bool RequiresBillPayment(string? nwscAccount)
        => !string.IsNullOrWhiteSpace(nwscAccount) &&
           !string.Equals(nwscAccount.Trim(), NotApplicable, StringComparison.OrdinalIgnoreCase);

    public static bool BillerConfigured(DangoBillerSetting? biller)
        => biller is { AutoBillPaymentsEnabled: true } &&
           !string.IsNullOrWhiteSpace(biller.ServiceId) && !string.IsNullOrWhiteSpace(biller.Transtype);

    // Called inside the wallet-credit transaction so a failure rolls the credit back for a safe retry.
    public async Task TryCreateAsync(UtilityPayment payment, UtilityMeter meter, decimal creditedAmount,
        PaymentProviderSettingsService settings, CancellationToken ct = default)
    {
        if (!RequiresBillPayment(meter.NWSCAccount) || creditedAmount <= 0) return;
        var biller = await db.Set<DangoBillerSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (!BillerConfigured(biller)) return;
        if ((await settings.GetAsync(ct)).Provider != PaymentProviderSettingsService.DangoPayment) return;
        if (await db.Set<BillPaymentInstruction>().AnyAsync(x => x.UtilityPaymentId == payment.Id, ct)) return;
        var reference = await DangoReferenceNumberAllocator.AllocateAsync(db, "B", DateTime.UtcNow);
        db.Add(new BillPaymentInstruction
        {
            UtilityPaymentId = payment.Id,
            MeterNumber = payment.MeterNumber,
            NwscAccount = meter.NWSCAccount!.Trim(),
            UtilityOwnerId = meter.LandLordId,
            Amount = creditedAmount,
            RequestReference = reference,
            Status = BillPaymentInstructionStatus.PendingSubmission,
            CreatedAtUtc = DateTime.UtcNow
        });
    }
}
