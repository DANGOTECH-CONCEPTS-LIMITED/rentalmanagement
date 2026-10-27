using System.Net;
using System.Reflection;
using System.Text;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Collecto;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Tests;

public class PaymentProviderRoutingTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;
    private readonly RecordingHandler _collecto = new();
    private readonly RecordingHandler _dango = new();
    private IConfiguration _configuration = null!;
    private PaymentProviderSettingsService _settings = null!;
    private PaymentGatewayRouter _router = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Collecto:BaseUrl"] = "https://collecto.example/",
            ["Collecto:Username"] = "test",
            ["Collecto:ApiKey"] = "test-only",
            ["DangoPayment:BaseUrl"] = "https://dango.example/",
            ["DangoPayment:MerchantCode"] = "merchant-test",
            ["DangoPayment:SourceSystem"] = "rental-test",
            ["DangoPayment:ClientId"] = "client-test",
            ["DangoPayment:BankNetwork"] = "bank-test",
            ["DangoPayment:BankCurrency"] = "UGX",
            ["DangoPayment:BankDestination"] = "BANK",
            ["DangoPayment:BankSortCodes:TESTUGKA"] = "12345",
            ["DangoPayment:TransactionStatus:StateField"] = "statusCode",
            ["DangoPayment:TransactionStatus:ReferenceField"] = "requestId",
            ["DangoPayment:TransactionStatus:SuccessValues:0"] = "00"
        }).Build();
        _settings = new(_db, _configuration);
        await _settings.SetAsync("Collecto", mobileNetworks: [
            new("MTN", ["25676", "25677", "25678"], "mtn-test"),
            new("Airtel", ["25670", "25674", "25675"], "airtel-test")]);
        _router = new(new CollectoService(new HttpClient(_collecto), _configuration, null!),
            new DangoPaymentClient(new HttpClient(_dango), _configuration), _db, _settings);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private static RequestToPayRequestDto Request(string reference = "collection-1", decimal amount = 1000) => new()
    {
        Reference = reference, Amount = amount, Phone = "256770000001", PaymentOption = "mobilemoney"
    };

    [Fact]
    public async Task DefaultsToCollectoAndPersistsManualSelection()
    {
        Assert.Equal("Collecto", (await _settings.GetAsync()).Provider);
        await _settings.SetAsync("DangoPayment");
        Assert.Equal("DangoPayment", (await new PaymentProviderSettingsService(_db, _configuration).GetAsync()).Provider);
    }

    [Fact]
    public async Task RejectsUnconfiguredAndInvalidProviders()
    {
        var unconfigured = new PaymentProviderSettingsService(_db, new ConfigurationBuilder().Build());
        await Assert.ThrowsAsync<ArgumentException>(() => unconfigured.SetAsync("DangoPayment"));
        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SetAsync("other"));
        Assert.Equal("Collecto", (await _settings.GetAsync()).Provider);
    }

    [Fact]
    public async Task RetriesReplayOriginalResponseEvenAfterManualSwitch()
    {
        var original = await _router.RequestToPayAsync(Request());
        await _settings.SetAsync("DangoPayment");
        Assert.Equal(original, await _router.RequestToPayAsync(Request()));
        Assert.Single(_collecto.Paths);
        Assert.Empty(_dango.Paths);
        Assert.Equal("Collecto", (await _db.Set<PaymentGatewaySubmission>().SingleAsync()).Provider);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _router.RequestToPayAsync(Request(amount: 2000)));
        Assert.Single(_collecto.Paths);
    }

    [Fact]
    public async Task StatusUsesCollectoRemoteIdAfterSwitch()
    {
        await _router.RequestToPayAsync(Request());
        await _settings.SetAsync("DangoPayment");
        await _router.GetRequestToPayStatusAsync(new() { TransactionId = "remote-1" });
        Assert.Equal(2, _collecto.Paths.Count);
        Assert.EndsWith("requestToPayStatus", _collecto.Paths[1]);
        Assert.Empty(_dango.Paths);
    }

    [Fact]
    public async Task DangoSubmissionAndStatusStayOnDangoAfterSwitchBack()
    {
        await _settings.SetAsync("DangoPayment");
        await _router.RequestToPayAsync(Request());
        await _settings.SetAsync("Collecto");
        await _router.GetRequestToPayStatusAsync(new() { TransactionId = "collection-1" });
        Assert.Empty(_collecto.Paths);
        Assert.Contains(_dango.Paths, x => x.EndsWith("merchant-payment"));
        Assert.Contains(_dango.Paths, x => x.EndsWith("get-transaction-status"));
        Assert.Equal("DangoPayment", (await _db.Set<PaymentGatewaySubmission>().SingleAsync()).Provider);
    }

    [Fact]
    public async Task LegacyTransactionsStayOnCollecto()
    {
        await _settings.SetAsync("DangoPayment");
        await _router.GetRequestToPayStatusAsync(new() { TransactionId = "legacy-transaction" });
        Assert.Single(_collecto.Paths);
        Assert.Empty(_dango.Paths);
    }

    [Fact]
    public async Task AmbiguousTimeoutNeverSubmitsAgainOrFailsOver()
    {
        _collecto.Timeout = true;
        Assert.Empty(await _router.RequestToPayAsync(Request()));
        await _settings.SetAsync("DangoPayment");
        Assert.Empty(await _router.RequestToPayAsync(Request()));
        Assert.Single(_collecto.Paths);
        Assert.Empty(_dango.Paths);
        Assert.Null((await _db.Set<PaymentGatewaySubmission>().SingleAsync()).Response);
    }

    private static InitiatePayoutRequestDto MobilePayout(string account = "0770000001") => new()
    {
        Gateway = "mobilemoney", Reference = "payout-1", AccountNumber = account,
        AccountName = "Test Recipient", Phone = account, Amount = 1000, Message = "Test payout"
    };

    [Fact]
    public async Task MobilePayoutUsesSavedNetworkCodeAndOriginalProviderForStatus()
    {
        await _settings.SetAsync("DangoPayment");
        await _router.InitiatePayoutAsync(MobilePayout());
        Assert.Contains("mtn-test", Assert.Single(_dango.Bodies));
        Assert.Contains("256770000001", _dango.Bodies[0]);
        await _settings.SetAsync("Collecto");
        await _router.GetPayoutStatusAsync(new() { Reference = "payout-1" });
        Assert.EndsWith("get-transaction-status", _dango.Paths.Last());
        Assert.Empty(_collecto.Paths);
    }

    [Fact]
    public async Task UnmatchedPayoutNumberIsRejectedBeforeCreatingClaim()
    {
        await _settings.SetAsync("DangoPayment");
        await Assert.ThrowsAsync<ArgumentException>(() => _router.InitiatePayoutAsync(MobilePayout("0790000001")));
        Assert.Empty(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
        Assert.Empty(_dango.Paths);
    }

    [Fact]
    public async Task BankPayoutRequiresRequestedBanksSortCodeBeforeCreatingClaim()
    {
        await _settings.SetAsync("DangoPayment");
        var request = new InitiatePayoutBankRequestDto
        {
            gateway = "bank", bankSwiftCode = "UNKNOWN", accountNumber = "12345678", accountName = "Test Recipient",
            amount = 1000, phone = "0770000001", reference = "bank-1", message = "Test payout", bankName = "Test Bank"
        };
        await Assert.ThrowsAnyAsync<Exception>(() => _router.InitiateBankPayoutAsync(request));
        Assert.Empty(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
        Assert.Empty(_dango.Paths);
        request.bankSwiftCode = "TESTUGKA";
        await _router.InitiateBankPayoutAsync(request);
        Assert.EndsWith("bank-transfer-cash-out", Assert.Single(_dango.Paths));
        Assert.Contains("12345", Assert.Single(_dango.Bodies));
    }

    [Fact]
    public async Task DangoTimeoutReturnsPendingReferenceAndNeverResubmits()
    {
        await _settings.SetAsync("DangoPayment");
        _dango.Timeout = true;
        var response = await _router.RequestToPayAsync(Request());
        Assert.Contains("collection-1", response);
        Assert.Contains("PENDING", response);
        Assert.Equal(response, await _router.RequestToPayAsync(Request()));
        Assert.Single(_dango.Paths);
        Assert.Empty(_collecto.Paths);
    }

    [Fact]
    public async Task ExistingUnknownProviderCannotBeReplayedOrResubmitted()
    {
        _db.Set<PaymentGatewaySubmission>().Add(new()
        {
            Id = PaymentGatewayRouter.SubmissionId("Collection", "collection-1"),
            Operation = "Collection", Reference = "collection-1", Provider = "unknown"
        });
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => _router.RequestToPayAsync(Request()));
        Assert.Empty(_collecto.Paths);
        Assert.Empty(_dango.Paths);
    }

    [Fact]
    public async Task MissingDangoConfigurationDoesNotCreateSubmission()
    {
        await _settings.SetAsync("DangoPayment");
        _configuration["DangoPayment:MerchantCode"] = "";
        await Assert.ThrowsAsync<InvalidOperationException>(() => _router.RequestToPayAsync(Request()));
        Assert.Empty(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
        Assert.Empty(_collecto.Paths);
        Assert.Empty(_dango.Paths);
    }

    [Theory]
    [InlineData("0770000001", "mtn-test")]
    [InlineData("+256780000001", "mtn-test")]
    [InlineData("0700000001", "airtel-test")]
    [InlineData("750000001", "airtel-test")]
    public async Task ResolvesConfiguredOperatorFromNormalizedPhone(string phone, string expected)
        => Assert.Equal(expected, await _settings.ResolveMobileNetworkAsync(phone));

    [Theory]
    [InlineData("0790000001")]
    [InlineData("invalid")]
    public async Task RejectsUnmatchedOrInvalidPhones(string phone)
        => await Assert.ThrowsAsync<ArgumentException>(() => _settings.ResolveMobileNetworkAsync(phone));

    [Fact]
    public async Task RejectsAmbiguousPrefixConfigurationWithoutChangingActiveProvider()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SetAsync("Collecto", mobileNetworks: [
            new("MTN", ["25677"], "mtn"), new("Airtel", ["256770"], "airtel")]));
        Assert.Equal("Collecto", (await _settings.GetAsync()).Provider);
        Assert.Equal("mtn-test", await _settings.ResolveMobileNetworkAsync("0770000001"));
    }

    [Fact]
    public async Task MissingOperatorCodesDisableDangoWithoutBlockingConfigurationSave()
    {
        var result = await _settings.SetAsync("Collecto", mobileNetworks: [new("MTN", ["25677"], "")]);
        Assert.False(result.DangoConfigured);
        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SetAsync("DangoPayment"));
    }

    [Fact]
    public void SettingsEndpointIsAdministratorOnly()
    {
        var authorization = typeof(API.Controllers.PaymentProviderSettingsController).GetCustomAttribute<AuthorizeAttribute>();
        Assert.Equal("Administrator", authorization?.Roles);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<string> Paths { get; } = [];
        public List<string> Bodies { get; } = [];
        public bool Timeout { get; set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Paths.Add(request.RequestUri!.AbsolutePath);
            Bodies.Add(request.Content == null ? "" : await request.Content.ReadAsStringAsync(ct));
            if (Timeout) throw new TaskCanceledException("Ambiguous test timeout");
            var body = request.RequestUri.Host == "collecto.example"
                ? "{\"status\":200,\"data\":{\"transactionId\":\"remote-1\",\"requestToPay\":true,\"requestToPayStatus\":true,\"status\":\"PENDING\"}}"
                : "{\"statusCode\":\"000\",\"statusDescription\":\"Pending\",\"requestId\":\"collection-1\"}";
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
        }
    }
}
