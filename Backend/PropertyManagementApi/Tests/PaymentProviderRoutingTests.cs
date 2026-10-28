using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Collecto;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

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
    private readonly RecordingLogger _logger = new();

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
            new DangoPaymentClient(new HttpClient(_dango), _configuration), _db, _settings, _logger);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private static RequestToPayRequestDto Request(string reference = "collection-1", decimal amount = 1000) => new()
    {
        Reference = reference, Amount = amount, Phone = "256770000001", PaymentOption = "mobilemoney", PaymentCategory = "U"
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

    [Theory]
    [InlineData("0770000001", "MTN")]
    [InlineData("+256780000001", "MTN")]
    [InlineData("0700000001", "AIRTEL")]
    [InlineData("750000001", "AIRTEL")]
    public async Task MerchantCollectionSourceSystemMatchesSavedPhoneNetwork(string phone, string expected)
    {
        _configuration["DangoPayment:SourceSystem"] = "";
        await _settings.SetAsync("DangoPayment", mobileNetworks: [
            new("MTN", ["25676", "25677", "25678"], "MTN"),
            new("Airtel", ["25670", "25674", "25675"], "AIRTEL")]);
        var request = Request();
        request.Phone = phone;
        await _router.RequestToPayAsync(request);
        using var sent = JsonDocument.Parse(Assert.Single(_dango.Bodies));
        Assert.Equal(expected, sent.RootElement.GetProperty("sourceSystem").GetString());
        Assert.Equal(DangoPaymentClient.NormalizePhone(phone), sent.RootElement.GetProperty("msisdn").GetString());
        Assert.Empty(_collecto.Paths);
    }

    [Fact]
    public async Task CollectionWithUnknownNetworkCannotCreateClaimOrSendRequest()
    {
        await _settings.SetAsync("DangoPayment");
        var request = Request();
        request.Phone = "0790000001";
        await Assert.ThrowsAsync<ArgumentException>(() => _router.RequestToPayAsync(request));
        Assert.Empty(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
        Assert.Empty(_dango.Paths);
        Assert.Empty(_collecto.Paths);
    }

    [Fact]
    public async Task CollectoCollectionsDoNotRequireDangoPhoneRouting()
    {
        var request = Request();
        request.Phone = "0790000001";
        await _router.RequestToPayAsync(request);
        Assert.Single(_collecto.Paths);
        Assert.Empty(_dango.Paths);
    }

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

    [Fact]
    public async Task RoutingLogsIdentifyActualProviderRatherThanCompatibilityInterfaceName()
    {
        await _settings.SetAsync("DangoPayment");
        await _router.RequestToPayAsync(Request());
        await _router.GetRequestToPayStatusAsync(new() { TransactionId = "collection-1" });
        await _settings.SetAsync("Collecto");
        await _router.RequestToPayAsync(Request());
        Assert.Contains(_logger.Messages, x => x == "Submitting Collection reference collection-1 using payment provider DangoPayment");
        Assert.Contains(_logger.Messages, x => x == "Checking Collection reference collection-1 using original payment provider DangoPayment");
        Assert.Contains(_logger.Messages, x => x.Contains("original provider DangoPayment; no new submission"));
        Assert.DoesNotContain(_logger.Messages, x => x.Contains("provider Collecto"));
        Assert.Empty(_collecto.Paths);
    }

    [Theory]
    [InlineData("U")]
    [InlineData("R")]
    [InlineData("W")]
    public async Task DangoMerchantReferenceIsAllocatedPersistedAndReplayedWithoutChangingInternalIds(string category)
    {
        await _settings.SetAsync("DangoPayment");
        var request = Request();
        request.PaymentCategory = category;
        _dango.BeforeSend = () =>
        {
            using var observer = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            Assert.NotNull(observer.Set<PaymentGatewaySubmission>().Single().ProviderReferenceNumber);
        };
        var response = await _router.RequestToPayAsync(request);
        var claim = await _db.Set<PaymentGatewaySubmission>().SingleAsync();
        Assert.Matches($"^DANGO_{category}_[0-9]{{8}}_1$", claim.ProviderReferenceNumber);
        using var sent = JsonDocument.Parse(Assert.Single(_dango.Bodies));
        Assert.Equal(claim.ProviderReferenceNumber, sent.RootElement.GetProperty("referenceNumber").GetString());
        var expectedInternalId = category == "W" ? claim.ProviderReferenceNumber : "collection-1";
        Assert.Equal(expectedInternalId, sent.RootElement.GetProperty("requestId").GetString());
        Assert.Equal(expectedInternalId, request.Reference);
        Assert.Equal(expectedInternalId, claim.Reference);
        Assert.Equal(response, await _router.RequestToPayAsync(request));
        Assert.Single(_dango.Bodies);
        Assert.Single(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
        request.PaymentCategory = category == "U" ? "R" : "U";
        await Assert.ThrowsAsync<InvalidOperationException>(() => _router.RequestToPayAsync(request));
        Assert.Single(_dango.Bodies);
    }

    [Fact]
    public async Task CollectionSequenceIsSharedAcrossPaymentTypesAndCollectoConsumesNone()
    {
        await _router.RequestToPayAsync(Request("collecto-1"));
        Assert.Empty(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
        await _settings.SetAsync("DangoPayment");
        var utility = Request("utility-1");
        utility.PaymentCategory = "U";
        await _router.RequestToPayAsync(utility);
        var rent = Request("rent-1");
        rent.PaymentCategory = "R";
        await _router.RequestToPayAsync(rent);
        var claims = await _db.Set<PaymentGatewaySubmission>().Where(x => x.Provider == "DangoPayment").OrderBy(x => x.Reference).ToListAsync();
        Assert.EndsWith("_2", claims.Single(x => x.Reference == "rent-1").ProviderReferenceNumber);
        Assert.EndsWith("_1", claims.Single(x => x.Reference == "utility-1").ProviderReferenceNumber);
        Assert.Equal(2, await _db.Set<DangoPaymentReferenceAllocation>().CountAsync());
    }

    [Fact]
    public async Task InvalidCategoryIsRejectedBeforeAllocationOrSubmission()
    {
        await _settings.SetAsync("DangoPayment");
        var request = Request();
        request.PaymentCategory = "X";
        await Assert.ThrowsAsync<ArgumentException>(() => _router.RequestToPayAsync(request));
        Assert.Empty(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
        Assert.Empty(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
        Assert.Empty(_dango.Bodies);
    }

    [Fact]
    public void PaymentCategoryIsNotAddedToCollectoWireContract()
    {
        var request = Request();
        request.PaymentCategory = "U";
        var json = JsonSerializer.Serialize(request);
        Assert.DoesNotContain("PaymentCategory", json);
    }

    [Theory]
    [InlineData("Collecto", "U")]
    [InlineData("Collecto", "R")]
    [InlineData("Collecto", "W")]
    [InlineData("DangoPayment", "U")]
    [InlineData("DangoPayment", "R")]
    [InlineData("DangoPayment", "W")]
    public async Task IssuedCollectionIdsAreUsedUnchangedByEitherProvider(string provider, string category)
    {
        await _settings.SetAsync(provider);
        var id = await CollectionTransactionIds.CreateAsync(_db, category);
        var request = Request(id);
        request.PaymentCategory = category;
        await _router.RequestToPayAsync(request);
        var claim = await _db.Set<PaymentGatewaySubmission>().SingleAsync();
        Assert.Equal(id, request.Reference);
        Assert.Equal(id, claim.Reference);
        if (provider == "DangoPayment")
        {
            Assert.Equal(id, claim.ProviderReferenceNumber);
            using var body = JsonDocument.Parse(Assert.Single(_dango.Bodies));
            Assert.Equal(id, body.RootElement.GetProperty("referenceNumber").GetString());
            Assert.Equal(id, body.RootElement.GetProperty("requestId").GetString());
            Assert.Empty(_collecto.Bodies);
        }
        else
        {
            using var body = JsonDocument.Parse(Assert.Single(_collecto.Bodies));
            Assert.Equal(id, body.RootElement.GetProperty("reference").GetString());
            Assert.Empty(_dango.Bodies);
        }
        Assert.Single(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
    }

    [Theory]
    [InlineData("Collecto")]
    [InlineData("DangoPayment")]
    public async Task WalletTopupClientReferenceResolvesToOneCanonicalIdAndCannotBeDoubleSubmitted(string provider)
    {
        await _settings.SetAsync(provider);
        var request = Request("original-wallet-client-ref");
        request.PaymentCategory = "W";
        var first = await _router.RequestToPayAsync(request);
        Assert.Matches("^DANGO_W_[0-9]{8}_1$", request.Reference);
        var retry = Request("original-wallet-client-ref");
        retry.PaymentCategory = "W";
        Assert.Equal(first, await _router.RequestToPayAsync(retry));
        Assert.Equal(request.Reference, retry.Reference);
        Assert.Single(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
        Assert.Equal(1, _dango.Paths.Count + _collecto.Paths.Count);
        await _settings.SetAsync(provider == "Collecto" ? "DangoPayment" : "Collecto");
        await _router.GetRequestToPayStatusAsync(new() { TransactionId = "original-wallet-client-ref" });
        Assert.Equal(2, (provider == "DangoPayment" ? _dango : _collecto).Paths.Count);
        Assert.Single(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
        var altered = Request("original-wallet-client-ref", amount: 2000);
        altered.PaymentCategory = "W";
        await Assert.ThrowsAsync<InvalidOperationException>(() => _router.RequestToPayAsync(altered));
    }

    [Fact]
    public async Task PreviouslySubmittedWalletCollectionIsNotRenamedOrResent()
    {
        _db.Set<PaymentGatewaySubmission>().Add(new()
        {
            Id = PaymentGatewayRouter.SubmissionId("Collection", "legacy-wallet-id"),
            Operation = "Collection", Reference = "legacy-wallet-id", Provider = "Collecto", Response = "original-response"
        });
        await _db.SaveChangesAsync();
        await _settings.SetAsync("DangoPayment");
        var request = Request("legacy-wallet-id");
        request.PaymentCategory = "W";
        Assert.Equal("original-response", await _router.RequestToPayAsync(request));
        Assert.Equal("legacy-wallet-id", request.Reference);
        Assert.Empty(await _db.Set<CollectionTransactionIdentity>().ToListAsync());
        Assert.Empty(_dango.Paths);
        Assert.Empty(_collecto.Paths);
    }

    [Fact]
    public async Task ExternalTopupApiReturnsCanonicalIdInsteadOfCallersReference()
    {
        var service = new ExternalPaymentService(new HttpClient(), _configuration, _router, _db);
        var dto = new Domain.Dtos.Payments.PayInRequestDto
        {
            Gateway = "collecto", Amount = 1000, Reference = "external-ref",
            Metadata = new() { ["phone"] = "256770000001" }
        };
        var first = await service.InitiatePayInAsync(dto);
        Assert.Matches("^DANGO_W_[0-9]{8}_1$", first.TransactionId);
        Assert.Equal(first.TransactionId, (await service.InitiatePayInAsync(dto)).TransactionId);
        Assert.Single(_collecto.Paths);
        Assert.Equal(first.TransactionId, (await service.GetPayInStatusAsync("external-ref")).TransactionId);
    }

    [Fact]
    public async Task DirectWalletCollectionEndpointExposesCanonicalTransactionIdInHeader()
    {
        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext
        {
            User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity([
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Administrator")], "Test"))
        };
        var controller = new API.Controllers.CollectoApi.MobileMoneyController(_router, null!)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext { HttpContext = context }
        };
        var request = Request("direct-topup-ref");
        request.PaymentCategory = "W";
        Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(await controller.RequestToPay(request));
        Assert.Matches("^DANGO_W_[0-9]{8}_1$", context.Response.Headers["X-Transaction-Id"].ToString());
        Assert.Equal(request.Reference, context.Response.Headers["X-Transaction-Id"].ToString());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DatedWithdrawalIdIsUsedForDangoSubmissionAndEveryStatusLookup(bool bank)
    {
        await _settings.SetAsync("DangoPayment");
        var id = await DangoReferenceNumberAllocator.AllocateAsync(_db, "W", DateTime.UtcNow);
        if (bank)
        {
            var request = new InitiatePayoutBankRequestDto
            {
                gateway = "bank", reference = id, bankSwiftCode = "TESTUGKA", bankName = "Test Bank",
                accountNumber = "123456", accountName = "Test Recipient", phone = "0770000001", amount = 10000, message = "Test"
            };
            await _router.InitiateBankPayoutAsync(request);
            await _router.InitiateBankPayoutAsync(request);
            Assert.EndsWith("bank-transfer-cash-out", Assert.Single(_dango.Paths));
        }
        else
        {
            var request = MobilePayout();
            request.Reference = id;
            await _router.InitiatePayoutAsync(request);
            await _router.InitiatePayoutAsync(request);
            Assert.EndsWith("mobile-transfer-cash-out", Assert.Single(_dango.Paths));
        }
        using (var submission = JsonDocument.Parse(Assert.Single(_dango.Bodies)))
            Assert.Equal(id, submission.RootElement.GetProperty("requestId").GetString());
        await _settings.SetAsync("Collecto");
        await _router.GetPayoutStatusAsync(new() { Gateway = bank ? "bank" : "mobilemoney", Reference = id });
        using var status = JsonDocument.Parse(_dango.Bodies.Last());
        Assert.Equal(id, status.RootElement.GetProperty("requestId").GetString());
        Assert.EndsWith("get-transaction-status", _dango.Paths.Last());
        Assert.Empty(_collecto.Paths);
        Assert.Single(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
    }

    private sealed class RecordingLogger : ILogger<PaymentGatewayRouter>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Messages.Add(formatter(state, exception));
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<string> Paths { get; } = [];
        public List<string> Bodies { get; } = [];
        public bool Timeout { get; set; }
        public Action? BeforeSend { get; set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            BeforeSend?.Invoke();
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
