using Domain.Dtos.Meters;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Meter;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Tests;

public class MeterLienTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=lien-tests-{Guid.NewGuid():N};Mode=Memory;Cache=Shared");
    private AppDbContext _db = null!;
    private MeterLienService _service = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _db.Users.AddRange(
            new User { Id = 101, Email = "owner@test", SystemRoleId = 4 },
            new User { Id = 102, Email = "other@test", SystemRoleId = 4 },
            new User { Id = 103, Email = "admin@test", SystemRoleId = 1 },
            new User { Id = 104, Email = "tenant@test", SystemRoleId = 3 });
        _db.UtilityMeters.Add(new UtilityMeter { Id = 201, MeterNumber = "1234567890123", LandLordId = 101 });
        await _db.SaveChangesAsync();
        _service = new MeterLienService(_db, new MeterFeeService(_db));
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private Task<MeterLienSummaryDto> Add(decimal amount, string mode = "FullFirst", decimal percentage = 100m, string email = "owner@test") =>
        _service.AddAsync(201, new AddMeterLienDto { Amount = amount, Description = "Meter installation", RepaymentMode = mode, RepaymentPercentage = percentage }, email);

    private async Task<int> Payment(double amount = 100, string status = "SUCCESSFUL")
    {
        var payment = new UtilityPayment { Amount = amount, MeterNumber = "1234567890123", Status = status, TransactionID = Guid.NewGuid().ToString() };
        _db.UtilityPayments.Add(payment);
        await _db.SaveChangesAsync();
        return payment.Id;
    }

    [Fact]
    public async Task FullFirstSettlesMonthlyFeesThenFifoLiensThenTokenAtomically()
    {
        await Add(30);
        await Add(40);
        _db.MeterFeeCharges.Add(new MeterFeeCharge { UtilityMeterId = 201, MeterNumber = "1234567890123", Period = "2026-09", Amount = 20 });
        await _db.SaveChangesAsync();
        var id = await Payment();
        var allocation = await _service.AllocatePaymentAsync(id);
        Assert.Equal(20m, allocation.FeeAmount);
        Assert.Equal(70m, allocation.LienAmount);
        Assert.Equal(10m, allocation.TokenAmount);
        var summary = await _service.GetAsync(201, "owner@test");
        Assert.Equal(0m, summary.Balance);
        Assert.Equal(2, await _db.MeterLienAllocations.CountAsync());
        Assert.Single(summary.Repayments);
        Assert.Equal(100m, summary.Repayments[0].PaymentAmount);
        Assert.Equal(70m, summary.Repayments[0].LienAmount);
    }

    [Fact]
    public async Task LegacyFeeOnlyProcessingResumesWithoutDoubleSettlement()
    {
        await Add(200);
        _db.MeterFeeCharges.Add(new MeterFeeCharge { UtilityMeterId = 201, MeterNumber = "1234567890123", Period = "2026-09", Amount = 20 });
        await _db.SaveChangesAsync();
        var id = await Payment();
        Assert.Equal(20d, await new MeterFeeService(_db).SettleFeesForPaymentAsync(id));
        var allocated = await _service.AllocatePaymentAsync(id);
        var retried = await _service.AllocatePaymentAsync(id);
        Assert.Equal(allocated.Id, retried.Id);
        Assert.Equal(20m, retried.FeeAmount);
        Assert.Equal(80m, retried.LienAmount);
        Assert.Equal(0m, retried.TokenAmount);
        Assert.Equal(20d, (await _db.MeterFeeCharges.AsNoTracking().SingleAsync()).AmountPaid);
    }

    [Fact]
    public async Task FeesConsumeWholePaymentWithoutLienRepaymentOrRepeatedVend()
    {
        await Add(200);
        _db.MeterFeeCharges.Add(new MeterFeeCharge { UtilityMeterId = 201, MeterNumber = "1234567890123", Period = "2026-09", Amount = 100 });
        await _db.SaveChangesAsync();
        var id = await Payment();
        var allocation = await _service.AllocatePaymentAsync(id);
        Assert.Equal(100m, allocation.FeeAmount);
        Assert.Equal(0m, allocation.LienAmount);
        Assert.Equal(0m, allocation.TokenAmount);
        Assert.True(await _service.TryClaimVendAsync(id));
        await _service.CompleteVendAsync(id, null, "0");
        Assert.Equal(allocation.Id, (await _service.AllocatePaymentAsync(id)).Id);
        Assert.False(await _service.TryClaimVendAsync(id));
        var summary = await _service.GetAsync(201, "owner@test");
        Assert.Equal(200m, summary.Balance);
        Assert.Empty(summary.Repayments);
    }

    [Fact]
    public async Task SubHundredthPercentageIsStoredExactlyAndNotRoundedToZero()
    {
        var summary = await Add(200, "Percentage", 0.001m);
        Assert.Equal(0.001m, summary.RepaymentPercentage);
        var allocation = await _service.AllocatePaymentAsync(await Payment(1000000));
        Assert.Equal(10m, allocation.LienAmount);
        Assert.Equal(999990m, allocation.TokenAmount);
    }

    [Fact]
    public async Task PercentageUsesRemainderAfterMonthlyFees()
    {
        await Add(200, "Percentage", 25);
        _db.MeterFeeCharges.Add(new MeterFeeCharge { UtilityMeterId = 201, MeterNumber = "1234567890123", Period = "2026-09", Amount = 20 });
        await _db.SaveChangesAsync();
        var allocation = await _service.AllocatePaymentAsync(await Payment());
        Assert.Equal(20m, allocation.LienAmount);
        Assert.Equal(60m, allocation.TokenAmount);
        Assert.Equal(180m, (await _service.GetAsync(201, "owner@test")).Balance);
    }

    [Fact]
    public async Task RetryPreservesAmountsEvenAfterPolicyAndNewLienChanges()
    {
        await Add(200, "Percentage", 25);
        var id = await Payment();
        var first = await _service.AllocatePaymentAsync(id);
        await Add(200);
        var second = await _service.AllocatePaymentAsync(id);
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(25m, second.LienAmount);
        Assert.Equal(75m, second.TokenAmount);
        Assert.Equal(1, await _db.MeterLienRepayments.CountAsync());
        Assert.Equal(25m, (await _service.GetAsync(201, "owner@test")).AmountPaid);
    }

    [Theory]
    [InlineData("PENDING")]
    [InlineData("FAILED")]
    [InlineData("SUCCESSFUL AT TELCOM")]
    [InlineData("SUCCESSFUL AT TELECOM")]
    [InlineData("SUCCESSFUL AT THE BANK")]
    [InlineData("SUCCESSFUL AT BANK")]
    [InlineData("REFUNDED")]
    [InlineData("REVERSED")]
    public async Task UnsuccessfulPaymentsDoNotSettleAnything(string status)
    {
        await Add(200);
        var id = await Payment(status: status);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.AllocatePaymentAsync(id));
        Assert.Empty(await _db.MeterLienRepayments.ToListAsync());
        Assert.Equal(0m, (await _service.GetAsync(201, "owner@test")).AmountPaid);
        Assert.False((await _db.UtilityPayments.FindAsync(id))!.FeesProcessed);
    }

    [Theory]
    [InlineData("other@test")]
    [InlineData("tenant@test")]
    [InlineData("missing@test")]
    public async Task NonOwnersAndOtherRolesCannotReadOrWrite(string email)
    {
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.GetAsync(201, email));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => Add(10, email: email));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.SetPolicyAsync(201, new SetMeterLienPolicyDto(), email));
    }

    [Fact]
    public async Task AdminCanManageOtherOwnersMeter()
    {
        await Add(15, email: "admin@test");
        var summary = await _service.SetPolicyAsync(201, new SetMeterLienPolicyDto { RepaymentMode = "Percentage", RepaymentPercentage = 12.5m }, "admin@test");
        Assert.Equal(15m, summary.Balance);
        Assert.Equal(12.5m, summary.RepaymentPercentage);
    }

    [Theory]
    [InlineData("FullFirst")]
    [InlineData("Percentage")]
    public async Task DirectAndBulkVendsCannotBypassOutstandingLiens(string mode)
    {
        await Add(200, mode, 25);
        var called = false;
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.WithVendAuthorizationAsync("1234567890123", 100, null, () => { called = true; return Task.FromResult(true); }));
        Assert.False(called);
    }

    [Fact]
    public async Task ClaimIsExclusiveAndUnknownOutcomeCannotAutomaticallyRetry()
    {
        await Add(200, "Percentage", 25);
        var id = await Payment();
        await _service.AllocatePaymentAsync(id);
        Assert.True(await _service.TryClaimVendAsync(id));
        Assert.False(await _service.TryClaimVendAsync(id));
        await _service.RecordVendFailureAsync(id, "Timeout", false);
        Assert.False(await _service.TryClaimVendAsync(id));
        await _service.RecordVendFailureAsync(id, "Provider confirmed failure", true);
        Assert.True(await _service.TryClaimVendAsync(id));
        await _service.CompleteVendAsync(id, "test-token", "3");
        Assert.False(await _service.TryClaimVendAsync(id));
        var payment = await _db.UtilityPayments.AsNoTracking().SingleAsync(x => x.Id == id);
        Assert.True(payment.IsTokenGenerated);
        Assert.Equal("test-token", payment.Token);
        Assert.Equal(25m, (await _service.GetAsync(201, "owner@test")).AmountPaid);
    }

    [Fact]
    public async Task AllDebtPaymentCompletesWithoutVendingAndConservesMoney()
    {
        await Add(200);
        var id = await Payment();
        var allocation = await _service.AllocatePaymentAsync(id);
        Assert.Equal(0m, allocation.TokenAmount);
        Assert.Equal(allocation.PaymentAmount, allocation.FeeAmount + allocation.LienAmount + allocation.TokenAmount);
        Assert.True(await _service.TryClaimVendAsync(id));
        await _service.CompleteVendAsync(id, null, "0");
        Assert.True((await _db.UtilityPayments.AsNoTracking().SingleAsync(x => x.Id == id)).IsTokenGenerated);
    }

    [Fact]
    public async Task VendAuthorizationRequiresExactClaimedAllocation()
    {
        await Add(200, "Percentage", 25);
        var id = await Payment();
        await _service.AllocatePaymentAsync(id);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.WithVendAuthorizationAsync("1234567890123", 75, id, () => Task.FromResult(true)));
        Assert.True(await _service.TryClaimVendAsync(id));
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.WithVendAuthorizationAsync("1234567890123", 100, id, () => Task.FromResult(true)));
        Assert.True(await _service.WithVendAuthorizationAsync("1234567890123", 75, id, () => Task.FromResult(true)));
    }

    [Fact]
    public async Task SeparateWorkerContextsCannotBothClaimSamePayment()
    {
        await Add(200, "Percentage", 25);
        var id = await Payment();
        await _service.AllocatePaymentAsync(id);
        async Task<bool> Claim()
        {
            await using var workerDb = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection.ConnectionString).Options);
            return await new MeterLienService(workerDb, new MeterFeeService(workerDb)).TryClaimVendAsync(id);
        }
        var claims = await Task.WhenAll(Task.Run(Claim), Task.Run(Claim));
        Assert.Single(claims.Where(x => x));
    }

    [Fact]
    public async Task RealPrepaidBoundaryBlocksBulkVendingWithoutExternalCalls()
    {
        await Add(200);
        var handler = new CaptureHandler();
        using var http = new HttpClient(handler);
        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["PosApi:BaseUrl"] = "https://offline.invalid/", ["STSPrepaid:BaseUrl"] = "https://offline.invalid/" }).Build();
        var sts = new Infrastructure.Services.STSVending.STSProcessing(http, config);
        var prepaid = new Infrastructure.Services.PrepaidApi.PrepaidApiService(http, config, sts, _service);
        var bulk = new MeterTokenService(_db, prepaid, Microsoft.Extensions.Logging.Abstractions.NullLogger<MeterTokenService>.Instance);
        await bulk.GenerateTokensForAllMetersAsync(100m);
        Assert.Equal(0, handler.Calls);
        Assert.Empty(await _db.MeterTokens.ToListAsync());
    }

    [Fact]
    public async Task StsVendingPreservesFractionalRemainderWithInvariantFormatting()
    {
        var handler = new CaptureHandler();
        using var http = new HttpClient(handler);
        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["STSPrepaid:BaseUrl"] = "https://offline.invalid/" }).Build();
        var sts = new Infrastructure.Services.STSVending.STSProcessing(http, config);
        var previous = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = System.Globalization.CultureInfo.GetCultureInfo("fr-FR");
            await sts.GetVendingToken("015123456789", 75.25m);
            Assert.Contains("75.25", handler.LastUri!.Query);
        }
        finally { System.Globalization.CultureInfo.CurrentCulture = previous; }
    }

    private sealed class CaptureHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public Uri? LastUri { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            LastUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent("{}") });
        }
    }

    [Fact]
    public async Task AllocationFailureRollsBackMonthlyFeesLienAndHistoryTogether()
    {
        await Add(200);
        _db.MeterFeeCharges.Add(new MeterFeeCharge { UtilityMeterId = 201, MeterNumber = "1234567890123", Period = "2026-09", Amount = 20 });
        await _db.SaveChangesAsync();
        var id = await Payment();
        await _db.Database.ExecuteSqlRawAsync("CREATE TRIGGER fail_allocation BEFORE INSERT ON MeterLienAllocations BEGIN SELECT RAISE(ABORT, 'simulated allocation failure'); END;");
        await Assert.ThrowsAsync<DbUpdateException>(() => _service.AllocatePaymentAsync(id));
        _db.ChangeTracker.Clear();
        Assert.False((await _db.UtilityPayments.SingleAsync(x => x.Id == id)).FeesProcessed);
        Assert.Equal(0d, (await _db.MeterFeeCharges.SingleAsync()).AmountPaid);
        Assert.Equal(0m, (await _db.MeterLiens.SingleAsync()).AmountPaid);
        Assert.Empty(await _db.MeterLienRepayments.ToListAsync());
        await _db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_allocation;");
        var retried = await _service.AllocatePaymentAsync(id);
        Assert.Equal(20m, retried.FeeAmount);
        Assert.Equal(80m, retried.LienAmount);
    }

    [Fact]
    public async Task SubsequentPaymentsUseRemainingBalanceWithoutOverpayment()
    {
        await Add(130);
        var first = await _service.AllocatePaymentAsync(await Payment());
        var second = await _service.AllocatePaymentAsync(await Payment());
        Assert.Equal(100m, first.LienAmount);
        Assert.Equal(30m, second.LienAmount);
        Assert.Equal(70m, second.TokenAmount);
        var summary = await _service.GetAsync(201, "owner@test");
        Assert.Equal(130m, summary.AmountPaid);
        Assert.Equal(0m, summary.Balance);
        Assert.Equal(2, summary.Repayments.Count);
    }

    [Theory]
    [InlineData(100, 10, "FullFirst", 100, 10)]
    [InlineData(100, 200, "Percentage", 25, 25)]
    [InlineData(100, 10, "Percentage", 25, 10)]
    [InlineData(1, 100, "Percentage", 0.5, 0)]
    [InlineData(100, 200, "Percentage", 100, 100)]
    public void AllocationCapsBalanceAndRoundsDown(decimal available, decimal balance, string mode, decimal percentage, decimal expected) =>
        Assert.Equal(expected, MeterLienService.CalculateLienAmount(available, balance, mode, percentage));

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(100.01)]
    public async Task InvalidPercentageRejected(decimal percentage) =>
        await Assert.ThrowsAsync<ArgumentException>(() => Add(10, "Percentage", percentage));

    [Fact]
    public async Task InvalidPrincipalDescriptionAndModeRejected()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => Add(0));
        await Assert.ThrowsAsync<ArgumentException>(() => Add(1.001m));
        await Assert.ThrowsAsync<ArgumentException>(() => Add(10, "Other"));
        await Assert.ThrowsAsync<ArgumentException>(() => _service.AddAsync(201, new AddMeterLienDto { Amount = 10, Description = " " }, "owner@test"));
    }
}
