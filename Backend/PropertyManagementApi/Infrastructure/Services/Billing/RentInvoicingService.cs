using Application.Interfaces.Analytics;
using Application.Interfaces.Billing;
using Application.Interfaces.Notifications;
using Domain;
using Domain.Entities.PropertyMgt;
using Domain.Notifications;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Billing;

/// <summary>
/// Converts active rental contracts into monthly invoices and chases unpaid ones. Amounts are
/// always rounded through <see cref="Money"/> so a tenant is never billed a fraction of a shilling.
/// </summary>
public sealed class RentInvoicingService(
    AppDbContext db,
    INotificationDispatcher notifications,
    IPaymentStatusHistory history,
    IConfiguration configuration,
    ILogger<RentInvoicingService> logger) : IRentInvoicingService
{
    // A first run on an old portfolio should not generate years of history.
    private const int MaxBackfillMonths = 24;
    private const int MaxInvoicesPerRun = 2000;
    private static readonly TimeSpan MinHoursBetweenDunningSteps = TimeSpan.FromHours(20);

    private int DueDayOfMonth => Math.Clamp(configuration.GetValue("RentInvoicing:DueDayOfMonth", 5), 1, 28);

    /// <summary>Days past the due date at which each dunning step fires. Default: 1, 7 and 14 days.</summary>
    private int[] DunningThresholds => (configuration["RentInvoicing:DunningDays"] ?? "1;7;14")
        .Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(x => int.TryParse(x, out var days) && days > 0 ? days : 0)
        .Where(x => x > 0)
        .Distinct()
        .Order()
        .ToArray() is { Length: > 0 } values ? values : [1, 7, 14];

    public async Task<int> GenerateDueInvoicesAsync(DateTime today, CancellationToken ct = default)
    {
        var currentPeriod = new DateTime(today.Year, today.Month, 1);
        var earliestPeriod = currentPeriod.AddMonths(-MaxBackfillMonths);

        var contracts = await db.RentalContracts.AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.StartDate <= today && c.EndDate >= earliestPeriod)
            .Include(c => c.Tenant)
            .Include(c => c.Property)
            .ToListAsync(ct);

        if (contracts.Count == 0) return 0;

        var contractIds = contracts.Select(c => c.Id).ToArray();
        var existing = (await db.RentInvoices.AsNoTracking()
                .Where(i => contractIds.Contains(i.RentalContractId))
                .Select(i => new { i.RentalContractId, i.Period })
                .ToListAsync(ct))
            .Select(x => (x.RentalContractId, x.Period))
            .ToHashSet();

        var created = new List<RentInvoice>();
        foreach (var contract in contracts)
        {
            if (contract.RentAmount <= 0) continue;

            var period = FirstBillablePeriod(contract, earliestPeriod);
            while (period <= currentPeriod && created.Count < MaxInvoicesPerRun)
            {
                var key = period.ToString("yyyy-MM");
                var lastBillablePeriod = new DateTime(contract.EndDate.Year, contract.EndDate.Month, 1);
                if (period > lastBillablePeriod) break;

                if (existing.Add((contract.Id, key)))
                {
                    created.Add(BuildInvoice(contract, period, DueDayOfMonth));
                }

                period = period.AddMonths(1);
            }
        }

        if (created.Count > 0)
        {
            db.RentInvoices.AddRange(created);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Generated {Count} rent invoices up to {Period}.", created.Count, currentPeriod.ToString("yyyy-MM"));

            foreach (var invoice in created)
                await history.RecordAsync(PaymentStatusSubject.RentInvoice, invoice.Id, null, RentInvoiceStatus.Open,
                    "Invoice generated from active contract.", reference: invoice.InvoiceNumber, amount: invoice.Amount, ct: ct);
        }

        // Only the running month is announced; backfilled history is not re-notified.
        foreach (var invoice in created.Where(i => i.Period == currentPeriod.ToString("yyyy-MM")))
        {
            await NotifyIssuedAsync(invoice, contracts.First(c => c.Id == invoice.RentalContractId), ct);
        }

        return created.Count;
    }

    public async Task<int> RunDunningAsync(DateTime today, CancellationToken ct = default)
    {
        var thresholds = DunningThresholds;
        var candidates = await db.RentInvoices
            .Where(i => (i.Status == RentInvoiceStatus.Open ||
                         i.Status == RentInvoiceStatus.PartiallyPaid ||
                         i.Status == RentInvoiceStatus.Overdue) &&
                        i.DueDate < today)
            .OrderBy(i => i.DueDate)
            .Take(500)
            .Include(i => i.RentalContract)!.ThenInclude(c => c!.Tenant)
            .Include(i => i.RentalContract)!.ThenInclude(c => c!.Property)
            .ToListAsync(ct);

        var escalated = 0;
        var now = DateTime.UtcNow;

        foreach (var invoice in candidates)
        {
            var daysLate = (today.Date - invoice.DueDate.Date).Days;
            var level = LevelFor(daysLate, thresholds);
            if (level <= invoice.DunningLevel) continue;
            if (invoice.LastDunningAtUtc != null && now - invoice.LastDunningAtUtc.Value < MinHoursBetweenDunningSteps) continue;

            var previousStatus = invoice.Status;
            invoice.Status = RentInvoiceStatus.Overdue;
            invoice.DunningLevel = level;
            invoice.LastDunningAtUtc = now;
            escalated++;
            await history.RecordAsync(PaymentStatusSubject.RentInvoice, invoice.Id, previousStatus, invoice.Status,
                $"Dunning step {level} sent ({daysLate} day(s) late).", reference: invoice.InvoiceNumber,
                amount: Money.Round(invoice.Amount - invoice.AmountPaid), ct: ct);

            var tenant = invoice.RentalContract?.Tenant;
            var propertyName = invoice.RentalContract?.Property?.Name ?? "your property";
            var balance = Money.Round(invoice.Amount - invoice.AmountPaid);
            var tone = level >= thresholds.Length ? "Final notice" : "Rent reminder";
            await notifications.DispatchAsync(new NotificationRequest(
                NotificationEvents.RentOverdue,
                $"{tone}: rent {invoice.Period} for {propertyName}",
                $"<p>Hello {tenant?.FullName ?? "tenant"},</p>" +
                $"<p>Rent of <b>{invoice.Amount:N2}</b> for {propertyName} (invoice {invoice.InvoiceNumber}) was due on " +
                $"{invoice.DueDate:yyyy-MM-dd}. Balance outstanding: <b>{balance:N2}</b> ({daysLate} day(s) late).</p>" +
                "<p>Please settle it to avoid further action.</p>",
                invoice.InvoiceNumber,
                EmailTo: tenant?.Email,
                SmsTo: tenant?.PhoneNumber,
                SmsBody: $"{tone}: rent for {propertyName} ({invoice.Period}) balance {balance:N0} is {daysLate} day(s) late. Invoice {invoice.InvoiceNumber}."), ct);
        }

        if (escalated > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Dunning escalated {Count} rent invoices.", escalated);
        }

        return escalated;
    }

    public async Task<RentInvoicePage> GetInvoicesAsync(string? status, int? tenantId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.RentInvoices.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(i => i.Status == status);
        if (tenantId is > 0)
            query = query.Where(i => i.TenantId == tenantId);

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(i => i.Period)
            .ThenBy(i => i.InvoiceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new
            {
                i.Id,
                i.InvoiceNumber,
                i.Period,
                i.RentalContractId,
                i.TenantId,
                TenantName = i.RentalContract!.Tenant!.FullName,
                TenantEmail = i.RentalContract!.Tenant!.Email,
                TenantPhone = i.RentalContract!.Tenant!.PhoneNumber,
                PropertyName = i.RentalContract!.Property!.Name,
                i.Amount,
                i.AmountPaid,
                i.Status,
                i.DueDate,
                i.DunningLevel,
                i.LastDunningAtUtc
            })
            .ToListAsync(ct);

        var items = rows.Select(x => new RentInvoiceDto(
            x.Id, x.InvoiceNumber, x.Period, x.RentalContractId, x.TenantId, x.TenantName, x.TenantEmail, x.TenantPhone,
            x.PropertyName, x.Amount, x.AmountPaid, Money.Round(x.Amount - x.AmountPaid), x.Status, x.DueDate,
            x.DunningLevel, x.LastDunningAtUtc)).ToList();

        return new RentInvoicePage(items, page, pageSize, total);
    }

    public async Task<RentPaymentResult> ApplyPaymentAsync(int invoiceId, decimal amount, string? actor, CancellationToken ct = default)
    {
        var applied = Money.Round(amount);
        if (applied <= 0)
            throw new ArgumentException("Payment amount must be greater than zero.");

        var invoice = await db.RentInvoices.FirstOrDefaultAsync(x => x.Id == invoiceId, ct)
            ?? throw new KeyNotFoundException("Rent invoice not found.");

        if (invoice.Status == RentInvoiceStatus.Cancelled)
            throw new InvalidOperationException("A cancelled invoice cannot receive payments.");

        var balance = Money.Round(invoice.Amount - invoice.AmountPaid);
        if (balance <= 0)
            throw new InvalidOperationException("This invoice is already fully paid.");
        if (applied > balance)
            throw new ArgumentException($"Payment exceeds the outstanding balance of {balance:N2}.");

        invoice.AmountPaid = Money.Round(invoice.AmountPaid + applied);
        var previousStatus = invoice.Status;
        invoice.Status = invoice.AmountPaid >= invoice.Amount ? RentInvoiceStatus.Paid : RentInvoiceStatus.PartiallyPaid;
        if (invoice.Status == RentInvoiceStatus.Paid)
        {
            invoice.PaidAtUtc = DateTime.UtcNow;
            invoice.DunningLevel = 0;
        }

        await db.SaveChangesAsync(ct);
        await history.RecordAsync(PaymentStatusSubject.RentInvoice, invoice.Id, previousStatus, invoice.Status,
            $"Payment of {applied:N2} recorded.", actor: actor, reference: invoice.InvoiceNumber, amount: applied, ct: ct);
        logger.LogInformation("Rent invoice {Invoice} received {Amount} from {Actor}; balance {Balance}.",
            invoice.InvoiceNumber, applied, actor ?? "system", Money.Round(invoice.Amount - invoice.AmountPaid));

        return new RentPaymentResult(invoice.Id, applied, invoice.Status, Money.Round(invoice.Amount - invoice.AmountPaid));
    }

    public async Task<RentInvoiceSummary> GetSummaryAsync(CancellationToken ct = default)
    {
        // SQLite (used by the test suite) cannot SUM a decimal column, so the two money columns are
        // read and totalled in memory. Invoices are per tenant per month, so this stays small.
        var rows = await db.RentInvoices.AsNoTracking()
            .Where(i => i.Status != RentInvoiceStatus.Cancelled)
            .Select(i => new { i.Amount, i.AmountPaid, i.Status })
            .ToListAsync(ct);

        var billed = rows.Sum(x => x.Amount);
        var paid = rows.Sum(x => x.AmountPaid);
        var overdue = rows.Where(x => x.Status == RentInvoiceStatus.Overdue)
            .Sum(x => x.Amount - x.AmountPaid);

        return new RentInvoiceSummary(
            Money.Round(billed),
            Money.Round(paid),
            Money.Round(billed - paid),
            Money.Round(overdue),
            rows.Count(x => x.Status == RentInvoiceStatus.Open),
            rows.Count(x => x.Status == RentInvoiceStatus.PartiallyPaid),
            rows.Count(x => x.Status == RentInvoiceStatus.Paid),
            rows.Count(x => x.Status == RentInvoiceStatus.Overdue));
    }

    private static DateTime FirstBillablePeriod(RentalContract contract, DateTime earliestPeriod)
    {
        var contractMonth = new DateTime(contract.StartDate.Year, contract.StartDate.Month, 1);
        return contractMonth < earliestPeriod ? earliestPeriod : contractMonth;
    }

    private RentInvoice BuildInvoice(RentalContract contract, DateTime period, int dueDay)
    {
        var periodEnd = period.AddMonths(1).AddDays(-1);
        var dueDate = new DateTime(period.Year, period.Month, Math.Min(dueDay, DateTime.DaysInMonth(period.Year, period.Month)));
        var key = period.ToString("yyyy-MM");

        return new RentInvoice
        {
            RentalContractId = contract.Id,
            TenantId = contract.TenantId,
            PropertyId = contract.PropertyId,
            Period = key,
            InvoiceNumber = $"RENT-{key}-{contract.Id:D5}",
            PeriodStart = period,
            PeriodEnd = periodEnd,
            DueDate = dueDate,
            Amount = Money.Round(contract.RentAmount),
            AmountPaid = 0m,
            Status = RentInvoiceStatus.Open,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private async Task NotifyIssuedAsync(RentInvoice invoice, RentalContract contract, CancellationToken ct)
    {
        var tenant = contract.Tenant;
        var propertyName = contract.Property?.Name ?? "your property";
        await notifications.DispatchAsync(new NotificationRequest(
            NotificationEvents.RentInvoiceIssued,
            $"Rent invoice {invoice.InvoiceNumber} for {propertyName}",
            $"<p>Hello {tenant?.FullName ?? "tenant"},</p>" +
            $"<p>Invoice <b>{invoice.InvoiceNumber}</b> for {propertyName} is now available.</p>" +
            $"<p>Amount: <b>{invoice.Amount:N2}</b><br/>Due date: {invoice.DueDate:yyyy-MM-dd}</p>",
            invoice.InvoiceNumber,
            EmailTo: tenant?.Email,
            SmsTo: tenant?.PhoneNumber,
            SmsBody: $"Rent invoice {invoice.InvoiceNumber}: {invoice.Amount:N0} due {invoice.DueDate:yyyy-MM-dd} for {propertyName}."), ct);
    }

    /// <summary>Maps days late onto the configured dunning step (0 = not due yet).</summary>
    public static int LevelFor(int daysLate, int[] thresholds)
    {
        var level = 0;
        for (var i = 0; i < thresholds.Length; i++)
        {
            if (daysLate >= thresholds[i]) level = i + 1;
        }
        return level;
    }
}
