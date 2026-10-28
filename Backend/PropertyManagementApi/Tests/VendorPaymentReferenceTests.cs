using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.ServiceLogs;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.BackgroundServices;
using Infrastructure.Services.PaymentServices;
using Infrastructure.Services.ServiceLogs;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Reflection;

namespace Tests;

public class VendorPaymentReferenceTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;
    private ServiceProvider _services = null!;
    private ICollectoApiClient _gateway = null!;
    private const string TransactionId = "DANGO_U_20261028_1";

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _db.UtilityPayments.Add(new UtilityPayment
        {
            TransactionID = TransactionId, Amount = 1000, MeterNumber = "test-meter", PhoneNumber = "256770000001", Status = "PENDING"
        });
        await _db.SaveChangesAsync();
        _gateway = DispatchProxy.Create<ICollectoApiClient, GatewayResponse>();
        _services = new ServiceCollection()
            .AddSingleton<IPaymentService>(new PaymentService(_db, null!))
            .AddSingleton(_gateway)
            .AddSingleton<IServiceLogsRepository>(new ServiceLogsRepository(_db))
            .BuildServiceProvider();
    }

    public async Task DisposeAsync()
    {
        await _services.DisposeAsync();
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private void Response(string json) => ((GatewayResponse)(object)_gateway).Json = json;

    private async Task CheckStatus(string previousReference = "", string transactionType = "UTILITY")
    {
        var processor = new CheckPaymentStatusProcessor(NullLogger<CheckPaymentStatusProcessor>.Instance,
            _services.GetRequiredService<IServiceScopeFactory>());
        await (Task)typeof(CheckPaymentStatusProcessor).GetMethod("ProcessStatusAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(processor, [TransactionId, previousReference, transactionType, "MOMO", CancellationToken.None])!;
        Assert.Empty(await _db.ServiceLogs.ToListAsync());
    }

    [Theory]
    [InlineData("provider-123", "provider-123")]
    [InlineData("", "")]
    public async Task SubmissionStoresProviderReferenceRatherThanInternalId(string vendorReference, string expected)
    {
        Response(System.Text.Json.JsonSerializer.Serialize(new
        {
            status = 200, data = new { requestToPay = true, transactionId = TransactionId, vendorReference }
        }));
        var processor = new PaymentProcessor(NullLogger<PaymentProcessor>.Instance, _services.GetRequiredService<IServiceScopeFactory>());
        await (Task)typeof(PaymentProcessor).GetMethod("HandleMomoAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(processor, [TransactionId, "256770000001", 1000m, _gateway, _services.GetRequiredService<IPaymentService>(), "UTILITY"])!;
        var row = await _db.UtilityPayments.SingleAsync();
        Assert.Equal(expected, row.VendorTranId ?? "");
        Assert.Equal(TransactionId, row.TransactionID);
        Assert.Equal("PENDING AT TELCOM", row.Status);
    }

    [Theory]
    [InlineData("SUCCESSFUL", "SUCCESSFUL AT TELECOM")]
    [InlineData("FAILED", "FAILED AT TELECOM")]
    [InlineData("PENDING", "PENDING AT TELCOM")]
    public async Task StatusRefreshesProviderReferenceIncludingWhilePending(string status, string expectedStatus)
    {
        Response(System.Text.Json.JsonSerializer.Serialize(new
        {
            data = new { requestToPayStatus = true, status, transactionId = TransactionId, vendorReference = "remote-final-reference" }
        }));
        await CheckStatus(TransactionId);
        var row = await _db.UtilityPayments.SingleAsync();
        Assert.Equal("remote-final-reference", row.VendorTranId);
        Assert.Equal(TransactionId, row.TransactionID);
        Assert.Equal(expectedStatus, row.Status);
    }

    [Fact]
    public async Task MissingProviderReferenceDoesNotOverwriteKnownReferenceWithInternalId()
    {
        var row = await _db.UtilityPayments.SingleAsync();
        row.VendorTranId = "known-provider-ref";
        await _db.SaveChangesAsync();
        Response(System.Text.Json.JsonSerializer.Serialize(new
        {
            data = new { requestToPayStatus = true, status = "SUCCESSFUL", transactionId = TransactionId, vendorReference = "" }
        }));
        await CheckStatus("known-provider-ref");
        Assert.Equal("known-provider-ref", row.VendorTranId);
    }

    [Fact]
    public async Task CollectoWithoutNormalizedReferenceStillUsesItsReturnedTransactionId()
    {
        Response("""{"data":{"requestToPayStatus":true,"status":"SUCCESSFUL","transactionId":123456}}""");
        await CheckStatus();
        Assert.Equal("123456", (await _db.UtilityPayments.SingleAsync()).VendorTranId);
    }

    [Theory]
    [InlineData("PENDING", "provider-987", "provider-987", "PENDING AT TELCOM")]
    [InlineData("SUCCESSFUL", "provider-987", "provider-987", "SUCCESSFUL")]
    [InlineData("PENDING", "", "previous-provider-ref", "PENDING AT TELCOM")]
    [InlineData("SUCCESSFUL", "", "previous-provider-ref", "SUCCESSFUL")]
    public async Task WalletPayoutStatusStoresOnlyProviderReferenceAndPreservesItWhenOmitted(
        string status, string vendorReference, string expectedReference, string expectedStatus)
    {
        _db.Users.Add(new User { Id = 101, Email = "owner@test", SystemRoleId = 2 });
        var wallet = new Wallet { Id = 201, LandlordId = 101, Balance = 1000 };
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Wallet = wallet, TransactionId = TransactionId, Amount = -100, Status = "PENDING AT TELCOM",
            VendorTranId = "previous-provider-ref", Description = "Test payout"
        });
        await _db.SaveChangesAsync();
        Response(System.Text.Json.JsonSerializer.Serialize(new
        {
            status = 200, data = new
            {
                payout = true, data = new[] { new { status, transaction_id = TransactionId, vendorReference } }
            }
        }));
        await CheckStatus("previous-provider-ref", "WALLET");
        var transaction = await _db.WalletTransactions.SingleAsync();
        Assert.Equal(expectedReference, transaction.VendorTranId);
        Assert.Equal(expectedStatus, transaction.Status);
        Assert.Equal(TransactionId, transaction.TransactionId);
        Assert.Equal(1000m, wallet.Balance);
    }

    [Fact]
    public async Task FailedPayoutStatusRefundsWalletAndRepeatedStatusCannotRefundTwice()
    {
        _db.Users.Add(new User { Id = 101, Email = "owner@test", SystemRoleId = 2 });
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Wallet = new Wallet { Id = 201, LandlordId = 101, Balance = 4000 },
            TransactionId = TransactionId, Amount = -1000, Status = "PENDING AT THE BANK"
        });
        await _db.SaveChangesAsync();
        Response(System.Text.Json.JsonSerializer.Serialize(new
        {
            status = 400, data = new
            {
                payout = true, data = new[] { new
                {
                    status = "FAILED", transaction_id = TransactionId, vendorReference = "",
                    status_message = "Invalid requestId"
                } }
            }
        }));
        await CheckStatus("", "WALLET");
        await CheckStatus("", "WALLET");
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Single(await _db.WalletTransactions.Where(x => x.Status == "REVERSAL").ToListAsync());
        Assert.Equal("REVERSED", (await _db.WalletTransactions.SingleAsync(x => x.TransactionId == TransactionId)).Status);
    }

    [Theory]
    [InlineData("MOMO")]
    [InlineData("BANK")]
    public async Task FailedStatusPersistsNewProviderReferenceOnOriginalPayoutBeforeReversal(string gateway)
    {
        _db.Users.Add(new User { Id = 101, Email = "owner@test", SystemRoleId = 2 });
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Wallet = new Wallet { Id = 201, LandlordId = 101, Balance = 4000 },
            TransactionId = TransactionId, Amount = -1000,
            Status = gateway == "BANK" ? "PENDING AT THE BANK" : "PENDING AT TELCOM", VendorTranId = ""
        });
        await _db.SaveChangesAsync();
        Response(System.Text.Json.JsonSerializer.Serialize(new
        {
            status = 200, data = new { payout = true, data = new[] { new
            {
                status = "FAILED", transaction_id = TransactionId, vendorReference = "932096650006", status_message = "FAILED"
            } } }
        }));
        var processor = new CheckPaymentStatusProcessor(NullLogger<CheckPaymentStatusProcessor>.Instance,
            _services.GetRequiredService<IServiceScopeFactory>());
        await (Task)typeof(CheckPaymentStatusProcessor).GetMethod("ProcessStatusAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(processor, [TransactionId, "", "WALLET", gateway, CancellationToken.None])!;
        var original = await _db.WalletTransactions.AsNoTracking().SingleAsync(x => x.TransactionId == TransactionId);
        Assert.Equal("REVERSED", original.Status);
        Assert.Equal("932096650006", original.VendorTranId);
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Equal(TransactionId, (await _db.WalletTransactions.SingleAsync(x => x.Status == "REVERSAL")).VendorTranId);
        Assert.Empty(await _db.ServiceLogs.ToListAsync());
    }

    [Fact]
    public async Task SuccessfulBankStatusSavesReturnedReferenceOnOriginalWalletPayout()
    {
        _db.Users.Add(new User { Id = 101, Email = "owner@test", SystemRoleId = 2 });
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Wallet = new Wallet { Id = 201, LandlordId = 101, Balance = 4000 },
            TransactionId = TransactionId, Amount = -1000, Status = "PENDING AT THE BANK"
        });
        await _db.SaveChangesAsync();
        var configuration = new Microsoft.Extensions.Configuration.ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DangoPayment:BaseUrl"] = "https://test.invalid/", ["DangoPayment:ClientId"] = "test",
            ["DangoPayment:TransactionStatus:StateField"] = "statusCode",
            ["DangoPayment:TransactionStatus:ReferenceField"] = "requestId",
            ["DangoPayment:TransactionStatus:SuccessValues:0"] = "00"
        }).Build();
        var client = new DangoPaymentClient(new HttpClient(new SuccessfulBankHandler()), configuration);
        Response(await client.GetPayoutStatusAsync(new() { Reference = TransactionId, Gateway = "bank" }));
        var processor = new CheckPaymentStatusProcessor(NullLogger<CheckPaymentStatusProcessor>.Instance,
            _services.GetRequiredService<IServiceScopeFactory>());
        await (Task)typeof(CheckPaymentStatusProcessor).GetMethod("ProcessStatusAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(processor, [TransactionId, "", "WALLET", "BANK", CancellationToken.None])!;
        var row = await _db.WalletTransactions.AsNoTracking().SingleAsync();
        Assert.Equal("SUCCESSFUL AT THE BANK", row.Status);
        Assert.Equal("932211150001", row.VendorTranId);
        Assert.Equal(TransactionId, row.TransactionId);
        Assert.Equal(4000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Empty(await _db.ServiceLogs.ToListAsync());
    }

    private sealed class SuccessfulBankHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new
                {
                    statusCode = "00", statusDescription = "Successful", requestId = TransactionId,
                    flexipayReferenceNumber = "932211150001"
                }))
            });
    }

    public class GatewayResponse : DispatchProxy
    {
        public string Json { get; set; } = "{}";
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => Task.FromResult(Json);
    }
}
