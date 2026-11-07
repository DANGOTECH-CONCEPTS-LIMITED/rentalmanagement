using Application.Interfaces.Analytics;
using Domain;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Analytics;

/// <summary>
/// Arrears and collection metrics derived from rent invoices. Money is aggregated in memory because
/// SQLite (used by the test suite) cannot sum a decimal column; invoice volume stays small.
/// </summary>
public sealed class ArrearsAnalyticsService(AppDbContext db) : IArrearsAnalyticsService
{
    private static readonly (string Label, int? From, int? To)[] BucketDefinitions =
    [
        ("Not yet due", null, 0),
        ("1-30 days", 1, 30),
        ("31-60 days", 31, 60),
        ("61-90 days", 61, 90),
        ("90+ days", 91, null)
    ];

    public async Task<ArrearsAgingReport> GetAgingAsync(DateTime today, CancellationToken ct = default)
    {
        var open = await db.RentInvoices.AsNoTracking()
            .Where(i => i.Status != RentInvoiceStatus.Paid && i.Status != RentInvoiceStatus.Cancelled)
            .Select(i => new { i.DueDate, i.Amount, i.AmountPaid })
            .ToListAsync(ct);

        var buckets = BucketDefinitions
            .Select(definition =>
            {
                var rows = open
                    .Select(x => new { x.Amount, x.AmountPaid, DaysLate = (today.Date - x.DueDate.Date).Days })
                    .Where(x => Matches(x.DaysLate, definition.From, definition.To))
                    .ToList();

                return new ArrearsBucket(
                    definition.Label,
                    definition.From,
                    definition.To,
                    rows.Count,
                    Money.Round(rows.Sum(x => x.Amount - x.AmountPaid)));
            })
            .ToList();

        var totalOutstanding = Money.Round(open.Sum(x => x.Amount - x.AmountPaid));
        var overdue = Money.Round(buckets.Where(b => b.FromDaysLate is > 0).Sum(b => b.Amount));

        return new ArrearsAgingReport(DateTime.UtcNow, totalOutstanding, overdue, buckets);
    }

    public async Task<IReadOnlyList<CollectionsMonth>> GetCollectionsAsync(int months, DateTime today, CancellationToken ct = default)
    {
        months = Math.Clamp(months, 1, 36);
        var firstMonth = new DateTime(today.Year, today.Month, 1).AddMonths(-(months - 1));

        var rows = await db.RentInvoices.AsNoTracking()
            .Where(i => i.Status != RentInvoiceStatus.Cancelled)
            .Select(i => new { i.Period, i.Amount, i.AmountPaid, i.Status })
            .ToListAsync(ct);

        var series = new List<CollectionsMonth>(months);
        for (var i = 0; i < months; i++)
        {
            var month = firstMonth.AddMonths(i);
            var key = month.ToString("yyyy-MM");
            var monthRows = rows.Where(x => x.Period == key).ToList();
            series.Add(new CollectionsMonth(
                key,
                Money.Round(monthRows.Sum(x => x.Amount)),
                Money.Round(monthRows.Sum(x => x.AmountPaid)),
                monthRows.Count,
                monthRows.Count(x => x.Status == RentInvoiceStatus.Paid)));
        }

        return series;
    }

    public async Task<ArrearsDebtorList> GetTopDebtorsAsync(int limit, DateTime today, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);

        var open = await db.RentInvoices.AsNoTracking()
            .Where(i => i.Status != RentInvoiceStatus.Paid && i.Status != RentInvoiceStatus.Cancelled)
            .Select(i => new
            {
                i.TenantId,
                i.DueDate,
                i.Amount,
                i.AmountPaid,
                TenantName = i.RentalContract!.Tenant!.FullName,
                PhoneNumber = i.RentalContract!.Tenant!.PhoneNumber
            })
            .ToListAsync(ct);

        var debtors = open
            .GroupBy(x => x.TenantId)
            .Select(group => new DebtorRow(
                group.Key,
                group.First().TenantName ?? "Unknown tenant",
                group.First().PhoneNumber,
                group.Count(),
                Money.Round(group.Sum(x => x.Amount - x.AmountPaid)),
                group.Max(x => Math.Max(0, (today.Date - x.DueDate.Date).Days))))
            .Where(x => x.Outstanding > 0m)
            .OrderByDescending(x => x.Outstanding)
            .ToList();

        return new ArrearsDebtorList(debtors.Take(limit).ToList(), debtors.Count);
    }

    private static bool Matches(int daysLate, int? from, int? to)
    {
        if (from.HasValue && daysLate < from.Value) return false;
        if (to.HasValue && daysLate > to.Value) return false;
        return true;
    }
}
