using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Tests;

public class CollectionWalletCreditTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=wallet-credit-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private CollectionWalletCreditService _service = null!;
    private AppDbContext Context(IInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection);
        if (interceptor != null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }
    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _db.Users.Add(new User { Id = 101, Email = "owner@test", SystemRoleId = 2 });
        _db.Wallets.Add(new Wallet { Id = 201, LandlordId = 101, Balance = 100 });
        _db.UtilityMeters.Add(new UtilityMeter { Id = 301, LandLordId = 101, MeterNumber = "meter" });
        _db.UtilityPayments.Add(new UtilityPayment
        {
            Id = 401, TransactionID = "DANGO_U_20261028_1", MeterNumber = "meter", Amount = 1000,
            Charges = 600, Status = "SUCCESSFUL AT TELECOM", VendorTranId = "provider-u"
        });
        _db.TenantPayments.Add(new TenantPayment
        {
            Id = 501, TransactionId = "DANGO_R_20261028_2", Amount = 2000, PaymentStatus = "SUCCESSFUL AT TELECOM",
            VendorTransactionId = "provider-r", PropertyTenant = new PropertyTenant
            {
                Id = 601, Property = new LandLordProperty { Id = 701, OwnerId = 101, Price = 2000 }
            }
        });
        await _db.SaveChangesAsync();
        _service = new(_db);
    }
    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }
    private Task Credit(bool rent) => rent ? _service.CreditRentAsync(501) : _service.CreditUtilityAsync(401);
    private async Task Reset(bool rent)
    {
        if (rent) await _db.TenantPayments.Where(x => x.Id == 501).ExecuteUpdateAsync(s => s.SetProperty(x => x.PaymentStatus, "SUCCESSFUL AT TELECOM"));
        else await _db.UtilityPayments.Where(x => x.Id == 401).ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "SUCCESSFUL AT TELECOM"));
    }
    private async Task AssertState(bool rent, decimal balance)
    {
        Assert.Equal(balance, await _db.Wallets.AsNoTracking().Where(x => x.Id == 201).Select(x => x.Balance).SingleAsync());
        if (rent)
        {
            var row = await _db.TenantPayments.AsNoTracking().SingleAsync();
            Assert.NotNull(row.WalletCreditedAtUtc);
            Assert.Equal("SUCCESSFUL", row.PaymentStatus);
            Assert.Equal("provider-r", row.VendorTransactionId);
        }
        else
        {
            var row = await _db.UtilityPayments.AsNoTracking().SingleAsync();
            Assert.NotNull(row.WalletCreditedAtUtc);
            Assert.Equal("SUCCESSFUL", row.Status);
            Assert.Equal("provider-u", row.VendorTranId);
        }
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ResetToPendingAndSuccessfulAgainCannotCreditTwice(bool rent)
    {
        await Credit(rent);
        await Reset(rent);
        await using var restarted = Context();
        var service = new CollectionWalletCreditService(restarted);
        if (rent) await service.CreditRentAsync(501); else await service.CreditUtilityAsync(401);
        await Credit(rent);
        await AssertState(rent, rent ? 2100 : 1100);
        Assert.Single(await _db.WalletTransactions.AsNoTracking().ToListAsync());
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LegacyCreditWithMatchingTransactionIdIsNotCreditedAgain(bool rent)
    {
        _db.WalletTransactions.Add(new WalletTransaction
        {
            WalletId = 201, Amount = rent ? 2000 : 1000, TransactionId = rent ? "DANGO_R_20261028_2" : "DANGO_U_20261028_1"
        });
        await _db.SaveChangesAsync();
        await Credit(rent);
        await AssertState(rent, 100);
        Assert.Single(await _db.WalletTransactions.AsNoTracking().ToListAsync());
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DurableCreditMarkerPreventsReplayEvenWithoutOldLedgerId(bool rent)
    {
        if (rent) await _db.TenantPayments.Where(x => x.Id == 501).ExecuteUpdateAsync(s => s.SetProperty(x => x.WalletCreditedAtUtc, DateTime.UtcNow));
        else await _db.UtilityPayments.Where(x => x.Id == 401).ExecuteUpdateAsync(s => s.SetProperty(x => x.WalletCreditedAtUtc, DateTime.UtcNow));
        await Credit(rent);
        await AssertState(rent, 100);
        Assert.Empty(await _db.WalletTransactions.ToListAsync());
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LedgerSaveFailureRollsBackClaimAndAllowsOneSafeRetry(bool rent)
    {
        await using (var failing = Context(new FailLedgerSave()))
        {
            var service = new CollectionWalletCreditService(failing);
            await Assert.ThrowsAsync<InvalidOperationException>(() => rent ? service.CreditRentAsync(501) : service.CreditUtilityAsync(401));
        }
        Assert.Empty(await _db.WalletTransactions.AsNoTracking().ToListAsync());
        Assert.Equal(100m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        if (rent) Assert.Null((await _db.TenantPayments.AsNoTracking().SingleAsync()).WalletCreditedAtUtc);
        else Assert.Null((await _db.UtilityPayments.AsNoTracking().SingleAsync()).WalletCreditedAtUtc);
        await Credit(rent);
        await AssertState(rent, rent ? 2100 : 1100);
        Assert.Single(await _db.WalletTransactions.AsNoTracking().ToListAsync());
    }
    [Fact]
    public async Task SeparateCollectionsOnSameWalletBothCreditWithoutLosingBalanceUpdates()
    {
        await _service.CreditUtilityAsync(401);
        await _service.CreditRentAsync(501);
        await AssertState(true, 3100);
        Assert.Equal(2, await _db.WalletTransactions.AsNoTracking().CountAsync());
    }
    [Fact]
    public async Task MissingUtilityWalletDoesNotMarkThePaymentCompleted()
    {
        await _db.Wallets.ExecuteDeleteAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreditUtilityAsync(401));
        var row = await _db.UtilityPayments.AsNoTracking().SingleAsync();
        Assert.Equal("SUCCESSFUL AT TELECOM", row.Status);
        Assert.Null(row.WalletCreditedAtUtc);
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConcurrentWorkersCannotBothCreditSameCollection(bool rent)
    {
        using var start = new ManualResetEventSlim();
        Task Worker() => Task.Run(async () =>
        {
            await using var connection = new SqliteConnection(_connection.ConnectionString);
            await connection.OpenAsync();
            await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
            var service = new CollectionWalletCreditService(db);
            start.Wait();
            if (rent) await service.CreditRentAsync(501); else await service.CreditUtilityAsync(401);
        });
        var workers = new[] { Worker(), Worker() };
        start.Set();
        await Task.WhenAll(workers);
        await AssertState(rent, rent ? 2100 : 1100);
        Assert.Single(await _db.WalletTransactions.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task FailureAfterBalanceIncrementRollsBackLedgerBalanceAndCompletion()
    {
        await using (var failing = Context(new FailMarkerUpdate()))
            await Assert.ThrowsAsync<InvalidOperationException>(() => new CollectionWalletCreditService(failing).CreditUtilityAsync(401));
        Assert.Equal(100m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Empty(await _db.WalletTransactions.AsNoTracking().ToListAsync());
        Assert.Equal("SUCCESSFUL AT TELECOM", (await _db.UtilityPayments.AsNoTracking().SingleAsync()).Status);
        await _service.CreditUtilityAsync(401);
        await AssertState(false, 1100);
    }

    private sealed class FailMarkerUpdate : DbCommandInterceptor
    {
        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(System.Data.Common.DbCommand command,
            CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.StartsWith("UPDATE", StringComparison.Ordinal) && command.CommandText.Contains("SET \"WalletCreditedAtUtc\""))
                throw new InvalidOperationException("Simulated marker write failure");
            return ValueTask.FromResult(result);
        }
    }

    private sealed class FailLedgerSave : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<WalletTransaction>().Any(x => x.State == EntityState.Added))
                throw new InvalidOperationException("Simulated ledger failure");
            return ValueTask.FromResult(result);
        }
    }
}
