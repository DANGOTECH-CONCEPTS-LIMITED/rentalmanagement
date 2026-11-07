using Application.Interfaces.Analytics;
using Application.Interfaces.Notifications;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Analytics;
using Infrastructure.Services.Billing;
using Infrastructure.Services.Deposits;
using Infrastructure.Services.Notifications;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

public class DepositMoveOutTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=deposits-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private DepositService _deposits = null!;
    private const int ContractId = 300;
    private const int TenantId = 200;

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
            Id = TenantId, FullName = "Jane Tenant", Email = "jane@test", PhoneNumber = "256770000001",
            PropertyId = 100, Active = true, Property = null
        });
        await _db.SaveChangesAsync();
        _db.RentalContracts.Add(new RentalContract
        {
            Id = ContractId, TenantId = TenantId, PropertyId = 100, Status = "ACTIVE",
            StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 11, 30),
            RentAmount = 500000m, Deposit = 1000000m
        });
        await _db.SaveChangesAsync();

        var history = new PaymentStatusHistory(_db, NullLogger<PaymentStatusHistory>.Instance);
        var invoicing = new RentInvoicingService(_db, new NoopDispatcher(), history,
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build(),
            NullLogger<RentInvoicingService>.Instance);
        _deposits = new DepositService(_db, invoicing, history, NullLogger<DepositService>.Instance);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private async Task InvoiceAsync(int id, string period, DateTime due, decimal amount, decimal paid = 0m, string? status = null)
    {
        _db.RentInvoices.Add(new RentInvoice
        {
            Id = id, RentalContractId = ContractId, TenantId = TenantId, PropertyId = 100, Period = period,
            InvoiceNumber = $"RENT-{period}-00300", PeriodStart = due.AddDays(-5), PeriodEnd = due.AddMonths(1),
            DueDate = due, Amount = amount, AmountPaid = paid,
            Status = status ?? (paid >= amount ? RentInvoiceStatus.Paid : paid > 0 ? RentInvoiceStatus.PartiallyPaid : RentInvoiceStatus.Open)
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task StatementIsCreatedFromTheContractDeposit()
    {
        var statement = await _deposits.GetStatementAsync(ContractId);

        Assert.Equal(1000000m, statement.AmountHeld);
        Assert.Equal(SecurityDepositStatus.Held, statement.Status);
        Assert.Equal(0m, statement.OutstandingArrears);
        Assert.Equal(1000000m, statement.Refundable);
        Assert.Equal(0m, statement.Shortfall);
        Assert.Equal(new DateTime(2026, 11, 30), statement.ContractEndDate);
    }

    [Fact]
    public async Task StatementIsIdempotentForTheSameContract()
    {
        await _deposits.GetStatementAsync(ContractId);
        await _deposits.GetStatementAsync(ContractId);

        Assert.Single(await _db.SecurityDeposits.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task DeductionsReduceTheRefundAndAreListed()
    {
        await _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Damage, 150000m, "Broken window", "admin");
        await _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Cleaning, 50000m, "Deep clean", "admin");

        var statement = await _deposits.GetStatementAsync(ContractId);

        Assert.Equal(2, statement.Deductions.Count);
        Assert.Equal(200000m, statement.TotalDeductions);
        Assert.Equal(800000m, statement.Refundable);
    }

    [Fact]
    public async Task DeductionsCannotBeAddedTwiceOrWithBadInput()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Other, 0m, null, "admin"));
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _deposits.AddDeductionAsync(ContractId, "NOT_A_CATEGORY", 1000m, null, "admin"));
    }

    [Fact]
    public async Task DeductionCanBeRemovedWhileHeldOnly()
    {
        var deduction = await _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Utility, 40000m, "Meter arrears", "admin");
        await _deposits.RemoveDeductionAsync(deduction.Id, "admin");

        Assert.Empty(await _db.DepositDeductions.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task ArrearsAreDeductedBeforeDeductionsAtSettlement()
    {
        await InvoiceAsync(1, "2026-10", new DateTime(2026, 10, 5), 500000m);
        await _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Damage, 200000m, "Broken door", "admin");

        var result = await _deposits.SettleAsync(ContractId, "admin", "Moved out on 2026-11-30");

        Assert.Equal(500000m, result.AppliedToArrears);
        Assert.Equal(200000m, result.AppliedToDeductions);
        Assert.Equal(300000m, result.Refund);
        Assert.Equal(0m, result.Shortfall);
        Assert.Equal(SecurityDepositStatus.Settled, result.Status);
        Assert.Equal(1, result.InvoicesSettled);

        var invoice = await _db.RentInvoices.AsNoTracking().SingleAsync();
        Assert.Equal(RentInvoiceStatus.Paid, invoice.Status);
        Assert.Equal(500000m, invoice.AmountPaid);
    }

    [Fact]
    public async Task SettlementTerminatesTheContractAndDeactivatesTheTenant()
    {
        await _deposits.SettleAsync(ContractId, "admin", null);

        var contract = await _db.RentalContracts.AsNoTracking().SingleAsync();
        Assert.Equal("TERMINATED", contract.Status);
        Assert.NotNull(contract.TerminatedAt);

        var tenant = await _db.Tenants.AsNoTracking().SingleAsync();
        Assert.False(tenant.Active);
    }

    [Fact]
    public async Task ShortfallIsReportedWhenTheDepositCannotCoverEverything()
    {
        await InvoiceAsync(1, "2026-09", new DateTime(2026, 9, 5), 800000m);
        await InvoiceAsync(2, "2026-10", new DateTime(2026, 10, 5), 800000m);
        await _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Damage, 100000m, "Broken tiles", "admin");

        var result = await _deposits.SettleAsync(ContractId, "admin", null);

        Assert.Equal(1000000m, result.AppliedToArrears);
        Assert.Equal(0m, result.Refund);
        Assert.Equal(700000m, result.Shortfall); // 600k arrears left + 100k deductions
        Assert.Equal(SecurityDepositStatus.Forfeited, result.Status);

        var remaining = await _db.RentInvoices.AsNoTracking().OrderBy(x => x.Id).ToListAsync();
        Assert.Equal(RentInvoiceStatus.Paid, remaining[0].Status);
        // The 200k left after the first invoice is applied to the second, leaving it partial.
        Assert.Equal(RentInvoiceStatus.PartiallyPaid, remaining[1].Status);
        Assert.Equal(200000m, remaining[1].AmountPaid);
        Assert.Equal(600000m, remaining[1].Amount - remaining[1].AmountPaid);
    }

    [Fact]
    public async Task SettlementCannotRunTwice()
    {
        await _deposits.SettleAsync(ContractId, "admin", null);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _deposits.SettleAsync(ContractId, "admin", null));
    }

    [Fact]
    public async Task DeductionsAreLockedAfterSettlement()
    {
        await _deposits.SettleAsync(ContractId, "admin", null);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _deposits.AddDeductionAsync(ContractId, DepositDeductionCategory.Other, 1000m, "late", "admin"));
    }

    [Fact]
    public async Task SettlementWritesTheStatusHistory()
    {
        await _deposits.SettleAsync(ContractId, "admin", null);

        var history = await _db.PaymentStatusEvents.AsNoTracking()
            .Where(x => x.SubjectType == PaymentStatusSubject.RentalContract)
            .ToListAsync();
        var entry = Assert.Single(history);
        Assert.Equal(SecurityDepositStatus.Settled, entry.ToStatus);
        Assert.Equal("admin", entry.Actor);
    }

    [Fact]
    public async Task DepositListBackfillsContractsThatPredateDeposits()
    {
        var page = await _deposits.GetDepositsAsync(null, 1, 50);

        var row = Assert.Single(page.Items);
        Assert.Equal(ContractId, row.RentalContractId);
        Assert.Equal("Jane Tenant", row.TenantName);
        Assert.Equal(1000000m, row.AmountHeld);
        Assert.Equal(SecurityDepositStatus.Held, row.Status);
        Assert.Equal(1, page.Total);
    }

    private sealed class NoopDispatcher : INotificationDispatcher
    {
        public Task DispatchAsync(Application.Interfaces.Notifications.NotificationRequest request, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
