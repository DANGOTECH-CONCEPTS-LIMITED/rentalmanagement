using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Tests;

public class NwscBillPaymentTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=nwsc-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private IConfigurationRoot _configuration = null!;
    private PaymentProviderSettingsService _settings = null!;
    private readonly BillHandler _handler = new();

    private AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DangoPayment:BaseUrl"] = "https://dango.test/",
            ["DangoPayment:MerchantCode"] = "merchant", ["DangoPayment:ClientId"] = "client",
            ["DangoPayment:BankCurrency"] = "UGX", ["DangoPayment:BankSortCodes:TESTBIC"] = "12345",
            ["DangoPayment:TransactionStatus:StateField"] = "statusCode",
            ["DangoPayment:TransactionStatus:ReferenceField"] = "requestId",
            ["DangoPayment:TransactionStatus:SuccessValues:0"] = "00"
        }).Build();
        _db.Users.Add(new User { Id = 101, FullName = "Utility Owner", Email = "owner@test", PhoneNumber = "256770000001", SystemRoleId = 4 });
        _db.Wallets.Add(new Wallet { Id = 201, LandlordId = 101, Balance = 0 });
        _db.UtilityMeters.Add(new UtilityMeter
        {
            Id = 301, LandLordId = 101, MeterNumber = "meter-1", NWSCAccount = " 12345678 ",
            NwscRegisteredName = "Registered NWSC Name", LocationOfNwscMeter = "Old NWSC meter location",
            UtilityMeterLocation = "Plot 12, Kampala", CustomerMobile = "0700000001"
        });
        _db.UtilityPayments.Add(new UtilityPayment
        {
            Id = 401, TransactionID = "DANGO_U_20261029_1", MeterNumber = "meter-1", Amount = 6000, Charges = 600,
            PhoneNumber = "256770000001", Status = "SUCCESSFUL AT TELECOM", Description = "Water Payment"
        });
        await _db.SaveChangesAsync();
        _settings = new PaymentProviderSettingsService(_db, _configuration);
        await _settings.SetAsync("DangoPayment",
            mobileNetworks: [new("MTN", ["25677"], "MTN"), new("Airtel", ["25670"], "AIRTEL")]);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private BillPaymentProcessingService Processor(AppDbContext db) =>
        new(db, new DangoPaymentClient(new HttpClient(_handler), _configuration), NullLogger<BillPaymentProcessingService>.Instance);

    private async Task ConfigureBillerAsync(bool enabled = true, string serviceId = "NWSC")
    {
        await _settings.SetBillerAsync(new(serviceId, "BILLPAY", "PROD", "TIN1", "", "", "Kampala", "NWSC bill payment", enabled));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("N/A")]
    [InlineData(" n/a ")]
    public void AccountsWithoutRealNwscNumberDoNotTriggerBills(string? account)
        => Assert.False(BillPaymentSchedulingService.RequiresBillPayment(account));

    [Theory]
    [InlineData("12345678")]
    [InlineData(" 12345678 ")]
    [InlineData("NA123")]
    public void RealNwscAccountsTriggerBills(string account)
        => Assert.True(BillPaymentSchedulingService.RequiresBillPayment(account));

    [Fact]
    public async Task CreditingUtilityCreatesInstructionOnlyWhenDangoActiveAndBillerEnabled()
    {
        await ConfigureBillerAsync(enabled: false);
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        Assert.Empty(await _db.Set<BillPaymentInstruction>().ToListAsync());

        _db.UtilityPayments.Add(new UtilityPayment
        {
            Id = 402, TransactionID = "DANGO_U_20261029_2", MeterNumber = "meter-1", Amount = 6000,
            PhoneNumber = "256770000001", Status = "SUCCESSFUL AT TELECOM", Description = "Water Payment"
        });
        await _db.SaveChangesAsync();
        await ConfigureBillerAsync();
        await using (var retry = Context())
            await new CollectionWalletCreditService(retry, _settings).CreditUtilityAsync(402);

        var instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal(402, instruction.UtilityPaymentId);
        Assert.Equal("12345678", instruction.NwscAccount);
        Assert.Equal(6000m, instruction.Amount);
        Assert.Equal("PENDING_SUBMISSION", instruction.Status);
        Assert.Matches("^DANGO_B_[0-9]{8}_1$", instruction.RequestReference);
        Assert.Equal(12000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
        Assert.Equal(2, await _db.WalletTransactions.AsNoTracking().CountAsync());
    }

    [Fact]
    public async Task InactiveDangoProviderOrMissingAccountCreatesNoInstruction()
    {
        await ConfigureBillerAsync();
        await _settings.SetAsync("Collecto");
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        Assert.Empty(await _db.Set<BillPaymentInstruction>().ToListAsync());
        await _settings.SetAsync("DangoPayment");
        await _db.UtilityMeters.ExecuteUpdateAsync(s => s.SetProperty(x => x.NWSCAccount, "N/A"));
        await using var retry = Context();
        await new CollectionWalletCreditService(retry, _settings).CreditUtilityAsync(401);
        Assert.Empty(await _db.Set<BillPaymentInstruction>().ToListAsync());
    }

    [Fact]
    public async Task ProcessorSubmitsBillThenDebitsUtilityWalletOnlyOnConfirmedSuccess()
    {
        await ConfigureBillerAsync();
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        _handler.BillBody = """{"statusCode":"00","statusDescription":"Successful","requestReference":"{ref}","flexipayRefNum":"FP-1"}""";
        _handler.StatusBody = """{"statusCode":"00","statusDescription":"Successful","requestReference":"{ref}","receiptNumber":"RCPT-1","flexipayRefNum":"FP-1"}""";
        Assert.Equal(1, await Processor(_db).ProcessAsync(CancellationToken.None));
        var instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal("PENDING_CONFIRMATION", instruction.Status);
        Assert.Equal(6000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
        using (var sent = JsonDocument.Parse(_handler.BillRequests.Single()))
        {
            Assert.Equal("12345678", sent.RootElement.GetProperty("customerId").GetString());
            Assert.Equal("6000", sent.RootElement.GetProperty("amount").GetString());
            Assert.Equal("NWSC", sent.RootElement.GetProperty("serviceId").GetString());
            Assert.Equal(instruction.RequestReference, sent.RootElement.GetProperty("requestReference").GetString());
            Assert.Equal("Registered NWSC Name", sent.RootElement.GetProperty("customerName").GetString());
            Assert.Equal("256700000001", sent.RootElement.GetProperty("customerMobile").GetString());
            Assert.Equal("Plot 12, Kampala", sent.RootElement.GetProperty("location").GetString());
        }

        Assert.Equal(1, await Processor(_db).ProcessAsync(CancellationToken.None));
        instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal("SUCCESSFUL", instruction.Status);
        Assert.NotNull(instruction.WalletDebitedAtUtc);
        Assert.Equal("RCPT-1", instruction.ProviderReference);
        var wallet = await _db.Wallets.AsNoTracking().SingleAsync();
        Assert.Equal(0m, wallet.Balance);
        var debit = await _db.WalletTransactions.AsNoTracking().SingleAsync(x => x.Amount < 0);
        Assert.Equal(-6000m, debit.Amount);
        Assert.Equal(instruction.RequestReference, debit.TransactionId);

        // Neither a repeated confirmation nor a resubmission may debit twice.
        Assert.Equal(0, await Processor(_db).ProcessAsync(CancellationToken.None));
        Assert.Equal(0m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
        Assert.Single(_handler.BillRequests);
    }

    [Fact]
    public async Task BillerCustomerValidationReturnsRegisteredCustomerName()
    {
        await ConfigureBillerAsync();
        var biller = await _db.Set<DangoBillerSetting>().AsNoTracking().SingleAsync();
        var client = new DangoPaymentClient(new HttpClient(_handler), _configuration);

        var result = await client.ValidateBillerCustomerAsync("DANGO_V_20261029_1", "12345678", biller);

        Assert.Equal("DDAMBA WILSON", result.CustomerName);
        using (var sent = JsonDocument.Parse(_handler.CustomerValidationRequests.Single()))
        {
            Assert.Equal("presentment", sent.RootElement.GetProperty("transtype").GetString());
            Assert.Equal("12345678", sent.RootElement.GetProperty("customerId").GetString());
            Assert.Equal("NWSC", sent.RootElement.GetProperty("serviceId").GetString());
            Assert.Equal("Kampala", sent.RootElement.GetProperty("location").GetString());
            Assert.Equal("", sent.RootElement.GetProperty("customerMobile").GetString());
            Assert.Equal("DANGO_V_20261029_1", sent.RootElement.GetProperty("requestReference").GetString());
            Assert.Equal("DANGO_V_20261029_1", sent.RootElement.GetProperty("requestId").GetString());
        }
    }

    [Theory]
    [InlineData("57")]
    [InlineData("01")]
    public async Task ConfirmedBillFailureMarksInstructionFailedWithoutDebiting(string code)
    {
        await ConfigureBillerAsync();
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        _handler.StatusBody = $$"""{"statusCode":"{{code}}","statusDescription":"FAILED","requestReference":"{ref}"}""";
        _configuration["DangoPayment:TransactionStatus:FailureValues:0"] = code;
        await Processor(_db).ProcessAsync(CancellationToken.None);
        await Processor(_db).ProcessAsync(CancellationToken.None);
        var instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal("FAILED", instruction.Status);
        Assert.Equal(6000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
        Assert.DoesNotContain(await _db.WalletTransactions.ToListAsync(), x => x.Amount < 0);
    }

    [Fact]
    public async Task UnknownOrUncorrelatedStatusRemainsPending()
    {
        await ConfigureBillerAsync();
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        _handler.StatusBody = """{"statusCode":"00","statusDescription":"Successful","requestReference":"different"}""";
        await Processor(_db).ProcessAsync(CancellationToken.None);
        await Processor(_db).ProcessAsync(CancellationToken.None);
        var instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal("PENDING_CONFIRMATION", instruction.Status);
        Assert.Equal(6000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
    }

    [Fact]
    public async Task MissingWalletAtConfirmationRecordsPaidUndebitedInsteadOfNegativeBalance()
    {
        await ConfigureBillerAsync();
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        await _db.Wallets.ExecuteDeleteAsync();
        await Processor(_db).ProcessAsync(CancellationToken.None);
        await Processor(_db).ProcessAsync(CancellationToken.None);
        var instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal("PAID_UNDEBITED", instruction.Status);
        Assert.Contains("wallet", instruction.Reason, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(await _db.WalletTransactions.Where(x => x.Amount < 0).ToListAsync());
    }

    [Fact]
    public async Task BillerConfigurationRequiresBothIdentifiersAndIsAdminOnly()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SetBillerAsync(new("", "BILLPAY", null, null, null, null, null, null, true)));
        await Assert.ThrowsAsync<ArgumentException>(() => _settings.SetBillerAsync(new("NWSC", "", null, null, null, null, null, null, true)));
        var saved = await _settings.SetBillerAsync(new(" NWSC ", "BILLPAY", null, null, null, null, null, null, false));
        Assert.True(saved.Configured);
        Assert.False(saved.AutoBillPaymentsEnabled);
        Assert.Equal("NWSC", saved.ServiceId);
        var authorization = typeof(API.Controllers.PaymentProviderSettingsController)
            .GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), false)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Single();
        Assert.Equal("Administrator", authorization.Roles);
    }

    [Fact]
    public async Task MeterLocationFallsBackToConfiguredBillerLocationButNeverSendsBlank()
    {
        await ConfigureBillerAsync();
        await _db.UtilityMeters.ExecuteUpdateAsync(s => s.SetProperty(x => x.UtilityMeterLocation, (string?)null));
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        await Processor(_db).ProcessAsync(CancellationToken.None);
        using (var sent = JsonDocument.Parse(_handler.BillRequests.Single()))
            Assert.Equal("Kampala", sent.RootElement.GetProperty("location").GetString());

        await _db.Set<BillPaymentInstruction>().ExecuteDeleteAsync();
        await _settings.SetBillerAsync(new("NWSC", "BILLPAY", null, null, null, null, null, null, true));
        _db.UtilityPayments.Add(new UtilityPayment
        {
            Id = 402, TransactionID = "DANGO_U_20261029_2", MeterNumber = "meter-1", Amount = 5000,
            PhoneNumber = "256770000001", Status = "SUCCESSFUL AT TELECOM"
        });
        await _db.SaveChangesAsync();
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(402);
        await Processor(_db).ProcessAsync(CancellationToken.None);
        var instruction = await _db.Set<BillPaymentInstruction>().AsNoTracking().SingleAsync();
        Assert.Equal("FAILED", instruction.Status);
        Assert.Contains("location", instruction.Reason, StringComparison.OrdinalIgnoreCase);
        Assert.Single(_handler.BillRequests);
    }

    [Fact]
    public async Task AdministratorCanListBillPaymentsByStatusReferenceAccountOrMeter()
    {
        await ConfigureBillerAsync();
        await new CollectionWalletCreditService(_db, _settings).CreditUtilityAsync(401);
        var service = new AdminPayoutReconciliationService(_db,
            new DangoPaymentClient(new HttpClient(_handler), _configuration));
        var page = await service.GetBillPaymentsAsync(null, "PENDING_SUBMISSION", 1, 20, CancellationToken.None);
        var item = Assert.Single(page.Items);
        Assert.Equal("12345678", item.NwscAccount);
        Assert.Equal(6000m, item.Amount);
        Assert.Equal("meter-1", item.MeterNumber);
        Assert.Null(item.WalletDebitedAtUtc);
        Assert.Single((await service.GetBillPaymentsAsync(item.RequestReference, null, 1, 20, CancellationToken.None)).Items);
        Assert.Single((await service.GetBillPaymentsAsync("12345678", null, 1, 20, CancellationToken.None)).Items);
        Assert.Single((await service.GetBillPaymentsAsync("meter-1", null, 1, 20, CancellationToken.None)).Items);
        Assert.Empty((await service.GetBillPaymentsAsync(null, "SUCCESSFUL", 1, 20, CancellationToken.None)).Items);
        await Assert.ThrowsAsync<ArgumentException>(() => service.GetBillPaymentsAsync(null, null, 0, 20, CancellationToken.None));
        var method = typeof(API.Controllers.AdminPayoutReconciliationController).GetMethod("GetBillPayments")!;
        Assert.Equal("/api/AdminBillPayments", method.GetCustomAttributes(typeof(Microsoft.AspNetCore.Mvc.HttpGetAttribute), false)
            .Cast<Microsoft.AspNetCore.Mvc.HttpGetAttribute>().Single().Template);
    }

    public sealed class BillHandler : HttpMessageHandler
    {
        public string BillBody { get; set; } = """{"statusCode":"00","statusDescription":"Accepted","requestReference":"{ref}"}""";
        public string StatusBody { get; set; } = """{"statusCode":"00","statusDescription":"Successful","requestReference":"{ref}"}""";
        public string CustomerValidationBody { get; set; } = """{"statusCode":"00","statusDescription":"Biller Details Fetched Successfully","requestReference":"{ref}","customerName":"DDAMBA WILSON","paymentMode":"any","amount":"-8872"}""";
        public List<string> BillRequests { get; } = [];
        public List<string> CustomerValidationRequests { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = await request.Content!.ReadAsStringAsync(ct);
            using var document = JsonDocument.Parse(body);
            var reference = document.RootElement.TryGetProperty("requestReference", out var r) ? r.GetString()! : "";
            var path = request.RequestUri!.AbsolutePath;
            string payload;
            if (path.EndsWith("bill-payment"))
            {
                BillRequests.Add(body);
                payload = BillBody.Replace("{ref}", reference);
            }
            else if (path.EndsWith("bill-payment-status"))
            {
                payload = StatusBody.Replace("{ref}", reference);
            }
            else if (path.EndsWith("biller-customer-validation"))
            {
                CustomerValidationRequests.Add(body);
                payload = CustomerValidationBody.Replace("{ref}", reference);
            }
            else throw new InvalidOperationException("Unexpected endpoint " + path);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(payload, Encoding.UTF8, "application/json") };
        }
    }
}
