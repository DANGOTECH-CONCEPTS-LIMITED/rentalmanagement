using Domain.Dtos.Collecto;
using Infrastructure.Services.PaymentServices;
using Microsoft.Extensions.Configuration;
using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Tests;

public class DangoPaymentClientTests
{
    [Theory]
    [InlineData("0")]
    [InlineData("00")]
    [InlineData("200")]
    [InlineData("SUCCESSFUL")]
    public async Task CollectionSubmissionUsesMerchantEndpointAndStableReferenceButNeverSettles(string code)
    {
        var handler = new StubHandler(_ => Reply($$"""{"statusCode":"{{code}}","statusDescription":"Accepted","requestId":"collection-ref","flexipayReferenceNumber":"remote-ref"}"""));
        var client = Client(handler);

        using var result = JsonDocument.Parse(await client.RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1"));
        var data = result.RootElement.GetProperty("data");
        Assert.True(data.GetProperty("requestToPay").GetBoolean());
        Assert.Equal("PENDING", data.GetProperty("status").GetString());
        Assert.Equal("collection-ref", data.GetProperty("transactionId").GetString());
        Assert.Equal("remote-ref", data.GetProperty("flexipayReferenceNumber").GetString());
        Assert.Equal("remote-ref", data.GetProperty("vendorReference").GetString());
        Assert.Equal("https://payments.example/api/Stanbic/merchant-payment", handler.Url);
        Assert.Equal("test-api-key", handler.ApiKey);
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("collection-ref", sent.RootElement.GetProperty("requestId").GetString());
        Assert.Equal("DANGO_U_20261028_1", sent.RootElement.GetProperty("referenceNumber").GetString());
        Assert.Equal("256770000001", sent.RootElement.GetProperty("msisdn").GetString());
        Assert.Equal("merchant-test", sent.RootElement.GetProperty("merchantCode").GetString());
        Assert.Equal("MTN", sent.RootElement.GetProperty("sourceSystem").GetString());
        Assert.Equal("configured-client", sent.RootElement.GetProperty("clientId").GetString());
    }

    [Theory]
    [InlineData("SUCCESS", "PENDING")]
    [InlineData("SUCCESSFUL", "PENDING")]
    [InlineData("COMPLETED", "PENDING")]
    [InlineData("FAILED", "PENDING")]
    [InlineData("FAILURE", "PENDING")]
    [InlineData("REJECTED", "PENDING")]
    [InlineData("PENDING", "PENDING")]
    [InlineData("PROCESSING", "PENDING")]
    [InlineData("0", "PENDING")]
    [InlineData("00", "SUCCESSFUL")]
    [InlineData("200", "PENDING")]
    [InlineData("91", "PENDING")]
    [InlineData("TEST_FAILURE", "FAILED")]
    public async Task CollectionStatusUsesOnlyVerifiedConfiguredCodes(string code, string expected)
    {
        var handler = new StubHandler(_ => Reply($$"""{"statusCode":"{{code}}","requestId":"collection-ref","referenceNumber":"collection-ref","statusDescription":"Successful request"}"""));
        using var result = JsonDocument.Parse(await Client(handler).GetRequestToPayStatusAsync(new() { TransactionId = "collection-ref" }));
        Assert.Equal(expected, result.RootElement.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal(expected != "PENDING", result.RootElement.GetProperty("data").GetProperty("requestToPayStatus").GetBoolean());
        Assert.Equal("https://payments.example/api/Stanbic/get-transaction-status", handler.Url);
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("collection-ref", sent.RootElement.GetProperty("requestId").GetString());
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("not-json")]
    [InlineData("{\"statusCode\":0,\"statusDescription\":\"Successful\",\"requestId\":\"collection-ref\"}")]
    [InlineData("{\"statusCode\":\"SUCCESSFUL\"}")]
    [InlineData("{\"statusCode\":\"SUCCESSFUL\",\"requestId\":\"different-reference\"}")]
    [InlineData("{\"statusCode\":\"SUCCESSFUL\",\"requestId\":\"collection-ref\",\"referenceNumber\":\"different-reference\"}")]
    public async Task UnparseableUncorrelatedOrUnknownCollectionStatusRemainsPending(string response)
    {
        using var result = JsonDocument.Parse(await Client(new StubHandler(_ => Reply(response)))
            .GetRequestToPayStatusAsync(new() { TransactionId = "collection-ref" }));
        Assert.Equal("PENDING", result.RootElement.GetProperty("data").GetProperty("status").GetString());
    }

    [Fact]
    public async Task MobilePayoutMapsDtoAndKeepsAcceptedTransferPending()
    {
        var handler = new StubHandler(_ => Reply("""{"statusCode":"SUCCESSFUL","requestId":"payout-ref","flexipayReferenceNumber":"remote-ref"}"""));
        using var result = JsonDocument.Parse(await Client(handler).InitiatePayoutAsync(Mobile()));
        Assert.True(result.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal("PENDING", result.RootElement.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal("payout-ref", result.RootElement.GetProperty("data").GetProperty("otherReference").GetString());
        Assert.Equal("https://payments.example/api/Stanbic/mobile-transfer-cash-out", handler.Url);
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("payout-ref", sent.RootElement.GetProperty("requestId").GetString());
        Assert.Equal("256770000001", sent.RootElement.GetProperty("beneficiaryAccount").GetString());
        Assert.Equal("Recipient", sent.RootElement.GetProperty("beneficiaryName").GetString());
        Assert.Equal("256770000002", sent.RootElement.GetProperty("mobileNumber").GetString());
        Assert.Equal("verified-mobile-network", sent.RootElement.GetProperty("network").GetString());
        Assert.Equal("MNO", sent.RootElement.GetProperty("destination").GetString());
    }

    [Fact]
    public async Task BankPayoutUsesConfiguredDomesticSortCodeNotSwiftCode()
    {
        var handler = new StubHandler(_ => Reply("""{"statusCode":"00","requestId":"bank-ref"}"""));
        using var result = JsonDocument.Parse(await Client(handler).InitiateBankPayoutAsync(Bank()));
        Assert.True(result.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal("PENDING", result.RootElement.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal("https://payments.example/api/Stanbic/bank-transfer-cash-out", handler.Url);
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("bank-ref", sent.RootElement.GetProperty("requestId").GetString());
        Assert.Equal("configured-client", sent.RootElement.GetProperty("clientId").GetString());
        Assert.Equal("configured-sort-code", sent.RootElement.GetProperty("bankSortCode").GetString());
        Assert.Equal("Bank account", sent.RootElement.GetProperty("beneficiaryAccount").GetString());
        Assert.Equal("BANK", sent.RootElement.GetProperty("network").GetString());
        Assert.Equal("UGX", sent.RootElement.GetProperty("currency").GetString());
        Assert.Equal("BANK", sent.RootElement.GetProperty("destination").GetString());
    }

    [Theory]
    [InlineData("FAILED", true)]
    [InlineData("REJECTED", true)]
    [InlineData("SUCCESSFUL", true)]
    [InlineData("00", true)]
    [InlineData("TEST_FAILURE", true)]
    public async Task SubmissionCodesNeverTriggerSettlementOrWalletReversal(string code, bool pending)
    {
        using var result = JsonDocument.Parse(await Client(new StubHandler(_ => Reply($$"""{"statusCode":"{{code}}","requestId":"payout-ref"}""")))
            .InitiatePayoutAsync(Mobile()));
        Assert.Equal(pending, result.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal(pending ? "PENDING" : "FAILED", result.RootElement.GetProperty("data").GetProperty("status").GetString());
    }

    [Theory]
    [InlineData(400)]
    [InlineData(429)]
    [InlineData(500)]
    public async Task HttpErrorsCannotCauseWalletReversalOrCollectionSettlement(int status)
    {
        var client = Client(new StubHandler(_ => Reply("""{"statusCode":"FAILED","requestId":"payout-ref"}""", (HttpStatusCode)status)));
        using var result = JsonDocument.Parse(await client.InitiatePayoutAsync(Mobile()));
        Assert.True(result.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal("PENDING", result.RootElement.GetProperty("data").GetProperty("status").GetString());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task TimeoutAndNetworkErrorsKeepStablePendingReferences(bool timeout)
    {
        var client = Client(new StubHandler(_ => throw (timeout ? (Exception)new TaskCanceledException() : new HttpRequestException())));
        using var collection = JsonDocument.Parse(await client.RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1"));
        Assert.True(collection.RootElement.GetProperty("data").GetProperty("requestToPay").GetBoolean());
        Assert.Equal("collection-ref", collection.RootElement.GetProperty("data").GetProperty("transactionId").GetString());
        using var payout = JsonDocument.Parse(await client.InitiatePayoutAsync(Mobile()));
        Assert.True(payout.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal("payout-ref", payout.RootElement.GetProperty("data").GetProperty("otherReference").GetString());
    }

    [Theory]
    [InlineData("mobilemoney", "00", "SUCCESSFUL")]
    [InlineData("bank", "00", "SUCCESSFUL")]
    [InlineData("mobilemoney", "TEST_FAILURE", "FAILED")]
    [InlineData("bank", "TEST_FAILURE", "FAILED")]
    [InlineData("mobilemoney", "PROCESSING", "PENDING")]
    [InlineData("bank", "91", "PENDING")]
    public async Task PayoutStatusPollsOriginalRequestIdAndUsesOnlyConfiguredSettlementContract(string gateway, string remoteState, string expected)
    {
        // 00 is the verified success code; TEST_FAILURE is only a synthetic configured test value.
        var handler = new StubHandler(_ => Reply(JsonSerializer.Serialize(new
        {
            statusCode = remoteState, requestId = "payout-ref"
        })));
        using var result = JsonDocument.Parse(await Client(handler).GetPayoutStatusAsync(new() { Reference = "payout-ref", Gateway = gateway }));
        var data = result.RootElement.GetProperty("data");
        var item = data.GetProperty("data")[0];
        Assert.True(data.GetProperty("payout").GetBoolean());
        Assert.Equal(expected, item.GetProperty("status").GetString());
        Assert.Equal("payout-ref", item.GetProperty("transaction_id").GetString());
        Assert.Equal("https://payments.example/api/Stanbic/get-transaction-status", handler.Url);
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("payout-ref", sent.RootElement.GetProperty("requestId").GetString());
        Assert.Equal("configured-client", sent.RootElement.GetProperty("clientId").GetString());
        Assert.Equal(2, sent.RootElement.EnumerateObject().Count());
    }

    [Theory]
    [InlineData("DangoPayment:TransactionStatus:StateField")]
    [InlineData("DangoPayment:TransactionStatus:ReferenceField")]
    [InlineData("DangoPayment:TransactionStatus:SuccessValues:0")]
    public async Task UnverifiedStatusContractBlocksNewPayoutsBeforeAnyNetworkRequest(string missing)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler, missing);
        Assert.False(client.PayoutStatusConfigured);
        Assert.False(client.MobilePayoutConfigured);
        Assert.False(client.BankPayoutConfigured);
        Assert.Throws<InvalidOperationException>(() => client.ValidatePayout(Mobile()));
        Assert.Throws<InvalidOperationException>(() => client.ValidateBankPayout(Bank()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.InitiatePayoutAsync(Mobile()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.InitiateBankPayoutAsync(Bank()));
        Assert.Null(handler.Url);
        using var result = JsonDocument.Parse(await client.GetPayoutStatusAsync(new() { Reference = "payout-ref", Gateway = "bank" }));
        var item = result.RootElement.GetProperty("data").GetProperty("data")[0];
        Assert.Equal("PENDING", item.GetProperty("status").GetString());
        Assert.Contains("reconciliation", item.GetProperty("status_message").GetString());
    }

    [Theory]
    [InlineData("{\"outcome\":{\"state\":\"PAID\",\"reference\":\"different-ref\"}}")]
    [InlineData("{\"outcome\":{\"state\":\"PAID\"}}")]
    [InlineData("{\"statusCode\":\"00\",\"statusDescription\":\"Successful\"}")]
    [InlineData("not-json")]
    public async Task PayoutSettlementRequiresCorrelatedConfiguredResponseFields(string body)
    {
        using var result = JsonDocument.Parse(await Client(new StubHandler(_ => Reply(body))).GetPayoutStatusAsync(new() { Reference = "payout-ref", Gateway = "bank" }));
        Assert.Equal("PENDING", result.RootElement.GetProperty("data").GetProperty("data")[0].GetProperty("status").GetString());
    }

    [Fact]
    public void PendingSubmissionHelpersPreserveOriginalReferenceAndCannotTriggerReversal()
    {
        using var collection = JsonDocument.Parse(DangoPaymentClient.CreatePendingCollectionResponse("original-reference"));
        using var payout = JsonDocument.Parse(DangoPaymentClient.CreatePendingPayoutResponse("original-reference"));
        Assert.True(collection.RootElement.GetProperty("data").GetProperty("requestToPay").GetBoolean());
        Assert.Equal("original-reference", collection.RootElement.GetProperty("data").GetProperty("transactionId").GetString());
        Assert.True(payout.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal("original-reference", payout.RootElement.GetProperty("data").GetProperty("otherReference").GetString());
        Assert.Equal("PENDING", payout.RootElement.GetProperty("data").GetProperty("status").GetString());
    }

    [Fact]
    public async Task AmountSerializationIsInvariantAndApiKeyIsOptional()
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
            await Client(handler, "DangoPayment:ApiKey").RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1");
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("1234.50", sent.RootElement.GetProperty("amount").GetString());
        Assert.Null(handler.ApiKey);
    }

    [Theory]
    [InlineData("DangoPayment:MerchantCode")]
    [InlineData("DangoPayment:ClientId")]
    public async Task CollectionRequiresRealConfigurationBeforeSending(string missing)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => Client(handler, missing).RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1"));
        Assert.Null(handler.Url);
    }

    [Theory]
    [InlineData("DangoPayment:ClientId")]
    [InlineData("DangoPayment:BankSortCodes:TESTBIC")]
    [InlineData("DangoPayment:BankCurrency")]
    public async Task BankDoesNotInventUnverifiedRoutingSettings(string missing)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => Client(handler, missing).InitiateBankPayoutAsync(Bank()));
        Assert.Null(handler.Url);
    }

    [Fact]
    public async Task CollectoWalletGatewayIsNotSilentlyRedirectedToDango()
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var request = Mobile();
        request.Gateway = "flexipay";
        await Assert.ThrowsAsync<NotSupportedException>(() => Client(handler).InitiatePayoutAsync(request));
        Assert.Null(handler.Url);
    }

    [Theory]
    [InlineData("0770000001")]
    [InlineData("770000001")]
    [InlineData("+256770000001")]
    [InlineData("256770000001")]
    [InlineData(" +256 770-000-001 ")]
    public async Task MobileFieldsAreNormalizedWithoutChangingOriginalRequestDtos(string phone)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler);
        var collection = Collection();
        collection.Phone = phone;
        client.ValidateCollection(collection, "MTN");
        await client.RequestToPayAsync(collection, "MTN", "DANGO_U_20261028_1");
        using (var sent = JsonDocument.Parse(handler.Body!))
        {
            Assert.Equal("256770000001", sent.RootElement.GetProperty("msisdn").GetString());
        }
        Assert.Equal(phone, collection.Phone);

        var mobile = Mobile();
        mobile.Phone = phone;
        mobile.AccountNumber = phone;
        client.ValidatePayout(mobile, "resolved-network");
        await client.InitiatePayoutAsync(mobile, "resolved-network");
        using (var sent = JsonDocument.Parse(handler.Body!))
        {
            Assert.Equal("256770000001", sent.RootElement.GetProperty("mobileNumber").GetString());
            Assert.Equal("256770000001", sent.RootElement.GetProperty("beneficiaryAccount").GetString());
        }
        Assert.Equal(phone, mobile.Phone);
        Assert.Equal(phone, mobile.AccountNumber);

        var bank = Bank();
        bank.phone = phone;
        client.ValidateBankPayout(bank);
        await client.InitiateBankPayoutAsync(bank);
        using (var sent = JsonDocument.Parse(handler.Body!))
        {
            Assert.Equal("256770000001", sent.RootElement.GetProperty("mobileNumber").GetString());
            Assert.Equal("Bank account", sent.RootElement.GetProperty("beneficiaryAccount").GetString());
        }
        Assert.Equal(phone, bank.phone);
    }

    [Theory]
    [InlineData("")]
    [InlineData("25677000000")]
    [InlineData("+254770000001")]
    [InlineData("25677abc0001")]
    public async Task InvalidMobileNumbersAreRejectedBeforeAnySubmission(string phone)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler);
        var collection = Collection();
        collection.Phone = phone;
        Assert.Throws<ArgumentException>(() => client.ValidateCollection(collection, "MTN"));
        await Assert.ThrowsAsync<ArgumentException>(() => client.RequestToPayAsync(collection, "MTN", "DANGO_U_20261028_1"));
        var mobile = Mobile();
        mobile.AccountNumber = phone;
        Assert.Throws<ArgumentException>(() => client.ValidatePayout(mobile));
        await Assert.ThrowsAsync<ArgumentException>(() => client.InitiatePayoutAsync(mobile));
        var bank = Bank();
        bank.phone = phone;
        Assert.Throws<ArgumentException>(() => client.ValidateBankPayout(bank));
        await Assert.ThrowsAsync<ArgumentException>(() => client.InitiateBankPayoutAsync(bank));
        Assert.Null(handler.Url);
    }

    [Fact]
    public async Task InvalidCollectionAmountAndReferenceAreRejectedByPublicPrevalidation()
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler);
        var collection = Collection();
        collection.Amount = 0m;
        Assert.Throws<ArgumentOutOfRangeException>(() => client.ValidateCollection(collection, "MTN"));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => client.RequestToPayAsync(collection, "MTN", "DANGO_U_20261028_1"));
        collection.Amount = 1m;
        collection.Reference = " ";
        Assert.Throws<ArgumentException>(() => client.ValidateCollection(collection, "MTN"));
        await Assert.ThrowsAsync<ArgumentException>(() => client.RequestToPayAsync(collection, "MTN", "DANGO_U_20261028_1"));
        Assert.Null(handler.Url);
    }

    [Fact]
    public async Task ExplicitNetworkOverrideWorksWithoutGlobalNetworkConfiguration()
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler, "DangoPayment:MobileNetwork");
        client.ValidatePayout(Mobile(), "admin-resolved-network");
        await client.InitiatePayoutAsync(Mobile(), "admin-resolved-network");
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("admin-resolved-network", sent.RootElement.GetProperty("network").GetString());
        Assert.True(DangoPaymentClient.IsConfigured(Configuration("DangoPayment:MobileNetwork")));
    }

    [Fact]
    public async Task NetworkMustBeResolvedBeforeSubmittingWhenNoFallbackExists()
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler, "DangoPayment:MobileNetwork");
        Assert.Throws<InvalidOperationException>(() => client.ValidatePayout(Mobile()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.InitiatePayoutAsync(Mobile()));
        Assert.Null(handler.Url);
    }

    [Theory]
    [InlineData("00", "SUCCESSFUL")]
    [InlineData("FAILED", "PENDING")]
    [InlineData("TEST_FAILURE", "PENDING")]
    [InlineData("91", "PENDING")]
    public async Task VerifiedSuccessOnlyContractSettlesBothLookupsAndLeavesUnknownFailuresPending(string code, string expected)
    {
        var handler = new StubHandler(_ => Reply(JsonSerializer.Serialize(new
        {
            statusCode = code,
            statusDescription = "Transaction(Ref# 930917130007) is processed successfully",
            requestId = "string",
            flexipayReferenceNumber = "930917130007"
        })));
        var client = Client(handler, "DangoPayment:TransactionStatus:FailureValues:0");
        Assert.True(client.TransactionStatusConfigured);
        Assert.True(DangoPaymentClient.IsConfigured(Configuration("DangoPayment:TransactionStatus:FailureValues:0")));
        using var collection = JsonDocument.Parse(await client.GetRequestToPayStatusAsync(new() { TransactionId = "string" }));
        Assert.Equal(expected, collection.RootElement.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal("https://payments.example/api/Stanbic/get-transaction-status", handler.Url);
        using var payout = JsonDocument.Parse(await client.GetPayoutStatusAsync(new() { Reference = "string", Gateway = "bank" }));
        Assert.Equal(expected, payout.RootElement.GetProperty("data").GetProperty("data")[0].GetProperty("status").GetString());
    }

    [Fact]
    public async Task VerifiedSuccessRequiresOriginalRequestIdEchoForBothLookups()
    {
        var handler = new StubHandler(_ => Reply("""{"statusCode":"00","requestId":"different-reference"}"""));
        var client = Client(handler);
        using var collection = JsonDocument.Parse(await client.GetRequestToPayStatusAsync(new() { TransactionId = "original-reference" }));
        using var payout = JsonDocument.Parse(await client.GetPayoutStatusAsync(new() { Reference = "original-reference", Gateway = "mobilemoney" }));
        Assert.Equal("PENDING", collection.RootElement.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal("PENDING", payout.RootElement.GetProperty("data").GetProperty("data")[0].GetProperty("status").GetString());
    }

    private static RequestToPayRequestDto Collection() => new()
    {
        PaymentOption = "mobilemoney", Reference = "collection-ref", Phone = "256770000001", Amount = 1234.50m
    };

    private static InitiatePayoutRequestDto Mobile() => new()
    {
        Gateway = "mobilemoney", Reference = "payout-ref", Phone = "256770000002", AccountNumber = "256770000001",
        AccountName = "Recipient", Amount = 1000m, Message = "Transfer", SwiftCode = string.Empty
    };

    private static InitiatePayoutBankRequestDto Bank() => new()
    {
        gateway = "bank", reference = "bank-ref", phone = "256770000001", accountNumber = "Bank account",
        accountName = "Recipient", bankName = "Bank", bankSwiftCode = "TESTBIC", amount = 10000m, message = "Transfer"
    };

    [Theory]
    [InlineData("DangoPayment:BaseUrl")]
    [InlineData("DangoPayment:MerchantCode")]
    [InlineData("DangoPayment:ClientId")]
    [InlineData("DangoPayment:BankSortCodes:TESTBIC")]
    [InlineData("DangoPayment:BankCurrency")]
    [InlineData("DangoPayment:TransactionStatus:StateField")]
    [InlineData("DangoPayment:TransactionStatus:ReferenceField")]
    [InlineData("DangoPayment:TransactionStatus:SuccessValues:0")]
    public void PublicReadinessRequiresAllOperationSettingsButNotApiKey(string missing)
    {
        Assert.True(DangoPaymentClient.IsConfigured(Configuration()));
        Assert.True(DangoPaymentClient.IsConfigured(Configuration("DangoPayment:ApiKey")));
        Assert.False(DangoPaymentClient.IsConfigured(Configuration(missing)));
    }

    [Theory]
    [InlineData("http://payments.example/")]
    [InlineData("https://payments.example/")]
    public async Task HttpAndHttpsPassReadinessAndUseConfiguredScheme(string baseUrl)
    {
        var configuration = Configuration();
        configuration["DangoPayment:BaseUrl"] = baseUrl;
        Assert.True(DangoPaymentClient.IsConfigured(configuration));
        var handler = new StubHandler(_ => Reply("{}"));
        var client = new DangoPaymentClient(new HttpClient(handler), configuration);
        await client.RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1");
        Assert.Equal(baseUrl + "api/Stanbic/merchant-payment", handler.Url);
    }

    [Theory]
    [InlineData("ftp://payments.example/")]
    [InlineData("/relative")]
    [InlineData("")]
    public void UnsupportedUrlsFailReadinessAndConstruction(string baseUrl)
    {
        var configuration = Configuration();
        configuration["DangoPayment:BaseUrl"] = baseUrl;
        Assert.False(DangoPaymentClient.IsConfigured(configuration));
        Assert.Throws<InvalidOperationException>(() => new DangoPaymentClient(new HttpClient(), configuration));
    }

    [Theory]
    [InlineData("collection")]
    [InlineData("collection-status")]
    [InlineData("mobile-payout")]
    [InlineData("payout-status")]
    public async Task RequestsSupplyClientIdBeforeDangoControllerModelValidation(string operation)
    {
        var handler = new StubHandler(request =>
        {
            using var payload = JsonDocument.Parse(request.Content!.ReadAsStringAsync().GetAwaiter().GetResult());
            if (!payload.RootElement.TryGetProperty("clientId", out var clientId) || string.IsNullOrWhiteSpace(clientId.GetString()))
                return Reply("{\"errors\":{\"clientId\":[\"The clientId field is required.\"]}}", HttpStatusCode.BadRequest);
            Assert.Equal("configured-client", clientId.GetString());
            return Reply("{}");
        });
        var client = Client(handler);
        var result = operation switch
        {
            "collection" => await client.RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1"),
            "collection-status" => await client.GetRequestToPayStatusAsync(new() { TransactionId = "collection-ref" }),
            "mobile-payout" => await client.InitiatePayoutAsync(Mobile()),
            _ => await client.GetPayoutStatusAsync(new() { Reference = "payout-ref" })
        };
        using var response = JsonDocument.Parse(result);
        Assert.Equal(200, response.RootElement.GetProperty("status").GetInt32());
        Assert.Equal("PENDING", response.RootElement.GetProperty("data").GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("MTN")]
    [InlineData("AIRTEL")]
    public async Task CollectionSourceSystemUsesResolvedNetworkNotGlobalSetting(string network)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var configuration = Configuration("DangoPayment:SourceSystem");
        Assert.True(DangoPaymentClient.IsConfigured(configuration));
        var client = new DangoPaymentClient(new HttpClient(handler), configuration);
        await client.RequestToPayAsync(Collection(), network, "DANGO_U_20261028_1");
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal(network, sent.RootElement.GetProperty("sourceSystem").GetString());
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task CollectionRequiresResolvedNetworkBeforeSending(string? network)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var client = Client(handler);
        Assert.Throws<ArgumentException>(() => client.ValidateCollection(Collection(), network!));
        await Assert.ThrowsAsync<ArgumentException>(() => client.RequestToPayAsync(Collection(), network!, "DANGO_U_20261028_1"));
        Assert.Null(handler.Url);
    }

    [Theory]
    [InlineData("collection-status")]
    [InlineData("payout")]
    [InlineData("payout-status")]
    public async Task ProviderReferenceIsSeparateFromInternalCorrelationIdentifiers(string operation)
    {
        var handler = new StubHandler(_ => Reply("""{"statusCode":"00","requestId":"payout-ref","flexipayReferenceNumber":"930917130007"}"""));
        var client = Client(handler);
        var raw = operation switch
        {
            "collection-status" => await client.GetRequestToPayStatusAsync(new() { TransactionId = "payout-ref" }),
            "payout" => await client.InitiatePayoutAsync(Mobile()),
            _ => await client.GetPayoutStatusAsync(new() { Reference = "payout-ref" })
        };
        using var result = JsonDocument.Parse(raw);
        var data = result.RootElement.GetProperty("data");
        if (operation == "payout-status") data = data.GetProperty("data")[0];
        Assert.Equal("930917130007", data.GetProperty("vendorReference").GetString());
        Assert.Equal("payout-ref", data.GetProperty(operation == "collection-status" ? "transactionId" : operation == "payout" ? "otherReference" : "transaction_id").GetString());
    }

    [Theory]
    [InlineData("DANGO_U_20261028_5", "FAILED")]
    [InlineData("another-transaction", "PENDING")]
    public async Task ConfirmedCode57FailsOnlyTheMatchingCollection(string returnedRequestId, string expected)
    {
        var configuration = Configuration();
        configuration["DangoPayment:TransactionStatus:FailureValues:0"] = "57";
        var handler = new StubHandler(_ => Reply(JsonSerializer.Serialize(new
        {
            statusCode = "57", statusDescription = "FAILED", requestId = returnedRequestId,
            flexipayReferenceNumber = "932096650006"
        })));
        var client = new DangoPaymentClient(new HttpClient(handler), configuration);
        using var result = JsonDocument.Parse(await client.GetRequestToPayStatusAsync(new() { TransactionId = "DANGO_U_20261028_5" }));
        var data = result.RootElement.GetProperty("data");
        Assert.Equal(expected, data.GetProperty("status").GetString());
        Assert.Equal(expected == "FAILED", data.GetProperty("requestToPayStatus").GetBoolean());
        Assert.Equal("932096650006", data.GetProperty("vendorReference").GetString());
    }

    [Fact]
    public async Task ModelValidationFailureReportsHttpStatusWithoutExposingResponseDetails()
    {
        var client = Client(new StubHandler(_ => Reply("{\"errors\":{\"clientId\":[\"private-validation-data\"]}}", HttpStatusCode.BadRequest)));
        var result = await client.RequestToPayAsync(Collection(), "MTN", "DANGO_U_20261028_1");
        Assert.Contains("HTTP 400", result);
        Assert.Contains("PENDING", result);
        Assert.DoesNotContain("private-validation-data", result);
    }

    [Theory]
    [InlineData(200)]
    [InlineData(400)]
    public async Task ExactInvalidRequestIdRejectionFailsSubmissionAndStatus(int httpStatus)
    {
        var client = Client(new StubHandler(_ => Reply("""{"httpCode":400,"httpMessage":"Bad Request","moreInformation":"Invalid requestId"}""", (HttpStatusCode)httpStatus)));
        using var mobile = JsonDocument.Parse(await client.InitiatePayoutAsync(Mobile()));
        using var bank = JsonDocument.Parse(await client.InitiateBankPayoutAsync(Bank()));
        foreach (var result in new[] { mobile, bank })
        {
            Assert.False(result.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
            Assert.Equal("FAILED", result.RootElement.GetProperty("data").GetProperty("status").GetString());
            Assert.Equal("Invalid requestId", result.RootElement.GetProperty("data").GetProperty("message").GetString());
        }
        using var status = JsonDocument.Parse(await client.GetPayoutStatusAsync(new() { Reference = "payout-ref" }));
        Assert.Equal("FAILED", status.RootElement.GetProperty("data").GetProperty("data")[0].GetProperty("status").GetString());
        using var collection = JsonDocument.Parse(await client.GetRequestToPayStatusAsync(new() { TransactionId = "collection-ref" }));
        Assert.Equal("FAILED", collection.RootElement.GetProperty("data").GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("{\"httpCode\":400,\"httpMessage\":\"Bad Request\",\"moreInformation\":\"Invalid account\"}", 400)]
    [InlineData("{\"httpCode\":500,\"httpMessage\":\"Bad Request\",\"moreInformation\":\"Invalid requestId\"}", 400)]
    [InlineData("{\"httpCode\":400,\"httpMessage\":\"Bad Request\",\"moreInformation\":\"Invalid requestId\"}", 500)]
    [InlineData("{}", 400)]
    public async Task OtherErrorsRemainPendingAndNeverAuthorizeReversal(string body, int httpStatus)
    {
        var client = Client(new StubHandler(_ => Reply(body, (HttpStatusCode)httpStatus)));
        using var submission = JsonDocument.Parse(await client.InitiatePayoutAsync(Mobile()));
        Assert.True(submission.RootElement.GetProperty("data").GetProperty("payout").GetBoolean());
        Assert.Equal("PENDING", submission.RootElement.GetProperty("data").GetProperty("status").GetString());
        using var status = JsonDocument.Parse(await client.GetPayoutStatusAsync(new() { Reference = "payout-ref" }));
        Assert.Equal("PENDING", status.RootElement.GetProperty("data").GetProperty("data")[0].GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("6000.0000000000000000000000000", "6000")]
    [InlineData("6000.00", "6000")]
    [InlineData("6000", "6000")]
    public async Task BankAmountIsSentAsWholeNumberWithoutDecimalScale(string input, string expected)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var request = Bank();
        request.amount = decimal.Parse(input, CultureInfo.InvariantCulture);
        var original = request.amount;
        await Client(handler).InitiateBankPayoutAsync(request);
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal(expected, sent.RootElement.GetProperty("amount").GetString());
        Assert.Equal(original, request.amount);
    }

    [Theory]
    [InlineData("6000.5")]
    [InlineData("6000.01")]
    [InlineData("0")]
    [InlineData("-6000")]
    public async Task BankAmountRejectsFractionsBeforeSendingInsteadOfRounding(string input)
    {
        var handler = new StubHandler(_ => Reply("{}"));
        var request = Bank();
        request.amount = decimal.Parse(input, CultureInfo.InvariantCulture);
        var client = Client(handler);
        Assert.Throws<ArgumentOutOfRangeException>(() => client.ValidateBankPayout(request));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => client.InitiateBankPayoutAsync(request));
        Assert.Null(handler.Url);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task BankNetworkAndDestinationAreAlwaysBankRegardlessOfConfiguration(bool removeLegacySettings)
    {
        var configuration = Configuration();
        configuration["DangoPayment:BankNetwork"] = removeLegacySettings ? null : "WRONG_NETWORK";
        configuration["DangoPayment:BankDestination"] = removeLegacySettings ? null : "WRONG_DESTINATION";
        Assert.True(DangoPaymentClient.IsConfigured(configuration));
        var handler = new StubHandler(_ => Reply("{}"));
        var client = new DangoPaymentClient(new HttpClient(handler), configuration);
        client.ValidateBankPayout(Bank());
        await client.InitiateBankPayoutAsync(Bank());
        using var sent = JsonDocument.Parse(handler.Body!);
        Assert.Equal("BANK", sent.RootElement.GetProperty("network").GetString());
        Assert.Equal("BANK", sent.RootElement.GetProperty("destination").GetString());
    }

    private static DangoPaymentClient Client(StubHandler handler, string? missing = null) =>
        new(new HttpClient(handler), Configuration(missing));

    private static IConfiguration Configuration(string? missing = null)
    {
        var settings = new Dictionary<string, string?>
        {
            ["DangoPayment:BaseUrl"] = "https://payments.example/",
            ["DangoPayment:MerchantCode"] = "merchant-test",
            ["DangoPayment:SourceSystem"] = "rental-test",
            ["DangoPayment:ApiKey"] = "test-api-key",
            ["DangoPayment:MobileNetwork"] = "verified-mobile-network",
            ["DangoPayment:ClientId"] = "configured-client",
            ["DangoPayment:BankSortCodes:TESTBIC"] = "configured-sort-code",
            ["DangoPayment:BankNetwork"] = "verified-bank-network",
            ["DangoPayment:BankCurrency"] = "UGX",
            ["DangoPayment:BankDestination"] = "verified-bank-destination",
            ["DangoPayment:TransactionStatus:StateField"] = "statusCode",
            ["DangoPayment:TransactionStatus:ReferenceField"] = "requestId",
            ["DangoPayment:TransactionStatus:SuccessValues:0"] = "00",
            ["DangoPayment:TransactionStatus:FailureValues:0"] = "TEST_FAILURE"
        };
        if (missing != null)
        {
            settings.Remove(missing);
        }
        return new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
    }

    private static HttpResponseMessage Reply(string body, HttpStatusCode status = HttpStatusCode.OK) => new(status)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json")
    };

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
    {
        public string? Url { get; private set; }
        public string? Body { get; private set; }
        public string? ApiKey { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Url = request.RequestUri!.ToString();
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            ApiKey = request.Headers.TryGetValues("x-api-key", out var values) ? values.Single() : null;
            return reply(request);
        }
    }
}
