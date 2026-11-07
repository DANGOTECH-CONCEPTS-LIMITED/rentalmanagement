using System.Text.Json;
using Application.Interfaces.Analytics;
using Application.Interfaces.Notifications;
using Domain.Entities.PropertyMgt;
using Domain.Notifications;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.PaymentServices;

// Submits queued NWSC bill payments and debits the utility wallet only after Dango confirms success.
public sealed class BillPaymentProcessingService(AppDbContext db, DangoPaymentClient dango, ILogger<BillPaymentProcessingService> logger, INotificationDispatcher notifications, IPaymentStatusHistory history)
{
    private static readonly TimeSpan RecheckInterval = TimeSpan.FromMinutes(1);
    // A bill the provider never resolves stays polled, but is surfaced for manual follow-up after this.
    private static readonly TimeSpan ReconciliationAfter = TimeSpan.FromMinutes(30);

    public async Task<int> ProcessAsync(CancellationToken ct)
    {
        var cycleStart = DateTime.UtcNow;
        var biller = await db.Set<DangoBillerSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (!BillPaymentSchedulingService.BillerConfigured(biller)) return 0;
        var processed = 0;
        // Snapshot confirmations first so bills submitted in this cycle get provider processing time.
        var awaiting = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => (x.Status == BillPaymentInstructionStatus.PendingConfirmation ||
                         x.Status == BillPaymentInstructionStatus.ReconciliationRequired) &&
                        (x.LastCheckedAtUtc == null || x.LastCheckedAtUtc < cycleStart - RecheckInterval))
            .OrderBy(x => x.Id).Take(50).ToListAsync(ct);
        var pending = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.PendingSubmission)
            .OrderBy(x => x.Id).Take(20).ToListAsync(ct);

        foreach (var item in pending) { await SubmitAsync(item, biller!, ct); processed++; }
        foreach (var item in awaiting) { await ConfirmAsync(item, ct); processed++; }
        processed += await FlagStaleConfirmationsAsync(cycleStart, ct);
        return processed;
    }

    // Never stops polling a bill the provider may still settle; only raises it for human follow-up.
    private async Task<int> FlagStaleConfirmationsAsync(DateTime cycleStart, CancellationToken ct)
    {
        var cutoff = cycleStart - ReconciliationAfter;
        var stale = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.PendingConfirmation &&
                        x.SubmittedAtUtc != null && x.SubmittedAtUtc < cutoff && x.WalletDebitedAtUtc == null)
            .OrderBy(x => x.Id).Take(50).ToListAsync(ct);
        var flagged = 0;
        foreach (var item in stale)
        {
            var reason = $"No provider confirmation after {(int)ReconciliationAfter.TotalMinutes} minutes; flagged for reconciliation. Polling continues.";
            var updated = await db.Set<BillPaymentInstruction>()
                .Where(x => x.Id == item.Id && x.Status == BillPaymentInstructionStatus.PendingConfirmation)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.ReconciliationRequired)
                    .SetProperty(x => x.Reason, reason), ct);
            if (updated == 0) continue;
            flagged++;
            await history.RecordAsync(PaymentStatusSubject.BillPayment, item.Id,
                BillPaymentInstructionStatus.PendingConfirmation, BillPaymentInstructionStatus.ReconciliationRequired,
                reason, reference: item.RequestReference, amount: item.Amount, ct: ct);
            await NotifyStaleConfirmationAsync(item, reason);
        }
        return flagged;
    }

    private async Task NotifyStaleConfirmationAsync(BillPaymentInstruction item, string detail)
    {
        var subject = $"NWSC bill payment still unconfirmed: {item.RequestReference}";
        var body = $"<p>{detail}</p>" +
            $"<p>Reference: <b>{item.RequestReference}</b><br/>Meter: {item.MeterNumber}<br/>NWSC account: {item.NwscAccount}<br/>Amount: {item.Amount}</p>" +
            "<p>No utility wallet debit has been made. Confirm the final state with Dango before retrying or resubmitting.</p>";
        await notifications.DispatchAsync(new NotificationRequest(
            NotificationEvents.BillPaymentUnconfirmed, subject, body, item.RequestReference));
        logger.LogInformation("Stale NWSC bill confirmation flagged for {Reference}", item.RequestReference);
    }

    private async Task SubmitAsync(BillPaymentInstruction item, DangoBillerSetting biller, CancellationToken ct)
    {
        // Biller customer name comes from the meter's NWSC registration; location is the utility meter's physical location.
        var meter = await db.UtilityMeters.AsNoTracking()
            .Where(x => x.MeterNumber == item.MeterNumber)
            .Select(x => new { x.NwscRegisteredName, x.UtilityMeterLocation, x.CustomerMobile }).FirstOrDefaultAsync(ct);
        var customerName = string.IsNullOrWhiteSpace(meter?.NwscRegisteredName) ? null : meter!.NwscRegisteredName!.Trim();
        var location = string.IsNullOrWhiteSpace(meter?.UtilityMeterLocation) ? null : meter!.UtilityMeterLocation!.Trim();
        string? customerMobile = null;
        if (!string.IsNullOrWhiteSpace(meter?.CustomerMobile))
        {
            try { customerMobile = DangoPaymentClient.NormalizePhone(meter!.CustomerMobile); }
            catch (ArgumentException) { customerMobile = null; }
        }
        try { dango.ValidateBillPayment(biller, item.NwscAccount, location, item.Amount); }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            await FailAsync(item, ex.Message, ct);
            return;
        }

        var owner = await db.Users.AsNoTracking().Where(x => x.Id == item.UtilityOwnerId)
            .Select(x => new { x.FullName, x.PhoneNumber }).SingleOrDefaultAsync(ct);
        var phone = await db.UtilityPayments.AsNoTracking().Where(x => x.Id == item.UtilityPaymentId)
            .Select(x => x.PhoneNumber).SingleOrDefaultAsync(ct);
        // Claim the submission before network I/O so instances cannot submit the same bill twice.
        var claimed = await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id && x.SubmittedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.SubmittedAtUtc, DateTime.UtcNow)
                .SetProperty(x => x.SubmissionAttempts, x => x.SubmissionAttempts + 1), ct);
        if (claimed == 0) return;

        string raw;
        try
        {
            raw = await dango.SubmitBillPaymentAsync(item.RequestReference, item.NwscAccount,
                customerName ?? owner?.FullName, customerMobile ?? phone ?? owner?.PhoneNumber, location, item.Amount, biller, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
        {
            logger.LogWarning("NWSC bill submission outcome unknown for {Reference}: {Error}", item.RequestReference, ex.GetType().Name);
            return; // Remains PENDING_SUBMISSION; the provider was not proven to have accepted it.
        }

        var (state, vendorReference, message, externalRefNoBillerId) = Parse(raw);
        if (state == "FAILED")
        {
            await FailAsync(item, message, ct, raw);
            return;
        }
        if (state == "SUCCESSFUL")
        {
            // The submission itself reported a definitive settlement (statusCode 00): settle now
            // and skip the status poll. The provider's statusDescription becomes the reason.
            await CompleteAsync(item, raw, vendorReference, ct,
                reason: string.IsNullOrWhiteSpace(message) ? null : message,
                externalRefNoBillerId: externalRefNoBillerId);
            return;
        }
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id).ExecuteUpdateAsync(s => s
            .SetProperty(x => x.Response, raw)
            .SetProperty(x => x.ProviderReference, string.IsNullOrWhiteSpace(vendorReference) ? null : vendorReference)
            .SetProperty(x => x.ExternalRefNoBillerId, string.IsNullOrWhiteSpace(externalRefNoBillerId) ? null : externalRefNoBillerId)
            // Keeps a transport failure ("settlement unconfirmed") visible instead of looking accepted.
            .SetProperty(x => x.Reason, string.IsNullOrWhiteSpace(message) ? null : message)
            .SetProperty(x => x.Status, BillPaymentInstructionStatus.PendingConfirmation), ct);
        await history.RecordAsync(PaymentStatusSubject.BillPayment, item.Id, item.Status,
            BillPaymentInstructionStatus.PendingConfirmation, message, reference: item.RequestReference, amount: item.Amount, ct: ct);
        logger.LogInformation("NWSC bill {Reference} awaiting provider confirmation: {Message}", item.RequestReference, message);
    }

    private async Task ConfirmAsync(BillPaymentInstruction item, CancellationToken ct)
    {
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.LastCheckedAtUtc, DateTime.UtcNow), ct);
        string raw;
        try { raw = await dango.GetBillPaymentStatusAsync(item.RequestReference, ct); }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
        {
            logger.LogWarning("NWSC bill status unknown for {Reference}: {Error}", item.RequestReference, ex.GetType().Name);
            return;
        }
        var (state, vendorReference, message, externalRefNoBillerId) = Parse(raw);
        var httpStatus = ReadHttpStatus(raw);
        if (httpStatus >= 500)
        {
            // Transient server error while confirming: keep PENDING_CONFIRMATION and reprocess on the next cycle.
            logger.LogWarning("NWSC bill {Reference} status check returned HTTP {HttpStatus}; reprocessing the confirmation.", item.RequestReference, httpStatus);
            await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Response, raw), ct);
            return;
        }
        if (state == "PENDING")
        {
            await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id).ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Response, raw)
                .SetProperty(x => x.ProviderReference, string.IsNullOrWhiteSpace(vendorReference) ? item.ProviderReference : vendorReference), ct);
            return;
        }
        if (state == "FAILED")
        {
            await FailAsync(item, message, ct, raw);
            return;
        }
        if (state == "AMBIGUOUS")
        {
            await NotifyReconciliationAsync(item, raw);
            await CompleteAsync(item, raw, vendorReference, ct, "Transaction Ambiguous — reconciliation required", externalRefNoBillerId);
            return;
        }
        await CompleteAsync(item, raw, vendorReference, ct, externalRefNoBillerId: externalRefNoBillerId);
    }

    private async Task NotifyReconciliationAsync(BillPaymentInstruction item, string raw)
    {
        var subject = $"NWSC bill payment reconciliation required: {item.RequestReference}";
        var body = $"<p>Dango returned an ambiguous status (<b>100 Transaction Ambiguous</b>) for NWSC bill payment <b>{item.RequestReference}</b>.</p>" +
            $"<p>Meter: {item.MeterNumber}<br/>NWSC account: {item.NwscAccount}<br/>Amount: {item.Amount}</p>" +
            $"<p>The payment was treated as settled and the utility wallet debited, but please reconcile with Dango.</p>" +
            $"<pre>{System.Net.WebUtility.HtmlEncode(raw)}</pre>";
        await notifications.DispatchAsync(new NotificationRequest(
            NotificationEvents.BillPaymentUnconfirmed, subject, body, item.RequestReference));
        logger.LogInformation("Reconciliation alert sent for ambiguous NWSC bill {Reference}", item.RequestReference);
    }

    private async Task CompleteAsync(BillPaymentInstruction item, string raw, string vendorReference, CancellationToken ct,
        string? reason = null, string? externalRefNoBillerId = null)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var claimed = await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id &&
                (x.Status == BillPaymentInstructionStatus.PendingConfirmation || x.Status == BillPaymentInstructionStatus.PendingSubmission ||
                 x.Status == BillPaymentInstructionStatus.ReconciliationRequired) &&
                x.WalletDebitedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.Successful)
                .SetProperty(x => x.ConfirmedAtUtc, DateTime.UtcNow)
                .SetProperty(x => x.Response, raw)
                .SetProperty(x => x.ProviderReference, string.IsNullOrWhiteSpace(vendorReference) ? item.ProviderReference : vendorReference)
                .SetProperty(x => x.ExternalRefNoBillerId, x => string.IsNullOrWhiteSpace(externalRefNoBillerId) ? x.ExternalRefNoBillerId : externalRefNoBillerId)
                .SetProperty(x => x.Reason, reason), ct);
        if (claimed == 0) { await transaction.RollbackAsync(ct); return; }

        var walletId = await db.Wallets.AsNoTracking().Where(x => x.LandlordId == item.UtilityOwnerId)
            .Select(x => (int?)x.Id).FirstOrDefaultAsync(ct);
        if (walletId == null)
        {
            await MarkUndebitedAsync(item, "Utility owner's wallet was not found", transaction, ct);
            return;
        }
        var debited = await db.Wallets.Where(x => x.Id == walletId && x.Balance >= item.Amount)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Balance, x => x.Balance - item.Amount), ct);
        if (debited == 0)
        {
            await MarkUndebitedAsync(item, "Insufficient utility wallet balance at confirmation", transaction, ct);
            return;
        }
        if (!await db.WalletTransactions.AnyAsync(x => x.TransactionId == item.RequestReference && x.Amount < 0, ct))
        {
            db.WalletTransactions.Add(new WalletTransaction
            {
                WalletId = walletId.Value,
                Amount = -item.Amount,
                Description = $"NWSC bill payment {item.NwscAccount} (meter {item.MeterNumber})",
                TransactionId = item.RequestReference,
                Status = "SUCCESSFUL",
                VendorTranId = string.IsNullOrWhiteSpace(vendorReference) ? item.ProviderReference ?? string.Empty : vendorReference,
                TransactionDate = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.WalletDebitedAtUtc, DateTime.UtcNow), ct);
        await history.RecordAsync(PaymentStatusSubject.BillPayment, item.Id, item.Status,
            BillPaymentInstructionStatus.Successful, reason, reference: item.RequestReference, amount: item.Amount, ct: ct);
        await transaction.CommitAsync(ct);
        logger.LogInformation("NWSC bill {Reference} confirmed and utility wallet debited", item.RequestReference);
    }

    private async Task MarkUndebitedAsync(BillPaymentInstruction item, string reason, Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction, CancellationToken ct)
    {
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.PaidUndebited)
                .SetProperty(x => x.Reason, reason), ct);
        await history.RecordAsync(PaymentStatusSubject.BillPayment, item.Id, item.Status,
            BillPaymentInstructionStatus.PaidUndebited, reason, reference: item.RequestReference, amount: item.Amount, ct: ct);
        await transaction.CommitAsync(ct);
        logger.LogError("NWSC bill {Reference} was confirmed but the utility wallet could not be debited: {Reason}",
            item.RequestReference, reason);

        // The provider already took the money, so this must reach a human even if the wallet did not move.
        await notifications.DispatchAsync(new NotificationRequest(
            NotificationEvents.BillPaymentUndebited,
            $"NWSC bill paid but wallet NOT debited: {item.RequestReference}",
            $"<p>Dango confirmed NWSC bill <b>{item.RequestReference}</b>, but the utility wallet was not debited.</p>" +
            $"<p>Meter: {item.MeterNumber}<br/>NWSC account: {item.NwscAccount}<br/>Amount: {item.Amount}<br/>Utility owner id: {item.UtilityOwnerId}</p>" +
            $"<p>Reason: {System.Net.WebUtility.HtmlEncode(reason)}</p>" +
            "<p>Debit the wallet manually or reconcile with Dango; the bill is already paid at the provider.</p>",
            item.RequestReference));
    }

    private async Task FailAsync(BillPaymentInstruction item, string reason, CancellationToken ct, string? raw = null)
    {
        var storedReason = reason.Length > 256 ? reason.Substring(0, 256) : reason;
        // Only a real transition to FAILED sends the alert, so repeated handling cannot email twice.
        var updated = await db.Set<BillPaymentInstruction>()
            .Where(x => x.Id == item.Id &&
                        x.Status != BillPaymentInstructionStatus.Successful &&
                        x.Status != BillPaymentInstructionStatus.PaidUndebited &&
                        x.Status != BillPaymentInstructionStatus.Failed)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.Failed)
                .SetProperty(x => x.Reason, storedReason)
                .SetProperty(x => x.Response, raw), ct);
        if (updated > 0)
        {
            await history.RecordAsync(PaymentStatusSubject.BillPayment, item.Id, item.Status,
                BillPaymentInstructionStatus.Failed, reason, reference: item.RequestReference, amount: item.Amount, ct: ct);
            await NotifyFailureAsync(item, reason, raw);
        }
    }

    private async Task NotifyFailureAsync(BillPaymentInstruction item, string reason, string? raw)
    {
        var subject = $"NWSC bill payment FAILED: {item.RequestReference}";
        var body = $"<p>NWSC bill payment <b>{item.RequestReference}</b> failed and was not paid.</p>" +
            $"<p>Meter: {item.MeterNumber}<br/>NWSC account: {item.NwscAccount}<br/>Amount: {item.Amount}<br/>Utility owner id: {item.UtilityOwnerId}</p>" +
            $"<p>Reason: {System.Net.WebUtility.HtmlEncode(reason ?? string.Empty)}</p>" +
            (string.IsNullOrWhiteSpace(raw)
                ? string.Empty
                : $"<p>Provider response:</p><pre>{System.Net.WebUtility.HtmlEncode(raw)}</pre>") +
            "<p>No utility wallet debit was made. Review it in Bill Payments to retry or reconcile.</p>";
        await notifications.DispatchAsync(new NotificationRequest(
            NotificationEvents.BillPaymentFailed, subject, body, item.RequestReference));
        logger.LogInformation("Bill payment failure notification sent for {Reference}", item.RequestReference);
    }

    private static (string State, string VendorReference, string Message, string ExternalRefNoBillerId) Parse(string raw)
    {
        using var document = JsonDocument.Parse(raw);
        var data = document.RootElement.GetProperty("data");
        return (data.GetProperty("state").GetString() ?? "PENDING",
            data.TryGetProperty("vendorReference", out var reference) ? reference.GetString() ?? string.Empty : string.Empty,
            data.TryGetProperty("message", out var message) ? message.GetString() ?? string.Empty : string.Empty,
            data.TryGetProperty("externalRefNoBillerId", out var billerRef) ? billerRef.GetString() ?? string.Empty : string.Empty);
    }

    private static int ReadHttpStatus(string raw)
    {
        try
        {
            using var document = JsonDocument.Parse(raw);
            return document.RootElement.TryGetProperty("status", out var status) && status.TryGetInt32(out var value)
                ? value
                : 0;
        }
        catch (JsonException)
        {
            return 0;
        }
    }
}
