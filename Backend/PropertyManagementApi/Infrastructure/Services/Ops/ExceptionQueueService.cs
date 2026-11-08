using Application.Interfaces.Ops;
using Domain.Dtos.Ops;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Ops;

/// <summary>
/// Builds an operations queue of records that automated flows could not resolve on their own.
/// Everything here is read-only: acting on an item still goes through the guarded endpoints.
/// </summary>
public sealed class ExceptionQueueService(AppDbContext db) : IExceptionQueueService
{
    // Enough rows per category to be useful without scanning unbounded history.
    private const int MaxRowsPerCategory = 200;
    private static readonly TimeSpan Lookback = TimeSpan.FromDays(30);
    private static readonly TimeSpan ConfirmationGrace = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan SubmissionGrace = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan CreditingGrace = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan PayoutGrace = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan UnbilledWindow = TimeSpan.FromDays(7);

    public async Task<ExceptionQueueResult> GetAsync(string? category, int page, int pageSize, CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var nowLocal = DateTime.Now;
        var selected = NormalizeCategory(category);
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        var items = new List<ExceptionItem>();

        foreach (var key in ExceptionCategories.All)
        {
            var count = await CountAsync(key, nowUtc, nowLocal, ct);
            counts[key] = count;

            if (count == 0 || (selected != null && !string.Equals(selected, key, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            items.AddRange(await LoadAsync(key, nowUtc, nowLocal, ct));
        }

        var ordered = items
            .OrderBy(x => x.OccurredAtUtc)
            .ThenBy(x => x.Category, StringComparer.Ordinal)
            .ThenBy(x => x.Id)
            .ToList();

        var total = counts.Values.Sum();
        var paged = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new ExceptionQueueResult(nowUtc, counts, paged, total);
    }

    private static string? NormalizeCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category) || string.Equals(category.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var value = category.Trim();
        return ExceptionCategories.All.FirstOrDefault(x => string.Equals(x, value, StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException($"Unknown exception category '{category}'.");
    }

    private Task<int> CountAsync(string category, DateTime nowUtc, DateTime nowLocal, CancellationToken ct) => category switch
    {
        ExceptionCategories.BillPaymentFailed => FailedBills(nowUtc).CountAsync(ct),
        ExceptionCategories.BillPaymentUnconfirmed => UnconfirmedBills(nowUtc).CountAsync(ct),
        ExceptionCategories.BillPaymentUndebited => UndebitedBills(nowUtc).CountAsync(ct),
        ExceptionCategories.BillPaymentStuckSubmission => StuckSubmissions(nowUtc).CountAsync(ct),
        ExceptionCategories.CollectionNotCredited => UncreditedCollections(nowLocal).CountAsync(ct),
        ExceptionCategories.CollectionUnbilled => UnbilledCollections(nowLocal).CountAsync(ct),
        ExceptionCategories.PayoutStuck => StuckPayouts(nowLocal).CountAsync(ct),
        _ => Task.FromResult(0)
    };

    private async Task<List<ExceptionItem>> LoadAsync(string category, DateTime nowUtc, DateTime nowLocal, CancellationToken ct)
    {
        switch (category)
        {
            case ExceptionCategories.BillPaymentFailed:
            {
                var rows = await FailedBills(nowUtc).OrderBy(x => x.SubmittedAtUtc).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => BillItem(category, x, nowUtc,
                    "Provider rejected this bill. Retry it from the wallet statement (new reference) or reconcile with Dango.")).ToList();
            }
            case ExceptionCategories.BillPaymentUnconfirmed:
            {
                var rows = await UnconfirmedBills(nowUtc).OrderBy(x => x.SubmittedAtUtc).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => BillItem(category, x, nowUtc,
                    "No definitive provider answer yet. Polling continues; verify the reference with Dango if it stays here.")).ToList();
            }
            case ExceptionCategories.BillPaymentUndebited:
            {
                var rows = await UndebitedBills(nowUtc).OrderBy(x => x.ConfirmedAtUtc).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => BillItem(category, x, nowUtc,
                    "The bill was paid but the utility wallet was not debited. Debit or reconcile manually.")).ToList();
            }
            case ExceptionCategories.BillPaymentStuckSubmission:
            {
                var rows = await StuckSubmissions(nowUtc).OrderBy(x => x.SubmittedAtUtc).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => BillItem(category, x, nowUtc,
                    "Submission was claimed but never confirmed. Check the HTTP log, then resubmit only if nothing reached Dango.")).ToList();
            }
            case ExceptionCategories.CollectionNotCredited:
            {
                var rows = await UncreditedCollections(nowLocal).OrderBy(x => x.CreatedAt).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => CollectionItem(category, x, nowUtc,
                    "Collection settled at the provider but the owner's wallet was not credited. Investigate before re-crediting.")).ToList();
            }
            case ExceptionCategories.CollectionUnbilled:
            {
                var rows = await UnbilledCollections(nowLocal).OrderBy(x => x.CreatedAt).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => CollectionItem(category, x, nowUtc,
                    "Credited collection with no bill payment. Use Trigger bill if the NWSC bill still needs settling.")).ToList();
            }
            case ExceptionCategories.PayoutStuck:
            {
                var rows = await StuckPayouts(nowLocal).OrderBy(x => x.CreatedAt).Take(MaxRowsPerCategory).ToListAsync(ct);
                return rows.Select(x => new ExceptionItem(
                    category, x.Id, x.TransactionId ?? $"TXN-{x.Id}", null, null,
                    Math.Abs(x.Amount), x.Status ?? "-", x.ReasonAtTelecom,
                    LocalToUtc(x.CreatedAt), Age(LocalToUtc(x.CreatedAt), nowUtc),
                    "The payout was debited but never submitted. Fix the landlord's phone/SWIFT/bank profile, then let the worker retry; it auto-reverses after Payout:MaxRetryHours.")).ToList();
            }
            default:
                return new List<ExceptionItem>();
        }
    }

    private IQueryable<BillPaymentInstruction> FailedBills(DateTime nowUtc)
    {
        var since = nowUtc - Lookback;
        return db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.Failed &&
                        x.SubmittedAtUtc != null && x.SubmittedAtUtc >= since &&
                        x.WalletDebitedAtUtc == null);
    }

    private IQueryable<BillPaymentInstruction> UnconfirmedBills(DateTime nowUtc)
    {
        var cutoff = nowUtc - ConfirmationGrace;
        var since = nowUtc - Lookback;
        return db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => (x.Status == BillPaymentInstructionStatus.PendingConfirmation ||
                         x.Status == BillPaymentInstructionStatus.ReconciliationRequired) &&
                        x.SubmittedAtUtc != null && x.SubmittedAtUtc >= since && x.SubmittedAtUtc < cutoff);
    }

    private IQueryable<BillPaymentInstruction> UndebitedBills(DateTime nowUtc)
    {
        var since = nowUtc - Lookback;
        return db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.PaidUndebited &&
                        x.ConfirmedAtUtc != null && x.ConfirmedAtUtc >= since);
    }

    private IQueryable<BillPaymentInstruction> StuckSubmissions(DateTime nowUtc)
    {
        var cutoff = nowUtc - SubmissionGrace;
        var since = nowUtc - Lookback;
        return db.Set<BillPaymentInstruction>().AsNoTracking()
            .Where(x => x.Status == BillPaymentInstructionStatus.PendingSubmission &&
                        x.SubmittedAtUtc != null && x.SubmittedAtUtc >= since && x.SubmittedAtUtc < cutoff);
    }

    private IQueryable<UtilityPayment> UncreditedCollections(DateTime nowLocal)
    {
        var cutoff = nowLocal - CreditingGrace;
        var since = nowLocal - Lookback;
        return db.UtilityPayments.AsNoTracking()
            .Where(x => x.Status == "SUCCESSFUL AT TELECOM" && x.WalletCreditedAtUtc == null &&
                        x.CreatedAt >= since && x.CreatedAt < cutoff);
    }

    private IQueryable<UtilityPayment> UnbilledCollections(DateTime nowLocal)
    {
        var since = nowLocal - UnbilledWindow;
        return db.UtilityPayments.AsNoTracking()
            .Where(x => x.Status == "SUCCESSFUL" && x.Amount > 0 && x.CreatedAt >= since &&
                        x.MeterNumber != null &&
                        db.UtilityMeters.Any(m => m.MeterNumber == x.MeterNumber &&
                                                  m.NWSCAccount != null && m.NWSCAccount != "" &&
                                                  m.NWSCAccount.ToLower() != "n/a") &&
                        !db.Set<BillPaymentInstruction>().Any(i => i.UtilityPaymentId == x.Id));
    }

    /// <summary>
    /// Wallet debits that are still a pending payout well past the submission window. These are the
    /// rows where the provider was never called (an incomplete landlord profile, a provider setting),
    /// which is why they showed up in neither the HTTP log nor the provider dashboard.
    /// </summary>
    private IQueryable<WalletTransaction> StuckPayouts(DateTime nowLocal)
    {
        var cutoff = nowLocal - PayoutGrace;
        var since = nowLocal - Lookback;
        var pendingStatuses = new[]
        {
            "PENDING_BANK_PAYOUT", "PENDING_WALLET_PAYOUT",
            "PENDING AT TELCOM", "PENDING AT TELECOM", "PENDING AT THE BANK"
        };
        return db.WalletTransactions.AsNoTracking()
            .Where(x => x.Amount < 0 && pendingStatuses.Contains(x.Status) &&
                        x.CreatedAt >= since && x.CreatedAt < cutoff);
    }

    private static ExceptionItem BillItem(string category, BillPaymentInstruction x, DateTime nowUtc, string hint)
    {
        var occurred = AsUtc(x.SubmittedAtUtc ?? x.ConfirmedAtUtc ?? x.CreatedAtUtc);
        return new ExceptionItem(category, x.Id, x.RequestReference, x.MeterNumber, x.NwscAccount, x.Amount,
            x.Status, x.Reason, occurred, Age(occurred, nowUtc), hint);
    }

    private static ExceptionItem CollectionItem(string category, UtilityPayment x, DateTime nowUtc, string hint)
    {
        var occurred = LocalToUtc(x.CreatedAt);
        return new ExceptionItem(category, x.Id, x.TransactionID ?? $"UTIL-{x.Id}", x.MeterNumber, x.UtilityAccountNumber,
            (decimal)x.Amount, x.Status ?? "-", x.ReasonAtTelecom, occurred, Age(occurred, nowUtc), hint);
    }

    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

    // Collection timestamps are written with DateTime.Now, so they must be converted, not relabelled.
    private static DateTime LocalToUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime();

    private static int Age(DateTime occurredUtc, DateTime nowUtc) => Math.Max(0, (int)(nowUtc - occurredUtc).TotalMinutes);
}
