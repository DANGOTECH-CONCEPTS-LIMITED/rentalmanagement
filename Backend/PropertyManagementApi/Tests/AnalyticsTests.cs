using Application.Interfaces.Analytics;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Analytics;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

public class PaymentStatusHistoryTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=history-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private PaymentStatusHistory _history = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _history = new PaymentStatusHistory(_db, NullLogger<PaymentStatusHistory>.Instance);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    [Fact]
    public async Task RecordsEveryTransitionWithActorAndAmount()
    {
        await _history.RecordAsync(PaymentStatusSubject.BillPayment, 7, "PENDING_SUBMISSION", "PENDING_CONFIRMATION",
            "Submitted to provider", reference: "DANGO_B_7", amount: 6000m);
        await _history.RecordAsync(PaymentStatusSubject.BillPayment, 7, "PENDING_CONFIRMATION", "FAILED",
            "Provider rejected", actor: "admin@test", reference: "DANGO_B_7", amount: 6000m);

        var page = await _history.GetAsync(PaymentStatusSubject.BillPayment, 7, null, 1, 50);

        Assert.Equal(2, page.Total);
        Assert.Equal(["FAILED", "PENDING_CONFIRMATION"], page.Items.Select(x => x.ToStatus));
        Assert.Equal("admin@test", page.Items[0].Actor);
        Assert.Equal("system", page.Items[1].Actor);
        Assert.All(page.Items, x => Assert.Equal("DANGO_B_7", x.Reference));
        Assert.All(page.Items, x => Assert.Equal(6000m, x.Amount));
    }

    [Fact]
    public async Task LookupWorksByReferenceAcrossSubjects()
    {
        await _history.RecordAsync(PaymentStatusSubject.RentInvoice, 1, null, "OPEN", reference: "RENT-2026-11-00001");
        await _history.RecordAsync(PaymentStatusSubject.BillPayment, 2, null, "PENDING_SUBMISSION", reference: "DANGO_B_2");

        var page = await _history.GetAsync(null, null, "RENT-2026-11-00001", 1, 50);

        var item = Assert.Single(page.Items);
        Assert.Equal(PaymentStatusSubject.RentInvoice, item.SubjectType);
    }

    [Fact]
    public async Task FiltersBySubjectTypeAndPages()
    {
        for (var i = 1; i <= 5; i++)
            await _history.RecordAsync(PaymentStatusSubject.BillPayment, i, null, "PENDING_SUBMISSION", reference: $"DANGO_B_{i}");
        await _history.RecordAsync(PaymentStatusSubject.RentInvoice, 99, null, "OPEN", reference: "RENT-1");

        var bills = await _history.GetAsync(PaymentStatusSubject.BillPayment, null, null, 1, 2);

        Assert.Equal(5, bills.Total);
        Assert.Equal(2, bills.Items.Count);
        Assert.All(bills.Items, x => Assert.Equal(PaymentStatusSubject.BillPayment, x.SubjectType));
    }

    [Fact]
    public async Task LongReasonIsTruncatedInsteadOfFailing()
    {
        var longReason = new string('x', 900);

        await _history.RecordAsync(PaymentStatusSubject.BillPayment, 1, null, "FAILED", longReason);

        var stored = await _db.PaymentStatusEvents.AsNoTracking().SingleAsync();
        Assert.Equal(512, stored.Reason!.Length);
    }

    [Fact]
    public async Task BlankTransitionIsIgnored()
    {
        await _history.RecordAsync(PaymentStatusSubject.BillPayment, 1, null, "  ");

        Assert.Empty(await _db.PaymentStatusEvents.AsNoTracking().ToListAsync());
    }
}

public class ArrearsAnalyticsTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=arrears-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private ArrearsAnalyticsService _analytics = null!;
    private static readonly DateTime Today = new(2026, 11, 8);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();

        _db.Users.Add(new User { Id = 10, FullName = "Landlord", Email = "landlord@test", SystemRoleId = 2 });
        await _db.SaveChangesAsync();
        _db.LandLordProperties.Add(new LandLordProperty { Id = 100, Name = "Plot 12", OwnerId = 10, Currency = "UGX", Price = 800000m });
        await _db.SaveChangesAsync();
        _db.Tenants.Add(new PropertyTenant
        {
            Id = 200, FullName = "Jane Tenant", Email = "jane@test", PhoneNumber = "256770000001",
            PropertyId = 100, Active = true, Property = null
        });
        _db.Tenants.Add(new PropertyTenant
        {
            Id = 201, FullName = "John Tenant", Email = "john@test", PhoneNumber = "256770000002",
            PropertyId = 100, Active = true, Property = null
        });
        await _db.SaveChangesAsync();

        _db.RentalContracts.Add(new RentalContract { Id = 300, TenantId = 200, PropertyId = 100, Status = "ACTIVE", StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2027, 12, 31), RentAmount = 500000m });
        _db.RentalContracts.Add(new RentalContract { Id = 301, TenantId = 201, PropertyId = 100, Status = "ACTIVE", StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2027, 12, 31), RentAmount = 900000m });
        await _db.SaveChangesAsync();

        _analytics = new ArrearsAnalyticsService(_db);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private async Task InvoiceAsync(int id, int contractId, int tenantId, string period, DateTime due, decimal amount, decimal paid, string status)
    {
        _db.RentInvoices.Add(new RentInvoice
        {
            Id = id, RentalContractId = contractId, TenantId = tenantId, PropertyId = 100, Period = period,
            InvoiceNumber = $"RENT-{period}-{contractId:D5}", PeriodStart = due.AddDays(-5), PeriodEnd = due.AddMonths(1),
            DueDate = due, Amount = amount, AmountPaid = paid, Status = status
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task AgingPlacesInvoicesInTheRightBuckets()
    {
        await InvoiceAsync(1, 300, 200, "2026-11", new DateTime(2026, 11, 20), 500000m, 0m, RentInvoiceStatus.Open);      // not due yet
        await InvoiceAsync(2, 300, 200, "2026-10", new DateTime(2026, 10, 25), 500000m, 0m, RentInvoiceStatus.Overdue);  // 14 days
        await InvoiceAsync(3, 301, 201, "2026-08", new DateTime(2026, 8, 5), 900000m, 200000m, RentInvoiceStatus.PartiallyPaid); // 95 days
        await InvoiceAsync(4, 301, 201, "2026-09", new DateTime(2026, 9, 5), 900000m, 900000m, RentInvoiceStatus.Paid);   // excluded

        var report = await _analytics.GetAgingAsync(Today);

        Assert.Equal(500000m, report.Buckets.Single(x => x.Label == "Not yet due").Amount);
        Assert.Equal(500000m, report.Buckets.Single(x => x.Label == "1-30 days").Amount);
        Assert.Equal(700000m, report.Buckets.Single(x => x.Label == "90+ days").Amount);
        Assert.Equal(0m, report.Buckets.Single(x => x.Label == "31-60 days").Amount);
        Assert.Equal(1700000m, report.TotalOutstanding);
        Assert.Equal(1200000m, report.OverdueAmount);
    }

    [Fact]
    public async Task CollectionsSeriesCoversEveryRequestedMonth()
    {
        await InvoiceAsync(1, 300, 200, "2026-10", new DateTime(2026, 10, 5), 500000m, 500000m, RentInvoiceStatus.Paid);
        await InvoiceAsync(2, 300, 200, "2026-11", new DateTime(2026, 11, 5), 500000m, 250000m, RentInvoiceStatus.PartiallyPaid);

        var series = await _analytics.GetCollectionsAsync(3, Today);

        Assert.Equal(["2026-09", "2026-10", "2026-11"], series.Select(x => x.Month));
        Assert.Equal(0m, series[0].Billed);

        var october = series[1];
        Assert.Equal(500000m, october.Billed);
        Assert.Equal(500000m, october.Collected);
        Assert.Equal(100m, october.CollectionRate);
        Assert.Equal(1, october.PaidInvoices);

        var november = series[2];
        Assert.Equal(500000m, november.Billed);
        Assert.Equal(250000m, november.Collected);
        Assert.Equal(50m, november.CollectionRate);
    }

    [Fact]
    public async Task CollectionRateIsZeroWhenNothingWasBilled()
    {
        var series = await _analytics.GetCollectionsAsync(1, Today);

        Assert.Equal(0m, Assert.Single(series).CollectionRate);
    }

    [Fact]
    public async Task TopDebtorsRanksByOutstandingAndReportsOldestLatency()
    {
        await InvoiceAsync(1, 300, 200, "2026-09", new DateTime(2026, 9, 5), 500000m, 0m, RentInvoiceStatus.Overdue);
        await InvoiceAsync(2, 300, 200, "2026-10", new DateTime(2026, 10, 5), 500000m, 100000m, RentInvoiceStatus.PartiallyPaid);
        await InvoiceAsync(3, 301, 201, "2026-11", new DateTime(2026, 11, 5), 950000m, 0m, RentInvoiceStatus.Open);

        var debtors = await _analytics.GetTopDebtorsAsync(10, Today);

        Assert.Equal(2, debtors.Total);
        Assert.Equal("John Tenant", debtors.Items[0].TenantName);
        Assert.Equal(950000m, debtors.Items[0].Outstanding);
        Assert.Equal("Jane Tenant", debtors.Items[1].TenantName);
        Assert.Equal(900000m, debtors.Items[1].Outstanding);
        Assert.Equal(2, debtors.Items[1].Invoices);
        Assert.Equal(64, debtors.Items[1].OldestDaysLate);
    }

    [Fact]
    public async Task DebtorLimitIsRespected()
    {
        await InvoiceAsync(1, 300, 200, "2026-10", new DateTime(2026, 10, 5), 500000m, 0m, RentInvoiceStatus.Overdue);
        await InvoiceAsync(2, 301, 201, "2026-10", new DateTime(2026, 10, 5), 900000m, 0m, RentInvoiceStatus.Overdue);

        var debtors = await _analytics.GetTopDebtorsAsync(1, Today);

        Assert.Single(debtors.Items);
        Assert.Equal(2, debtors.Total);
    }
}
