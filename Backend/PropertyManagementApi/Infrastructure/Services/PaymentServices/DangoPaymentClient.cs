using Domain.Dtos.Collecto;
using Microsoft.Extensions.Configuration;
using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;

namespace Infrastructure.Services.PaymentServices;

// Only the five payment operations are supported; Collecto wallet operations are not Dango payments.
public sealed class DangoPaymentClient
{
    private readonly HttpClient _http;
    private readonly IConfiguration _configuration;
    private readonly Uri _baseUri;

    public DangoPaymentClient(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        _configuration = configuration;
        var baseUrl = RequiredSetting("BaseUrl");
        if (!Uri.TryCreate(baseUrl.TrimEnd('/') + "/", UriKind.Absolute, out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttps && baseUri.Scheme != Uri.UriSchemeHttp))
        {
            throw new InvalidOperationException("DangoPayment:BaseUrl must be an absolute HTTP(S) URL.");
        }
        _baseUri = baseUri;
    }

    public bool TransactionStatusConfigured => ReadStatusContract(_configuration) != null;

    public bool PayoutStatusConfigured => TransactionStatusConfigured;

    public bool MobilePayoutConfigured => PayoutStatusConfigured;

    public bool BankPayoutConfigured => BankConfigured(_configuration);

    public static bool IsConfigured(IConfiguration configuration) =>
        Uri.TryCreate(configuration["DangoPayment:BaseUrl"], UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps &&
        new[] { "MerchantCode", "SourceSystem" }.All(name => HasSetting(configuration, name)) &&
        BankConfigured(configuration);

    private static bool BankConfigured(IConfiguration configuration) =>
        ReadStatusContract(configuration) != null &&
        new[] { "ClientId", "BankNetwork", "BankCurrency", "BankDestination" }.All(name => HasSetting(configuration, name)) &&
        configuration.GetSection("DangoPayment:BankSortCodes").GetChildren().Any(x => !string.IsNullOrWhiteSpace(x.Value));

    public void ValidateCollection(RequestToPayRequestDto request)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequireGateway(request.PaymentOption, "mobilemoney");
        RequiredValue(request.Reference, nameof(request.Reference));
        NormalizePhone(request.Phone);
        Amount(request.Amount);
        RequiredSetting("MerchantCode");
        RequiredSetting("SourceSystem");
        RequireStatusContract();
    }

    public static string NormalizePhone(string? phone)
    {
        var digits = (phone ?? string.Empty).Trim().Replace(" ", string.Empty).Replace("-", string.Empty).TrimStart('+');
        if (digits.StartsWith("0", StringComparison.Ordinal)) digits = "256" + digits[1..];
        if (digits.Length == 9 && digits.StartsWith("7", StringComparison.Ordinal)) digits = "256" + digits;
        if (digits.Length != 12 || !digits.All(char.IsAsciiDigit) || !digits.StartsWith("2567", StringComparison.Ordinal))
        {
            throw new ArgumentException("A valid Ugandan mobile number is required.", nameof(phone));
        }
        return digits;
    }

    public void ValidatePayout(InitiatePayoutRequestDto request, string? network = null)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequireGateway(request.Gateway, "mobilemoney");
        RequiredValue(request.Reference, nameof(request.Reference));
        NormalizePhone(request.AccountNumber);
        RequiredValue(request.AccountName, nameof(request.AccountName));
        NormalizePhone(request.Phone);
        Amount(request.Amount);
        ResolveNetwork(network);
        RequireStatusContract();
    }

    public void ValidateBankPayout(InitiatePayoutBankRequestDto request)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequireGateway(request.gateway, "bank");
        RequiredValue(request.reference, nameof(request.reference));
        NormalizePhone(request.phone);
        RequiredValue(request.accountNumber, nameof(request.accountNumber));
        RequiredValue(request.accountName, nameof(request.accountName));
        RequiredValue(request.bankName, nameof(request.bankName));
        var swiftCode = RequiredValue(request.bankSwiftCode, nameof(request.bankSwiftCode));
        Amount(request.amount);
        foreach (var name in new[] { "ClientId", "BankNetwork", "BankCurrency", "BankDestination", $"BankSortCodes:{swiftCode}" })
        {
            RequiredSetting(name);
        }
        RequireStatusContract();
    }

    public static string CreatePendingCollectionResponse(string reference, string? message = null)
    {
        RequiredValue(reference, nameof(reference));
        message ??= "Dango submission outcome is unknown; poll the original reference and do not resubmit.";
        return JsonSerializer.Serialize(new
        {
            status = 202, status_message = message,
            data = new { requestToPay = true, transactionId = reference, status = "PENDING", message }
        });
    }

    public static string CreatePendingPayoutResponse(string reference, string? message = null)
    {
        RequiredValue(reference, nameof(reference));
        message ??= "Dango submission outcome is unknown; poll the original reference and do not resubmit.";
        return JsonSerializer.Serialize(new
        {
            status = 202, status_message = message,
            data = new { payout = true, otherReference = reference, status = "PENDING", message }
        });
    }

    public async Task<string> RequestToPayAsync(RequestToPayRequestDto request)
    {
        ValidateCollection(request);
        var reference = RequiredValue(request.Reference, nameof(request.Reference));
        var response = await PostAsync("merchant-payment", new
        {
            requestId = reference,
            msisdn = NormalizePhone(request.Phone),
            merchantCode = RequiredSetting("MerchantCode"),
            referenceNumber = reference,
            amount = Amount(request.Amount),
            sourceSystem = RequiredSetting("SourceSystem"),
            narrative = reference
        });
        return Envelope(response, new
        {
            requestToPay = true,
            transactionId = reference,
            status = "PENDING",
            message = Message(response),
            flexipayReferenceNumber = Field(response, "flexipayReferenceNumber")
        });
    }

    public async Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request)
    {
        ArgumentNullException.ThrowIfNull(request);
        var reference = RequiredValue(request.TransactionId, nameof(request.TransactionId));
        var response = await PostAsync("get-transaction-status", new { requestId = reference });
        var state = StatusState(response, reference, ReadStatusContract(_configuration));
        return Envelope(response, new
        {
            requestToPayStatus = state != "PENDING",
            transactionId = reference,
            status = state,
            message = Message(response),
            flexipayReferenceNumber = Field(response, "flexipayReferenceNumber")
        });
    }

    public async Task<string> InitiatePayoutAsync(InitiatePayoutRequestDto request, string? network = null)
    {
        ValidatePayout(request, network);
        var reference = RequiredValue(request.Reference, nameof(request.Reference));
        var response = await PostAsync("mobile-transfer-cash-out", new
        {
            requestId = reference,
            narrative = request.Message ?? string.Empty,
            beneficiaryAccount = NormalizePhone(request.AccountNumber),
            beneficiaryName = RequiredValue(request.AccountName, nameof(request.AccountName)),
            mobileNumber = NormalizePhone(request.Phone),
            amount = Amount(request.Amount),
            network = ResolveNetwork(network),
            destination = "MNO"
        });
        return PayoutSubmission(response, reference);
    }

    public async Task<string> InitiateBankPayoutAsync(InitiatePayoutBankRequestDto request)
    {
        ValidateBankPayout(request);
        var reference = RequiredValue(request.reference, nameof(request.reference));
        var swiftCode = RequiredValue(request.bankSwiftCode, nameof(request.bankSwiftCode));
        var response = await PostAsync("bank-transfer-cash-out", new
        {
            requestId = reference,
            // Unlike merchant/mobile transfers, Dango does not inject clientId for bank transfers.
            clientId = RequiredSetting("ClientId"),
            mobileNumber = NormalizePhone(request.phone),
            amount = Amount(request.amount),
            narrative = request.message ?? string.Empty,
            beneficiaryAccount = RequiredValue(request.accountNumber, nameof(request.accountNumber)),
            beneficiaryName = RequiredValue(request.accountName, nameof(request.accountName)),
            // A SWIFT/BIC must not be silently treated as a domestic bank sort code.
            bankSortCode = RequiredSetting($"BankSortCodes:{swiftCode}"),
            bankName = RequiredValue(request.bankName, nameof(request.bankName)),
            network = RequiredSetting("BankNetwork"),
            currency = RequiredSetting("BankCurrency"),
            destination = RequiredSetting("BankDestination")
        });
        return PayoutSubmission(response, reference);
    }

    public async Task<string> GetPayoutStatusAsync(PayoutStatusRequestDto request)
    {
        ArgumentNullException.ThrowIfNull(request);
        var reference = RequiredValue(request.Reference, nameof(request.Reference));
        // This requestId-based route is distinct from payment-status/{transactionId}.
        // Dango supplies clientId and preserves our original, nonempty requestId.
        var response = await PostAsync("get-transaction-status", new { requestId = reference });
        var contract = ReadStatusContract(_configuration);
        var state = StatusState(response, reference, contract);
        var message = contract == null
            ? "Dango TransactionStatus response contract is not configured; reconciliation is required. Payment remains pending."
            : Message(response);
        return JsonSerializer.Serialize(new
        {
            status = response.HttpStatus,
            status_message = message,
            data = new
            {
                payout = true,
                status = state,
                message,
                data = new[]
                {
                    new { status = state, status_message = message, message, transaction_id = reference }
                }
            }
        });
    }

    private static string PayoutSubmission(Response response, string reference)
    {
        return Envelope(response, new
        {
            // Submission codes are not settlement codes. Only the final lookup can permit reversal.
            payout = true,
            otherReference = reference,
            status = "PENDING",
            message = Message(response),
            flexipayReferenceNumber = Field(response, "flexipayReferenceNumber")
        });
    }

    private async Task<Response> PostAsync(string endpoint, object payload)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, new Uri(_baseUri, "api/Stanbic/" + endpoint))
        {
            Content = JsonContent.Create(payload)
        };
        var apiKey = _configuration["DangoPayment:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            message.Headers.Add("x-api-key", apiKey);
        }
        try
        {
            using var response = await _http.SendAsync(message);
            var json = await response.Content.ReadAsStringAsync();
            JsonElement? body = null;
            try
            {
                using var document = JsonDocument.Parse(json);
                if (document.RootElement.ValueKind == JsonValueKind.Object)
                {
                    body = document.RootElement.Clone();
                }
            }
            catch (JsonException)
            {
                // A response parsing failure is not evidence that a financial transaction failed.
            }
            return new Response((int)response.StatusCode, response.IsSuccessStatusCode, body);
        }
        catch (HttpRequestException)
        {
            return new Response(202, false, null);
        }
        catch (OperationCanceledException)
        {
            // A timed-out POST may already have been accepted. Never trigger a reversal or failover.
            return new Response(202, false, null);
        }
    }

    private static string StatusState(Response response, string reference, StatusContract? contract)
    {
        if (contract == null || !response.IsSuccess ||
            !string.Equals(Field(response, contract.ReferenceField), reference, StringComparison.Ordinal))
        {
            return "PENDING";
        }
        // The verified final lookup reports statusCode 00 for success. No submission or
        // description text is settlement evidence, and unknown failure codes remain pending.
        var remoteState = Field(response, contract.StateField)?.Trim() ?? string.Empty;
        return contract.SuccessValues.Contains(remoteState, StringComparer.OrdinalIgnoreCase) ? "SUCCESSFUL"
            : contract.FailureValues.Contains(remoteState, StringComparer.OrdinalIgnoreCase) ? "FAILED"
            : "PENDING";
    }

    private static string Message(Response response) => Field(response, "statusDescription")
        ?? "Dango settlement is unconfirmed; retain this reference and reconcile before retrying.";

    private static string Envelope(Response response, object data) => JsonSerializer.Serialize(new
    {
        status = response.HttpStatus,
        status_message = Message(response),
        data
    });

    private static string? Field(Response response, string name)
    {
        if (response.Body is not JsonElement body)
        {
            return null;
        }
        foreach (var segment in name.Split('.'))
        {
            if (body.ValueKind != JsonValueKind.Object)
            {
                return null;
            }
            var property = body.EnumerateObject().FirstOrDefault(x => string.Equals(x.Name, segment, StringComparison.OrdinalIgnoreCase));
            body = property.Value;
        }
        return body.ValueKind switch
        {
            JsonValueKind.String => body.GetString(),
            JsonValueKind.Number => body.GetRawText(),
            _ => null
        };
    }

    private static bool HasSetting(IConfiguration configuration, string name) =>
        !string.IsNullOrWhiteSpace(configuration[$"DangoPayment:{name}"]);

    private static StatusContract? ReadStatusContract(IConfiguration configuration)
    {
        // Collections and payouts share the verified final transaction-status lookup.
        var section = configuration.GetSection("DangoPayment:TransactionStatus");
        var stateField = section["StateField"];
        var referenceField = section["ReferenceField"];
        var success = section.GetSection("SuccessValues").GetChildren().Select(x => x.Value?.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).ToArray();
        var failure = section.GetSection("FailureValues").GetChildren().Select(x => x.Value?.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).ToArray();
        if (string.IsNullOrWhiteSpace(stateField) || string.IsNullOrWhiteSpace(referenceField) ||
            string.Equals(stateField, referenceField, StringComparison.OrdinalIgnoreCase) ||
            success.Length == 0 || success.Intersect(failure, StringComparer.OrdinalIgnoreCase).Any())
        {
            return null;
        }
        return new StatusContract(stateField, referenceField, success, failure);
    }

    private void RequireStatusContract()
    {
        if (!TransactionStatusConfigured)
        {
            throw new InvalidOperationException("Dango payments are disabled until DangoPayment:TransactionStatus StateField, ReferenceField and SuccessValues define a verified settlement contract. FailureValues is optional.");
        }
    }

    private string ResolveNetwork(string? network) =>
        !string.IsNullOrWhiteSpace(network) ? network : RequiredSetting("MobileNetwork");

    private sealed record StatusContract(string StateField, string ReferenceField, string[] SuccessValues, string[] FailureValues);

    private string RequiredSetting(string name) =>
        !string.IsNullOrWhiteSpace(_configuration[$"DangoPayment:{name}"])
            ? _configuration[$"DangoPayment:{name}"]!
            : throw new InvalidOperationException($"DangoPayment:{name} must be configured.");

    private static string RequiredValue(string? value, string name) =>
        !string.IsNullOrWhiteSpace(value) ? value : throw new ArgumentException("A nonempty value is required.", name);

    private static string Amount(decimal amount) => amount > 0
        ? amount.ToString(CultureInfo.InvariantCulture)
        : throw new ArgumentOutOfRangeException(nameof(amount), "Payment amount must be positive.");

    private static void RequireGateway(string? actual, string expected)
    {
        if (!string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase))
        {
            throw new NotSupportedException($"Dango operation supports only '{expected}', not Collecto wallet or other gateway operations.");
        }
    }

    private sealed record Response(int HttpStatus, bool IsSuccess, JsonElement? Body);
}
