using Application.Interfaces.Analytics;
using Application.Interfaces.Notifications;
using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Domain.Notifications;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.PaymentServices;

public sealed class AdminPayoutReconciliationService(
    AppDbContext db,
    DangoPaymentClient dango,
    // Optional so tooling and tests can build the service without the notification matrix;
    // the DI container always supplies it.
    INotificationDispatcher? notifications = null,
    IPaymentStatusHistory? history = null) : IAdminPayoutReconciliation
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
        var item = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Bill payment not found.");
        var updated = await db.Set<BillPaymentInstruction>().Where(x => x.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, normalized), ct);
        if (updated == 0)
            throw new KeyNotFoundException("Bill payment not found.");

        if (history != null)
            await history.RecordAsync(PaymentStatusSubject.BillPayment, item.Id, item.Status, normalized,
                "Status set manually in Admin Bill Payments.", actor: null, reference: item.RequestReference, amount: item.Amount, ct: ct);

        // A hand-set FAILED used to change the row silently: nobody was told the bill stayed unpaid.
        if (normalized == BillPaymentInstructionStatus.Failed && notifications != null)
        {
            await notifications.DispatchAsync(new NotificationRequest(
                NotificationEvents.BillPaymentFailed,
                $"NWSC bill payment marked FAILED: {item.RequestReference}",
                $"<p>Bill payment <b>{item.RequestReference}</b> was manually marked FAILED by an administrator.</p>" +
                $"<p>Meter: {item.MeterNumber}<br/>NWSC account: {item.NwscAccount}<br/>Amount: {item.Amount}</p>" +
                "<p>Confirm with the provider whether the bill was paid before retrying.</p>",
                item.RequestReference), ct);
        }
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

        // Loaded for the audit trail (and reused by the failure alert below).
        var affected = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => distinct.Contains(x.Id)).ToListAsync(ct);

        var updated = await db.Set<BillPaymentInstruction>().Where(x => distinct.Contains(x.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, normalized), ct);

        if (history != null)
        {
            foreach (var row in affected)
                await history.RecordAsync(PaymentStatusSubject.BillPayment, row.Id, row.Status, normalized,
                    "Status set in bulk in Admin Bill Payments.", reference: row.RequestReference, amount: row.Amount, ct: ct);
        }

        if (updated > 0 && normalized == BillPaymentInstructionStatus.Failed && notifications != null)
        {
            var references = string.Join(string.Empty, affected.Select(x =>
                $"<li>{System.Net.WebUtility.HtmlEncode(x.RequestReference)} — {x.Amount:N2} ({System.Net.WebUtility.HtmlEncode(x.NwscAccount)})</li>"));
            await notifications.DispatchAsync(new NotificationRequest(
                NotificationEvents.BillPaymentFailed,
                $"{updated} NWSC bill payment(s) marked FAILED",
                $"<p>{updated} bill payment(s) were manually marked FAILED by an administrator.</p><ul>{references}</ul>" +
                "<p>Confirm with the provider whether these bills were paid before retrying.</p>",
                affected.Count == 1 ? affected[0].RequestReference : null), ct);
        }

        return updated;
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
            if ((await TryCreateInstructionAsync(payment, actor: null, ct, allowRetry: false)).Created) created++;
        if (created > 0) await db.SaveChangesAsync(ct);
        return created;
    }

    public async Task<TriggerBillPaymentResult> TriggerBillPaymentAsync(string transactionId, string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("An authenticated administrator is required.");
        await EnsureBillPaymentsConfiguredAsync(ct);
        var value = (transactionId ?? string.Empty).Trim();
        if (value.Length == 0) throw new ArgumentException("A statement transaction ID is required.");
        var payment = await db.UtilityPayments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.TransactionID == value && x.Status == "SUCCESSFUL" && x.Amount > 0, ct)
            ?? throw new KeyNotFoundException("No credited utility collection matches this statement transaction.");
        var result = await TryCreateInstructionAsync(payment, actor, ct);
        if (result.Created) await db.SaveChangesAsync(ct);
        return result;
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

    private async Task<TriggerBillPaymentResult> TryCreateInstructionAsync(UtilityPayment payment, string? actor, CancellationToken ct, bool allowRetry = true)
    {
        var existing = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.UtilityPaymentId == payment.Id)
            .OrderByDescending(x => x.Id)
            .ToListAsync(ct);

        BillPaymentInstruction? failedAttempt = null;
        if (existing.Count > 0)
        {
            // Any open or settled attempt blocks a new one; only provider-rejected attempts can be replaced.
            var active = existing.FirstOrDefault(x => x.Status != BillPaymentInstructionStatus.Failed);
            if (active != null)
                return new(false, false, active.RequestReference,
                    $"This collection already has a {active.Status} bill payment ({active.RequestReference}).");
            if (!allowRetry)
                return new(false, false, existing[0].RequestReference, "This collection already has a bill payment instruction.");
            failedAttempt = existing[0];
            if (failedAttempt.WalletDebitedAtUtc != null || !string.IsNullOrWhiteSpace(failedAttempt.ProviderReference) ||
                !string.IsNullOrWhiteSpace(failedAttempt.ExternalRefNoBillerId))
                return new(false, false, failedAttempt.RequestReference,
                    "The failed attempt carries a provider reference, so Dango may have processed it. Reconcile it with Dango before retrying.");
        }

        var meter = await db.UtilityMeters.AsNoTracking().FirstOrDefaultAsync(x => x.MeterNumber == payment.MeterNumber, ct);
        if (meter == null)
            return new(false, false, null, "The meter for this collection could not be found.");
        if (!BillPaymentSchedulingService.RequiresBillPayment(meter.NWSCAccount))
            return new(false, false, null, "This meter has no NWSC account, so it does not need a bill payment.");

        // Every attempt gets a fresh DANGO_B_<date>_<sequence> reference, never the failed one.
        var reference = await DangoReferenceNumberAllocator.AllocateAsync(db, "B", DateTime.UtcNow);

        if (failedAttempt != null)
        {
            // The collection keeps a single instruction row (unique UtilityPaymentId), so the retry
            // replaces the failed attempt in place: new reference, cleared submission claim, and the
            // previous reference recorded in the reason for audit.
            var reason = $"Retry of {failedAttempt.RequestReference}{(string.IsNullOrWhiteSpace(actor) ? string.Empty : $" by {actor}")}; the previous attempt was rejected by Dango.";
            var storedReason = reason.Length > 256 ? reason.Substring(0, 256) : reason;
            var updated = await db.Set<BillPaymentInstruction>()
                .Where(x => x.Id == failedAttempt.Id && x.Status == BillPaymentInstructionStatus.Failed &&
                            x.WalletDebitedAtUtc == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.RequestReference, reference)
                    .SetProperty(x => x.Status, BillPaymentInstructionStatus.PendingSubmission)
                    .SetProperty(x => x.SubmittedAtUtc, (DateTime?)null)
                    .SetProperty(x => x.LastCheckedAtUtc, (DateTime?)null)
                    .SetProperty(x => x.ConfirmedAtUtc, (DateTime?)null)
                    .SetProperty(x => x.Response, (string?)null)
                    .SetProperty(x => x.ProviderReference, (string?)null)
                    .SetProperty(x => x.ExternalRefNoBillerId, (string?)null)
                    .SetProperty(x => x.Reason, storedReason), ct);
            if (updated == 0)
                return new(false, false, failedAttempt.RequestReference, "The bill payment changed during the retry. Refresh the list.");
            return new(true, true, reference,
                $"Retry queued with new reference {reference}; the failed reference {failedAttempt.RequestReference} is recorded in the reason.");
        }

        db.Add(new BillPaymentInstruction
        {
            UtilityPaymentId = payment.Id,
            MeterNumber = payment.MeterNumber,
            NwscAccount = meter.NWSCAccount!.Trim(),
            UtilityOwnerId = meter.LandLordId,
            Amount = (decimal)payment.Amount,
            RequestReference = reference,
            Reason = string.IsNullOrWhiteSpace(actor) ? null : $"Triggered by {actor}.",
            Status = BillPaymentInstructionStatus.PendingSubmission,
            CreatedAtUtc = DateTime.UtcNow
        });
        return new(true, false, reference, $"Bill payment {reference} created and queued for submission.");
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
