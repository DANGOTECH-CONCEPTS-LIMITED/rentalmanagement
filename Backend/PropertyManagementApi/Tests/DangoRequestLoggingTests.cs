using Application.Interfaces.Settings;
using Domain.Dtos.Collecto;
using Domain.Dtos.HtpRequestsResponse;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Infrastructure.Services.Collecto;
using Infrastructure.Services.PaymentServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using System.Net;
using System.Text;

namespace Tests;

public class DangoRequestLoggingTests
{
    [Fact]
    public async Task DangoCallsArePersistedThroughTheSameHttpLoggingHandlerAsCollecto()
    {
        var handler = new StubHandler();
        var settings = new RecordingSettings();
        using var services = new ServiceCollection().AddSingleton<ISettings>(settings).BuildServiceProvider();
        var logging = new LoggingHandler(NullLogger<LoggingHandler>.Instance,
            services.GetRequiredService<IServiceScopeFactory>()) { InnerHandler = handler };
        var client = new DangoPaymentClient(new HttpClient(logging), Configuration());

        var raw = await client.InitiateBankPayoutAsync(new InitiatePayoutBankRequestDto
        {
            gateway = "bank", reference = "DANGO_W_20261028_9", bankSwiftCode = "TESTBIC", bankName = "Test Bank",
            accountNumber = "123456", accountName = "Recipient", phone = "0770000001", amount = 6000m, message = "Payout"
        });
        Assert.Contains("932211150001", raw);

        var logged = Assert.Single(settings.Writes);
        Assert.Equal("POST", logged.RequestType);
        Assert.Equal("https://payments.example/api/Stanbic/bank-transfer-cash-out", logged.RequestUrl);
        Assert.Contains("api/Stanbic/bank-transfer-cash-out", logged.Request);
        Assert.Contains("\"requestId\":\"DANGO_W_20261028_9\"", logged.Request);
        Assert.Contains("\"amount\":\"6000\"", logged.Request);
        Assert.Contains("\"network\":\"BANK\"", logged.Request);
        Assert.Contains("\"destination\":\"BANK\"", logged.Request);
        Assert.Contains("Request", logged.Request);
        Assert.Contains("932211150001", logged.Response);
        Assert.Equal("OK", logged.Status);
    }

    [Fact]
    public async Task FailedDangoResponsesAreAlsoPersistedWithTheirStatusCode()
    {
        var settings = new RecordingSettings();
        using var services = new ServiceCollection().AddSingleton<ISettings>(settings).BuildServiceProvider();
        var logging = new LoggingHandler(NullLogger<LoggingHandler>.Instance,
            services.GetRequiredService<IServiceScopeFactory>())
        { InnerHandler = new StubHandler(HttpStatusCode.BadRequest, "{\"error\":\"bad\"}") };
        var client = new DangoPaymentClient(new HttpClient(logging), Configuration());
        Assert.Contains("HTTP 400", await client.RequestToPayAsync(new()
        {
            PaymentOption = "mobilemoney", Phone = "0770000001", Amount = 6000m, Reference = "DANGO_U_20261028_1"
        }, "MTN", "DANGO_U_20261028_1"));
        var logged = Assert.Single(settings.Writes);
        Assert.Equal("BadRequest", logged.Status);
        Assert.Contains("api/Stanbic/merchant-payment", logged.RequestUrl);
        Assert.Contains("bad", logged.Response);
    }

    private static IConfiguration Configuration() => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["DangoPayment:BaseUrl"] = "https://payments.example/",
        ["DangoPayment:MerchantCode"] = "merchant-test",
        ["DangoPayment:ClientId"] = "configured-client",
        ["DangoPayment:BankCurrency"] = "UGX",
        ["DangoPayment:BankSortCodes:TESTBIC"] = "12345",
        ["DangoPayment:TransactionStatus:StateField"] = "statusCode",
        ["DangoPayment:TransactionStatus:ReferenceField"] = "requestId",
        ["DangoPayment:TransactionStatus:SuccessValues:0"] = "00"
    }).Build();

    private sealed class RecordingSettings : ISettings
    {
        public List<HttpRequesRequestResponseDto> Writes { get; } = [];
        public Task LogHttpRequestResponse(HttpRequesRequestResponseDto dto)
        {
            Writes.Add(dto);
            return Task.CompletedTask;
        }
        public Task<IEnumerable<HttpRequesRequestResponse>> GetRequestResponseByDate(DateTime startdate, DateTime enddate)
            => throw new NotSupportedException();
        public Task<string> SaveFileAndReturnPathAsync(Microsoft.AspNetCore.Http.IFormFile file)
            => throw new NotSupportedException();
    }

    private sealed class StubHandler(HttpStatusCode status = HttpStatusCode.OK,
        string body = """{"statusCode":"00","statusDescription":"Successful","requestId":"DANGO_W_20261028_9","flexipayReferenceNumber":"932211150001"}""")
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            => Task.FromResult(new HttpResponseMessage(status)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            });
    }
}
