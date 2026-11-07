using Application.Interfaces.Notifications;
using Application.Interfaces.Analytics;
using Domain.Entities.Notifications;
using Domain.Entities.PropertyMgt;
using Domain.Notifications;
using Infrastructure.Data;
using Infrastructure.Services.Billing;
using Infrastructure.Services.Analytics;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

public class RentInvoicingTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=rent-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private CaptureDispatcher _notifications = null!;
    private RentInvoicingService _service = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();

        // SystemRoles are seeded by the model (Id 2 = Landlord), so the FK is already satisfied.
        _db.Users.Add(new User { Id = 10, FullName = "Landlord", Email = "landlord@test", SystemRoleId = 2 });
        await _db.SaveChangesAsync();

        _db.LandLordProperties.Add(new LandLordProperty { Id = 100, Name = "Plot 12", OwnerId = 10, Price = 800000m, Currency = "UGX" });
        await _db.SaveChangesAsync();

        _db.Tenants.Add(new PropertyTenant
        {
            Id = 200, FullName = "Jane Tenant", Email = "jane@test", PhoneNumber = "256770000001",
            PropertyId = 100, Active = true,
            // The entity defaults Property to a new instance; null keeps EF from inserting a
            // second property (which would fail the owner foreign key).
            Property = null
        });
        await _db.SaveChangesAsync();

        _notifications = new CaptureDispatcher();
        _service = BuildService();
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private RentInvoicingService BuildService(string? dunningDays = null)
    {
        var settings = new Dictionary<string, string?>
        {
            ["RentInvoicing:DueDayOfMonth"] = "5"
        };
        if (dunningDays != null) settings["RentInvoicing:DunningDays"] = dunningDays;
        return new RentInvoicingService(
            _db, _notifications, new PaymentStatusHistory(_db, NullLogger<PaymentStatusHistory>.Instance),
            new ConfigurationBuilder().AddInMemoryCollection(settings).Build(),
            NullLogger<RentInvoicingService>.Instance);
    }

    private async Task<int> ContractAsync(DateTime start, DateTime end, decimal rent = 800000m, string status = "ACTIVE", int id = 300)
    {
        _db.RentalContracts.Add(new RentalContract
        {
            Id = id, TenantId = 200, PropertyId = 100, StartDate = start, EndDate = end,
            RentAmount = rent, Status = status, Deposit = 800000m
        });
        await _db.SaveChangesAsync();
        return id;
    }

    private Task<List<RentInvoice>> InvoicesAsync() =>
        _db.RentInvoices.AsNoTracking().OrderBy(x => x.Period).ToListAsync();

    [Fact]
    public async Task GeneratesOneInvoicePerMonthAndIsIdempotent()
    {
        await ContractAsync(new DateTime(2026, 9, 1), new DateTime(2027, 8, 31));

        var first = await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));
        var second = await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));

        Assert.Equal(3, first);
        Assert.Equal(0, second);

        var invoices = await InvoicesAsync();
        Assert.Equal(["2026-09", "2026-10", "2026-11"], invoices.Select(x => x.Period));
        Assert.All(invoices, i => Assert.Equal(800000m, i.Amount));
        Assert.All(invoices, i => Assert.Equal(RentInvoiceStatus.Open, i.Status));
        Assert.Equal("RENT-2026-11-00300", invoices[^1].InvoiceNumber);
        Assert.Equal(new DateTime(2026, 11, 5), invoices[^1].DueDate);
    }

    [Fact]
    public async Task ContractThatHasNotStartedOrIsNotActiveIsNotInvoiced()
    {
        await ContractAsync(new DateTime(2026, 12, 1), new DateTime(2027, 11, 30), id: 301);
        await ContractAsync(new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), status: "TERMINATED", id: 302);

        var created = await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));

        Assert.Equal(0, created);
        Assert.Empty(await InvoicesAsync());
    }

    [Fact]
    public async Task InvoiceIsNotGeneratedForTheMonthAfterTheContractEnds()
    {
        await ContractAsync(new DateTime(2026, 10, 1), new DateTime(2026, 10, 20));

        var created = await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));

        Assert.Equal(1, created);
        Assert.Equal("2026-10", Assert.Single(await InvoicesAsync()).Period);
    }

    [Fact]
    public async Task BackfillIsCappedSoAnOldPortfolioDoesNotExplode()
    {
        // A contract that started years ago: only the last 24 months should be created.
        await ContractAsync(new DateTime(2020, 1, 1), new DateTime(2030, 12, 31));

        var created = await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));

        Assert.Equal(25, created); // 24 months back plus the current month
        var invoices = await InvoicesAsync();
        Assert.Equal("2024-11", invoices[0].Period);
        Assert.Equal("2026-11", invoices[^1].Period);
    }

    [Fact]
    public async Task NewInvoiceAnnouncesItselfToTheTenantThroughTheMatrix()
    {
        await ContractAsync(new DateTime(2026, 11, 1), new DateTime(2027, 10, 31));

        await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));

        var request = Assert.Single(_notifications.Requests);
        Assert.Equal(NotificationEvents.RentInvoiceIssued, request.EventType);
        Assert.Equal("jane@test", request.EmailTo);
        Assert.Equal("256770000001", request.SmsTo);
        Assert.Contains("RENT-2026-11-00300", request.Subject);
    }

    [Fact]
    public async Task PaymentReducesTheBalanceAndMarksPartialThenPaid()
    {
        await ContractAsync(new DateTime(2026, 11, 1), new DateTime(2027, 10, 31));
        await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));
        var invoice = Assert.Single(await InvoicesAsync());

        var partial = await _service.ApplyPaymentAsync(invoice.Id, 300000m, "admin");
        Assert.Equal(RentInvoiceStatus.PartiallyPaid, partial.Status);
        Assert.Equal(500000m, partial.Balance);

        var rest = await _service.ApplyPaymentAsync(invoice.Id, 500000m, "admin");
        Assert.Equal(RentInvoiceStatus.Paid, rest.Status);
        Assert.Equal(0m, rest.Balance);

        var stored = Assert.Single(await InvoicesAsync());
        Assert.NotNull(stored.PaidAtUtc);
    }

    [Fact]
    public async Task PaymentCannotExceedTheBalanceOrRepeatWhenSettled()
    {
        await ContractAsync(new DateTime(2026, 11, 1), new DateTime(2027, 10, 31));
        await _service.GenerateDueInvoicesAsync(new DateTime(2026, 11, 8));
        var invoice = Assert.Single(await InvoicesAsync());

        await Assert.ThrowsAsync<ArgumentException>(() => _service.ApplyPaymentAsync(invoice.Id, 900000m, "admin"));
        await Assert.ThrowsAsync<ArgumentException>(() => _service.ApplyPaymentAsync(invoice.Id, 0m, "admin"));

        await _service.ApplyPaymentAsync(invoice.Id, 800000m, "admin");
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.ApplyPaymentAsync(invoice.Id, 1000m, "admin"));
    }

    [Fact]
    public async Task DunningEscalatesOneStepAtATimeAndNeverRepeats()
    {
        await ContractAsync(new DateTime(2026, 9, 1), new DateTime(2027, 8, 31));
        await _service.GenerateDueInvoicesAsync(new DateTime(2026, 10, 1));
        _notifications.Requests.Clear();

        // September invoice: due 2026-09-05, so 2026-09-20 is 15 days late -> step 3.
        Assert.Equal(0, await _service.RunDunningAsync(new DateTime(2026, 9, 4)));
        Assert.Empty(_notifications.Requests);

        // Escalate September to step 3 first (three steps across separate runs).
        var step = BuildService();
        var invoice = (await InvoicesAsync()).First(x => x.Period == "2026-09");

        // A single run jumps straight to the level the delay warrants.
        Assert.Equal(1, await step.RunDunningAsync(new DateTime(2026, 9, 20)));
        var afterFirst = (await InvoicesAsync()).First(x => x.Id == invoice.Id);
        Assert.Equal(3, afterFirst.DunningLevel);
        Assert.Equal(RentInvoiceStatus.Overdue, afterFirst.Status);

        // Re-running immediately must not notify again.
        Assert.Equal(0, await step.RunDunningAsync(new DateTime(2026, 9, 20)));
        Assert.Single(_notifications.Requests);
    }

    [Fact]
    public async Task DunningStepsFollowTheConfiguredSchedule()
    {
        Assert.Equal(0, RentInvoicingService.LevelFor(0, [1, 7, 14]));
        Assert.Equal(1, RentInvoicingService.LevelFor(1, [1, 7, 14]));
        Assert.Equal(1, RentInvoicingService.LevelFor(6, [1, 7, 14]));
        Assert.Equal(2, RentInvoicingService.LevelFor(7, [1, 7, 14]));
        Assert.Equal(3, RentInvoicingService.LevelFor(30, [1, 7, 14]));
    }

    [Fact]
    public async Task PaidInvoicesAreNotDunned()
    {
        await ContractAsync(new DateTime(2026, 9, 1), new DateTime(2027, 8, 31));
        await _service.GenerateDueInvoicesAsync(new DateTime(2026, 9, 1));
        var invoice = Assert.Single(await InvoicesAsync());
        await _service.ApplyPaymentAsync(invoice.Id, 800000m, "admin");

        var escalated = await _service.RunDunningAsync(new DateTime(2026, 10, 1));

        Assert.Equal(0, escalated);
    }

    [Fact]
    public async Task SummaryReflectsBilledPaidAndOverdueAmounts()
    {
        await ContractAsync(new DateTime(2026, 9, 1), new DateTime(2027, 8, 31));
        await _service.GenerateDueInvoicesAsync(new DateTime(2026, 10, 1));
        var september = (await InvoicesAsync()).First(x => x.Period == "2026-09");
        await _service.ApplyPaymentAsync(september.Id, 300000m, "admin");
        await _service.RunDunningAsync(new DateTime(2026, 10, 1));

        var summary = await _service.GetSummaryAsync();

        Assert.Equal(1600000m, summary.TotalBilled);
        Assert.Equal(300000m, summary.TotalPaid);
        Assert.Equal(1300000m, summary.Outstanding);
        Assert.Equal(1, summary.PartiallyPaidCount + summary.OverdueCount);
        Assert.True(summary.Overdue > 0m);
    }

    public sealed class CaptureDispatcher : INotificationDispatcher
    {
        public List<NotificationRequest> Requests { get; } = [];
        public Task DispatchAsync(NotificationRequest request, CancellationToken ct = default)
        {
            Requests.Add(request);
            return Task.CompletedTask;
        }
    }
}
