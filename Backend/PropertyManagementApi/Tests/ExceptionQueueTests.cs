using Domain.Dtos.Ops;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Ops;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Tests;

public class ExceptionQueueTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=ops-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private ExceptionQueueService _service = null!;

    private AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _db.Users.Add(new User { Id = 101, FullName = "Utility Owner", Email = "owner@test", PhoneNumber = "256770000001", SystemRoleId = 4 });
        _db.Wallets.Add(new Wallet { Id = 201, LandlordId = 101, Balance = 0 });
        _db.UtilityMeters.Add(new UtilityMeter
        {
            Id = 301, LandLordId = 101, MeterNumber = "meter-1", NWSCAccount = "12345678",
            NwscRegisteredName = "Registered NWSC Name", LocationOfNwscMeter = "Old NWSC meter",
            UtilityMeterLocation = "Plot 12, Kampala", CustomerMobile = "0700000001"
        });
        await _db.SaveChangesAsync();
        _service = new ExceptionQueueService(_db);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private static BillPaymentInstruction Bill(int id, string status, DateTime? submitted, DateTime? confirmed = null,
        DateTime? debited = null, int utilityPaymentId = 0) => new()
    {
        Id = id, UtilityPaymentId = utilityPaymentId == 0 ? 900 + id : utilityPaymentId,
        MeterNumber = "meter-1", NwscAccount = "12345678",
        UtilityOwnerId = 101, Amount = 6000, Status = status, RequestReference = $"DANGO_B_REF_{id}",
        CreatedAtUtc = DateTime.UtcNow.AddHours(-3), SubmittedAtUtc = submitted, ConfirmedAtUtc = confirmed,
        WalletDebitedAtUtc = debited, SubmissionAttempts = submitted == null ? 0 : 1, Reason = "provider rejected request"
    };

    private static UtilityPayment Collection(int id, string status, DateTime createdAt, DateTime? credited = null) => new()
    {
        Id = id, TransactionID = $"DANGO_U_REF_{id}", MeterNumber = "meter-1", Amount = 6000, Charges = 600,
        PhoneNumber = "256770000001", Status = status, CreatedAt = createdAt, WalletCreditedAtUtc = credited,
        Description = "Water Payment"
    };

    [Fact]
    public async Task FailedBillPaymentAppearsInTheQueue()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddHours(-1)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentFailed]);
        var item = Assert.Single(result.Items);
        Assert.Equal(ExceptionCategories.BillPaymentFailed, item.Category);
        Assert.Equal("DANGO_B_REF_1", item.Reference);
        Assert.Equal(6000m, item.Amount);
        Assert.Equal("meter-1", item.MeterNumber);
        Assert.True(item.AgeMinutes >= 55);
    }

    [Fact]
    public async Task FailedBillPaymentThatWasDebitedIsNotQueued()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddHours(-1), debited: DateTime.UtcNow.AddHours(-1)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(0, result.Counts[ExceptionCategories.BillPaymentFailed]);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task FailedBillPaymentWithoutASubmissionIsNotQueued()
    {
        // Never submitted: nothing can have gone wrong at the provider yet.
        _db.Add(Bill(1, BillPaymentInstructionStatus.Failed, submitted: null));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(0, result.Counts[ExceptionCategories.BillPaymentFailed]);
    }

    [Fact]
    public async Task RecentPendingConfirmationIsLeftAloneButAnOldOneIsQueued()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.PendingConfirmation, DateTime.UtcNow.AddMinutes(-2)));
        _db.Add(Bill(2, BillPaymentInstructionStatus.PendingConfirmation, DateTime.UtcNow.AddMinutes(-40)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentUnconfirmed]);
        var item = Assert.Single(result.Items);
        Assert.Equal(ExceptionCategories.BillPaymentUnconfirmed, item.Category);
        Assert.Equal("DANGO_B_REF_2", item.Reference);
    }

    [Fact]
    public async Task ReconciliationRequiredBillPaymentIsQueuedAsUnconfirmed()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.ReconciliationRequired, DateTime.UtcNow.AddHours(-2)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentUnconfirmed]);
        Assert.Equal(BillPaymentInstructionStatus.ReconciliationRequired, Assert.Single(result.Items).Status);
    }

    [Fact]
    public async Task UndebitedBillPaymentIsQueued()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.PaidUndebited, DateTime.UtcNow.AddHours(-2), DateTime.UtcNow.AddHours(-1)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentUndebited]);
        Assert.Equal(ExceptionCategories.BillPaymentUndebited, Assert.Single(result.Items).Category);
    }

    [Fact]
    public async Task StuckSubmissionIsQueued()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.PendingSubmission, DateTime.UtcNow.AddMinutes(-30)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentStuckSubmission]);
        Assert.Equal(ExceptionCategories.BillPaymentStuckSubmission, Assert.Single(result.Items).Category);
    }

    [Fact]
    public async Task CollectionSettledButNotCreditedIsQueued()
    {
        _db.Add(Collection(1, "SUCCESSFUL AT TELECOM", DateTime.Now.AddMinutes(-45)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.CollectionNotCredited]);
        var item = Assert.Single(result.Items);
        Assert.Equal(ExceptionCategories.CollectionNotCredited, item.Category);
        Assert.Equal("DANGO_U_REF_1", item.Reference);
    }

    [Fact]
    public async Task CreditedCollectionWithoutABillPaymentIsQueued()
    {
        _db.Add(Collection(1, "SUCCESSFUL", DateTime.Now.AddHours(-1), DateTime.Now.AddHours(-1)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.CollectionUnbilled]);
        Assert.Equal(ExceptionCategories.CollectionUnbilled, Assert.Single(result.Items).Category);
    }

    [Fact]
    public async Task CreditedCollectionWithABillPaymentIsNotQueued()
    {
        _db.Add(Collection(1, "SUCCESSFUL", DateTime.Now.AddHours(-1), DateTime.Now.AddHours(-1)));
        _db.Add(Bill(1, BillPaymentInstructionStatus.Successful, DateTime.UtcNow.AddHours(-1),
            DateTime.UtcNow.AddHours(-1), DateTime.UtcNow.AddHours(-1), utilityPaymentId: 1));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(0, result.Counts[ExceptionCategories.CollectionUnbilled]);
    }

    [Fact]
    public async Task CreditedCollectionForAMeterWithoutNwscAccountIsNotQueued()
    {
        _db.UtilityMeters.Add(new UtilityMeter { Id = 302, LandLordId = 101, MeterNumber = "meter-2", NWSCAccount = "N/A" });
        _db.Add(new UtilityPayment
        {
            Id = 5, TransactionID = "DANGO_U_REF_5", MeterNumber = "meter-2", Amount = 6000, Charges = 600,
            PhoneNumber = "256770000001", Status = "SUCCESSFUL", CreatedAt = DateTime.Now.AddHours(-1),
            WalletCreditedAtUtc = DateTime.Now.AddHours(-1)
        });
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(null, 1, 50);

        Assert.Equal(0, result.Counts[ExceptionCategories.CollectionUnbilled]);
    }

    [Fact]
    public async Task CategoryFilterNarrowsItemsButKeepsEveryCount()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddHours(-1)));
        _db.Add(Bill(2, BillPaymentInstructionStatus.PendingConfirmation, DateTime.UtcNow.AddHours(-2)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync(ExceptionCategories.BillPaymentUnconfirmed, 1, 50);

        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentFailed]);
        Assert.Equal(1, result.Counts[ExceptionCategories.BillPaymentUnconfirmed]);
        Assert.Equal(2, result.Total);
        Assert.Equal(ExceptionCategories.BillPaymentUnconfirmed, Assert.Single(result.Items).Category);
    }

    [Fact]
    public async Task AllIsTreatedAsNoFilter()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddHours(-1)));
        await _db.SaveChangesAsync();

        var result = await _service.GetAsync("all", 1, 50);

        Assert.Single(result.Items);
    }

    [Fact]
    public async Task UnknownCategoryIsRejected()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.GetAsync("not-a-category", 1, 50));
    }

    [Fact]
    public async Task OldestItemsComeFirstAndPagingIsApplied()
    {
        _db.Add(Bill(1, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddMinutes(-10)));
        _db.Add(Bill(2, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddMinutes(-90)));
        _db.Add(Bill(3, BillPaymentInstructionStatus.Failed, DateTime.UtcNow.AddMinutes(-50)));
        await _db.SaveChangesAsync();

        var firstPage = await _service.GetAsync(null, 1, 2);
        var secondPage = await _service.GetAsync(null, 2, 2);

        Assert.Equal(3, firstPage.Counts[ExceptionCategories.BillPaymentFailed]);
        Assert.Equal(3, firstPage.Total);
        Assert.Equal(new[] { "DANGO_B_REF_2", "DANGO_B_REF_3" }, firstPage.Items.Select(x => x.Reference));
        Assert.Equal(new[] { "DANGO_B_REF_1" }, secondPage.Items.Select(x => x.Reference));
    }
}
