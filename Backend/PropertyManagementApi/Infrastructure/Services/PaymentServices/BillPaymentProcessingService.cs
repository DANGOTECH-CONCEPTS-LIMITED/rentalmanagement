using System.Text.Json;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.PaymentServices;

// Submits queued NWSC bill payments and debits the utility wallet only after Dango confirms success.
public sealed class BillPaymentProcessingService(AppDbContext db, DangoPaymentClient dango, ILogger<BillPaymentProcessingService> logger)
{
    private static readonly TimeSpan RecheckInterval = TimeSpan.FromMinutes(1);

    public async Task<int> ProcessAsync(CancellationToken ct)
    {
        var cycleStart = DateTime.UtcNow;
        var biller = await db.Set<DangoBillerSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (!BillPaymentSchedulingService.BillerConfigured(biller)) return 0;
        var processed = 0;
        // Snapshot confirmations first so bills submitted in this cycle get provider processing time.
        var awaiting = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.PendingConfirmation &&
                        (x.LastCheckedAtUtc == null || x.LastCheckedAtUtc < cycleStart - RecheckInterval))
            .OrderBy(x => x.Id).Take(50).ToListAsync(ct);
        var pending = await db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.PendingSubmission)
            .OrderBy(x => x.Id).Take(20).ToListAsync(ct);

        foreach (var item in pending) { await SubmitAsync(item, biller!, ct); processed++; }
        foreach (var item in awaiting) { await ConfirmAsync(item, ct); processed++; }
        return processed;
    }

    private async Task SubmitAsync(BillPaymentInstruction item, DangoBillerSetting biller, CancellationToken ct)
    {
        // Biller customer name comes from the meter's NWSC registration; location is the utility meter's physical location.
        var meter = await db.UtilityMeters.AsNoTracking()
            .Where(x => x.MeterNumber == item.MeterNumber)
            .Select(x => new { x.NwscRegisteredName, x.UtilityMeterLocation }).FirstOrDefaultAsync(ct);
        var customerName = string.IsNullOrWhiteSpace(meter?.NwscRegisteredName) ? null : meter!.NwscRegisteredName!.Trim();
        var location = string.IsNullOrWhiteSpace(meter?.UtilityMeterLocation) ? null : meter!.UtilityMeterLocation!.Trim();
        try { dango.ValidateBillPayment(biller, item.NwscAccount, location, item.Amount); }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            await FailAsync(item.Id, ex.Message, ct);
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
                customerName ?? owner?.FullName, phone ?? owner?.PhoneNumber, location, item.Amount, biller, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
        {
            logger.LogWarning("NWSC bill submission outcome unknown for {Reference}: {Error}", item.RequestReference, ex.GetType().Name);
            return; // Remains PENDING_SUBMISSION; the provider was not proven to have accepted it.
        }

        var (state, vendorReference, message) = Parse(raw);
        if (state == "FAILED")
        {
            await FailAsync(item.Id, message, ct, raw);
            return;
        }
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id).ExecuteUpdateAsync(s => s
            .SetProperty(x => x.Response, raw)
            .SetProperty(x => x.ProviderReference, string.IsNullOrWhiteSpace(vendorReference) ? null : vendorReference)
            .SetProperty(x => x.Status, BillPaymentInstructionStatus.PendingConfirmation), ct);
        logger.LogInformation("NWSC bill {Reference} accepted by Dango and awaiting confirmation", item.RequestReference);
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
        var (state, vendorReference, message) = Parse(raw);
        if (state == "PENDING")
        {
            await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id).ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Response, raw)
                .SetProperty(x => x.ProviderReference, string.IsNullOrWhiteSpace(vendorReference) ? item.ProviderReference : vendorReference), ct);
            return;
        }
        if (state == "FAILED")
        {
            await FailAsync(item.Id, message, ct, raw);
            return;
        }
        await CompleteAsync(item, raw, vendorReference, ct);
    }

    private async Task CompleteAsync(BillPaymentInstruction item, string raw, string vendorReference, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var claimed = await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id &&
                x.Status == BillPaymentInstructionStatus.PendingConfirmation && x.WalletDebitedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.Successful)
                .SetProperty(x => x.ConfirmedAtUtc, DateTime.UtcNow)
                .SetProperty(x => x.Response, raw)
                .SetProperty(x => x.ProviderReference, string.IsNullOrWhiteSpace(vendorReference) ? item.ProviderReference : vendorReference), ct);
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
        await transaction.CommitAsync(ct);
        logger.LogInformation("NWSC bill {Reference} confirmed and utility wallet debited", item.RequestReference);
    }

    private async Task MarkUndebitedAsync(BillPaymentInstruction item, string reason, Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction, CancellationToken ct)
    {
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == item.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.PaidUndebited)
                .SetProperty(x => x.Reason, reason), ct);
        await transaction.CommitAsync(ct);
        logger.LogError("NWSC bill {Reference} was confirmed but the utility wallet could not be debited: {Reason}",
            item.RequestReference, reason);
    }

    private async Task FailAsync(int id, string reason, CancellationToken ct, string? raw = null)
    {
        var storedReason = reason.Length > 256 ? reason.Substring(0, 256) : reason;
        await db.Set<BillPaymentInstruction>().Where(x => x.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, BillPaymentInstructionStatus.Failed)
                .SetProperty(x => x.Reason, storedReason)
                .SetProperty(x => x.Response, raw), ct);
    }

    private static (string State, string VendorReference, string Message) Parse(string raw)
    {
        using var document = JsonDocument.Parse(raw);
        var data = document.RootElement.GetProperty("data");
        return (data.GetProperty("state").GetString() ?? "PENDING",
            data.TryGetProperty("vendorReference", out var reference) ? reference.GetString() ?? string.Empty : string.Empty,
            data.TryGetProperty("message", out var message) ? message.GetString() ?? string.Empty : string.Empty);
    }
}
