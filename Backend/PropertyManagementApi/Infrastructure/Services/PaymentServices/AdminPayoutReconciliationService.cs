using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.PaymentServices;

public sealed class AdminPayoutReconciliationService(AppDbContext db, DangoPaymentClient dango) : IAdminPayoutReconciliation
{
    private IQueryable<WalletTransaction> PendingDangoPayouts() => db.WalletTransactions.AsNoTracking()
        .Where(x => x.Amount < 0 && (x.Status == "PENDING AT TELCOM" || x.Status == "PENDING AT TELECOM" || x.Status == "PENDING AT THE BANK") &&
            db.Set<PaymentGatewaySubmission>().Any(s => s.Operation == "Payout" && s.Provider == "DangoPayment" && s.Reference == x.TransactionId));

    public async Task<AdminPayoutReconciliationPage> GetAsync(string? reference, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || reference?.Length > 128)
            throw new ArgumentException("Invalid search or pagination.");
        var query = PendingDangoPayouts();
        if (!string.IsNullOrWhiteSpace(reference)) query = query.Where(x => x.TransactionId == reference.Trim());
        var totalCount = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize + 1)
            .Select(x => new AdminPayoutReconciliationItem(x.Id, x.TransactionId, -x.Amount, x.Status, x.VendorTranId,
                x.Wallet.Landlord.FullName)).ToListAsync(ct);
        return new(rows.Take(pageSize).ToList(), page, pageSize, rows.Count > pageSize, totalCount);
    }

    public async Task<BillPaymentAdminPage> GetBillPaymentsAsync(string? reference, string? status, int page, int pageSize, DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
    {
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || reference?.Length > 128 || status?.Length > 32)
            throw new ArgumentException("Invalid search, status or pagination.");
        var query = db.Set<BillPaymentInstruction>().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(reference))
        {
            var value = reference.Trim();
            query = query.Where(x => x.RequestReference == value || x.NwscAccount == value || x.MeterNumber == value);
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status.Trim().ToUpperInvariant());
        if (from.HasValue) query = query.Where(x => x.CreatedAtUtc >= from.Value);
        if (to.HasValue) query = query.Where(x => x.CreatedAtUtc < to.Value.Date.AddDays(1));
        var totalCount = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize + 1)
            .Select(x => new BillPaymentAdminItem(x.Id, x.RequestReference, x.NwscAccount, x.MeterNumber,
                db.UtilityMeters.AsNoTracking().Where(m => m.MeterNumber == x.MeterNumber).Select(m => m.NwscRegisteredName).FirstOrDefault(),
                x.Amount, x.Status, x.ProviderReference, x.Reason, x.ExternalRefNoBillerId, x.CreatedAtUtc,
                x.SubmittedAtUtc, x.ConfirmedAtUtc, x.WalletDebitedAtUtc, x.SubmissionAttempts)).ToListAsync(ct);
        return new(rows.Take(pageSize).ToList(), page, pageSize, rows.Count > pageSize, totalCount);
    }

    private static readonly string[] BillPaymentStatuses =
    [
        BillPaymentInstructionStatus.PendingSubmission,
        BillPaymentInstructionStatus.PendingConfirmation,
        BillPaymentInstructionStatus.ReconciliationRequired,
        BillPaymentInstructionStatus.Successful,
        BillPaymentInstructionStatus.PaidUndebited,
        BillPaymentInstructionStatus.Failed
    ];

    // Pending states are produced by the provider flow, never typed in by an operator: a hand-set
    // PENDING_CONFIRMATION with no submission attempt is exactly the state that can never settle.
    private static string NormalizeManuallyAssignableStatus(string? status)
    {
        var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
        if (!BillPaymentStatuses.Contains(normalized))
            throw new ArgumentException($"Status must be one of: {string.Join(", ", BillPaymentStatuses)}.");
        if (normalized is BillPaymentInstructionStatus.PendingSubmission or BillPaymentInstructionStatus.PendingConfirmation)
            throw new ArgumentException("PENDING_SUBMISSION and PENDING_CONFIRMATION are driven by the provider flow and cannot be set manually. Use resubmit for a bill that was never sent.");
        return normalized;
    }

    public async Task UpdateBillPaymentStatusAsync(int id, string status, CancellationToken ct)
    {
        var normalized = NormalizeManuallyAssignableStatus(status);
        var updated = await db.Set<BillPaymentInstruction>().Where(x => x.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, normalized), ct);
        if (updated == 0)
            throw new KeyNotFoundException("Bill payment not found.");
    }

    public async Task<int> UpdateBillPaymentStatusesAsync(IReadOnlyCollection<int> ids, string status, CancellationToken ct)
    {
        var normalized = NormalizeManuallyAssignableStatus(status);
        if (ids == null || ids.Count == 0)
            throw new ArgumentException("Select at least one bill payment to update.");
        if (ids.Count > 500)
            throw new ArgumentException("A maximum of 500 bill payments can be updated at once.");
        var distinct = ids.Where(x => x > 0).Distinct().ToArray();
        if (distinct.Length == 0)
            throw new ArgumentException("Select at least one valid bill payment to update.");
        return await db.Set<BillPaymentInstruction>().Where(x => distinct.Contains(x.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, normalized), ct);
    }

    public async Task<int> BackfillBillPaymentsAsync(CancellationToken ct)
    {
        await EnsureBillPaymentsConfiguredAsync(ct);
        var payments = await db.UtilityPayments.AsNoTracking()
            .Where(x => x.Status == "SUCCESSFUL" && x.Amount > 0)
            .OrderBy(x => x.Id)
            .ToListAsync(ct);

        var created = 0;
        foreach (var payment in payments)
            if (await TryCreateInstructionAsync(payment, ct)) created++;
        if (created > 0) await db.SaveChangesAsync(ct);
        return created;
    }

    public async Task<bool> TriggerBillPaymentAsync(string transactionId, CancellationToken ct)
    {
        await EnsureBillPaymentsConfiguredAsync(ct);
        var value = (transactionId ?? string.Empty).Trim();
        if (value.Length == 0) throw new ArgumentException("A statement transaction ID is required.");
        var payment = await db.UtilityPayments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TransactionID == value && x.Status == "SUCCESSFUL" && x.Amount > 0, ct)
            ?? throw new KeyNotFoundException("No credited utility collection matches this statement transaction.");
        if (!await TryCreateInstructionAsync(payment, ct)) return false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task EnsureBillPaymentsConfiguredAsync(CancellationToken ct)
    {
        var biller = await db.Set<DangoBillerSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (!BillPaymentSchedulingService.BillerConfigured(biller))
            throw new InvalidOperationException("The NWSC biller is not configured or automatic bill payments are disabled.");
        var provider = await db.Set<PaymentProviderSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (provider?.Provider != PaymentProviderSettingsService.DangoPayment)
            throw new InvalidOperationException("Dango Payment API is not the active provider.");
    }

    private async Task<bool> TryCreateInstructionAsync(UtilityPayment payment, CancellationToken ct)
    {
        if (await db.Set<BillPaymentInstruction>().AsNoTracking().AnyAsync(x => x.UtilityPaymentId == payment.Id, ct))
            return false;
        var meter = await db.UtilityMeters.AsNoTracking().FirstOrDefaultAsync(x => x.MeterNumber == payment.MeterNumber, ct);
        if (meter == null || !BillPaymentSchedulingService.RequiresBillPayment(meter.NWSCAccount)) return false;

        var reference = await DangoReferenceNumberAllocator.AllocateAsync(db, "B", DateTime.UtcNow);
        db.Add(new BillPaymentInstruction
        {
            UtilityPaymentId = payment.Id,
            MeterNumber = payment.MeterNumber,
            NwscAccount = meter.NWSCAccount!.Trim(),
            UtilityOwnerId = meter.LandLordId,
            Amount = (decimal)payment.Amount,
            RequestReference = reference,
            Status = BillPaymentInstructionStatus.PendingSubmission,
            CreatedAtUtc = DateTime.UtcNow
        });
        return true;
    }

    // Requeues a bill the provider was never asked about. Any recorded submission attempt is refused:
    // the request may have reached Dango, so only reconciliation (never a blind resubmission) is safe.
    public async Task<string> ResubmitBillPaymentAsync(int id, string reason, string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("An authenticated administrator is required.");
        var trimmed = (reason ?? string.Empty).Trim();
        if (trimmed.Length is < 5 or > 500) throw new ArgumentException("A resubmission reason of 5–500 characters is required.");
        var row = await db.Set<BillPaymentInstruction>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Bill payment not found.");
        if (row.WalletDebitedAtUtc != null || row.Status is BillPaymentInstructionStatus.Successful or BillPaymentInstructionStatus.PaidUndebited)
            throw new InvalidOperationException("This bill payment is already settled and cannot be resubmitted.");
        if (row.SubmittedAtUtc != null || row.SubmissionAttempts > 0)
            throw new InvalidOperationException("A submission was already attempted for this bill payment. Confirm the final state with Dango and reconcile instead of resubmitting.");
        if (row.Status != BillPaymentInstructionStatus.PendingSubmission && row.Status != BillPaymentInstructionStatus.PendingConfirmation &&
            row.Status != BillPaymentInstructionStatus.Failed)
            throw new InvalidOperationException($"Only a bill that never reached the provider can be resubmitted; this one is {row.Status}.");
        var updated = await db.Set<BillPaymentInstruction>()
            .Where(x => x.Id == id && x.SubmittedAtUtc == null && x.SubmissionAttempts == 0 && x.WalletDebitedAtUtc == null &&
                        (x.Status == BillPaymentInstructionStatus.PendingSubmission || x.Status == BillPaymentInstructionStatus.PendingConfirmation ||
                         x.Status == BillPaymentInstructionStatus.Failed))
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Status, BillPaymentInstructionStatus.PendingSubmission)
                .SetProperty(x => x.LastCheckedAtUtc, (DateTime?)null)
                .SetProperty(x => x.Response, (string?)null)
                .SetProperty(x => x.Reason, $"Administrator {actor}: resubmitted before any provider attempt. Reason: {trimmed}"), ct);
        if (updated == 0) throw new InvalidOperationException("The bill payment changed during resubmission. Refresh the list.");
        return row.RequestReference;
    }

    public async Task<FailAndReversePayoutResponse> FailAndReverseAsync(int id, FailAndReversePayoutRequest request, string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("An authenticated administrator is required.");
        if (!request.ConfirmUnpaid || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length is < 5 or > 500 ||
            string.IsNullOrWhiteSpace(request.ConfirmedTransactionId) || request.ConfirmedTransactionId.Length > 128)
            throw new ArgumentException("Confirm the exact transaction ID, independent unpaid verification, and a reason of 5–500 characters.");
        var row = await PendingDangoPayouts().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (row == null)
        {
            if (!await db.WalletTransactions.AnyAsync(x => x.Id == id, ct)) throw new KeyNotFoundException("Payout not found.");
            throw new InvalidOperationException("Payout is no longer an eligible pending Dango withdrawal. Refresh the list.");
        }
        if (request.ConfirmedTransactionId != row.TransactionId)
            throw new ArgumentException("The confirmed transaction ID does not match the selected payout.");
        if (!await dango.HasUnresolvedNotFoundPayoutAsync(row.TransactionId, ct))
            throw new InvalidOperationException("Provider status is not a matching transaction-not-found response. No refund was made; reconcile and refresh.");
        row.ReasonAtTelecom = $"Administrator {actor}: verified unpaid; manually failed and reversed. Reason: {request.Reason.Trim()}";
        if (!await WalletPayoutReversal.ReverseAsync(db, row, matchById: true, pendingOnly: true, ct: ct))
            throw new InvalidOperationException("The payout changed during reconciliation. No additional refund was made; refresh the list.");
        return new(row.TransactionId, "REVERSED", -row.Amount);
    }
}
