using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

public class WalletPayoutReversalTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=reversal-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
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
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = 301, Wallet = new Wallet { Id = 201, LandlordId = 101, Balance = 4000 },
            TransactionId = "payout-ref", Amount = -1000, Status = "PENDING AT THE BANK", VendorTranId = "provider-ref"
        });
        await _db.SaveChangesAsync();
    }
    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }
    private static WalletTransaction Request() => new()
    {
        Id = 301, TransactionId = "payout-ref", Amount = 1000, Status = "FAILED AT THE BANK",
        ReasonAtTelecom = "Invalid requestId"
    };
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SubmissionAndStatusReversalPathsRefundExactlyOnce(bool submission)
    {
        if (submission)
        {
            var service = new WalletService(_db, NullLogger<WalletService>.Instance);
            await service.ReverseWalletTransaction(Request());
            await service.ReverseWalletTransaction(Request());
        }
        else
        {
            var service = new PaymentService(_db, null!);
            await service.ReverseWalletTransaction(Request());
            await service.ReverseWalletTransaction(Request());
        }
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        var original = await _db.WalletTransactions.AsNoTracking().SingleAsync(x => x.Id == 301);
        Assert.Equal("REVERSED", original.Status);
        Assert.Equal("Invalid requestId", original.ReasonAtTelecom);
        Assert.Equal("provider-ref", original.VendorTranId);
        var reversal = await _db.WalletTransactions.AsNoTracking().SingleAsync(x => x.Status == "REVERSAL");
        Assert.Equal(1000m, reversal.Amount);
        Assert.Equal("payout-ref", reversal.VendorTranId);
    }
    [Theory]
    [InlineData("SUCCESSFUL")]
    [InlineData("SUCCESSFUL AT THE BANK")]
    [InlineData("REVERSED")]
    public async Task SettledOrReversedWithdrawalCannotBeRefundedAgain(string status)
    {
        await _db.WalletTransactions.Where(x => x.Id == 301).ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, status));
        await WalletPayoutReversal.ReverseAsync(_db, Request(), false);
        Assert.Equal(4000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Equal(1, await _db.WalletTransactions.CountAsync());
    }
    [Fact]
    public async Task FailedReversalRollsBackClaimAndBalance()
    {
        await using (var failed = Context(new FailSave()))
            await Assert.ThrowsAsync<InvalidOperationException>(() => WalletPayoutReversal.ReverseAsync(failed, Request(), false));
        Assert.Equal("PENDING AT THE BANK", (await _db.WalletTransactions.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(4000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        await WalletPayoutReversal.ReverseAsync(_db, Request(), false);
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
    }
    [Fact]
    public async Task ConcurrentReversalsProduceOneRefund()
    {
        using var start = new ManualResetEventSlim();
        Task Worker() => Task.Run(async () =>
        {
            await using var connection = new SqliteConnection(_connection.ConnectionString);
            await connection.OpenAsync();
            await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
            start.Wait();
            await WalletPayoutReversal.ReverseAsync(db, Request(), false);
        });
        var tasks = new[] { Worker(), Worker() };
        start.Set();
        await Task.WhenAll(tasks);
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Equal(1, await _db.WalletTransactions.CountAsync(x => x.Status == "REVERSAL"));
    }
    private sealed class FailSave : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("Simulated reversal ledger failure");
    }
}
