using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<DangoPaymentClient>? _logger;

    public DangoPaymentClient(HttpClient http, IConfiguration configuration, ILogger<DangoPaymentClient>? logger = null)
    {
        _http = http;
        _configuration = configuration;
        _logger = logger;
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
        (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp) &&
        HasSetting(configuration, "MerchantCode") &&
        BankConfigured(configuration);

    private static bool BankConfigured(IConfiguration configuration) =>
        ReadStatusContract(configuration) != null &&
        new[] { "ClientId", "BankCurrency" }.All(name => HasSetting(configuration, name)) &&
        configuration.GetSection("DangoPayment:BankSortCodes").GetChildren().Any(x => !string.IsNullOrWhiteSpace(x.Value));

    public void ValidateCollection(RequestToPayRequestDto request, string network)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequireGateway(request.PaymentOption, "mobilemoney");
        RequiredValue(request.Reference, nameof(request.Reference));
        NormalizePhone(request.Phone);
        Amount(request.Amount);
        RequiredSetting("MerchantCode");
        RequiredValue(network, nameof(network));
        RequiredSetting("ClientId");
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
        RequiredSetting("ClientId");
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
        BankAmount(request.amount);
        foreach (var name in new[] { "ClientId", "BankCurrency", $"BankSortCodes:{swiftCode}" })
        {
            RequiredSetting(name);
        }
        RequireStatusContract();
    }

    public void ValidateBillPayment(DangoBillerSetting biller, string? nwscAccount, string? location, decimal amount)
    {
        ArgumentNullException.ThrowIfNull(biller);
        RequiredSetting("ClientId");
        RequiredValue(biller.ServiceId, "ServiceId");
        RequiredValue(biller.Transtype, "Transtype");
        var account = RequiredValue(nwscAccount, "NWSC account");
        if (account.Length > 64) throw new ArgumentException("The NWSC account must not exceed 64 characters.", nameof(nwscAccount));
        var resolvedLocation = string.IsNullOrWhiteSpace(location) ? biller.Location : location.Trim();
        if (string.IsNullOrWhiteSpace(resolvedLocation))
            throw new ArgumentException("A biller location (meter location or configured biller location) is required.");
        if (resolvedLocation.Length > 128) throw new ArgumentException("The biller location must not exceed 128 characters.", nameof(location));
        BankAmount(amount); // Dango biller amounts use the same positive whole-number format.
        RequireStatusContract();
    }

    public async Task<string> SubmitBillPaymentAsync(string reference, string nwscAccount, string? customerName,
        string? customerMobile, string? location, decimal amount, DangoBillerSetting biller, CancellationToken ct = default)
    {
        RequiredValue(reference, nameof(reference));
        ValidateBillPayment(biller, nwscAccount, location, amount);
        var response = await PostAsync("bill-payment", new
        {
            requestId = reference,
            clientId = RequiredSetting("ClientId"),
            serviceId = biller.ServiceId,
            transtype = biller.Transtype,
            requestReference = reference,
            narrative = string.IsNullOrWhiteSpace(biller.Narrative) ? $"NWSC bill payment {nwscAccount}" : biller.Narrative,
            customerId = nwscAccount,
            customerName = customerName ?? string.Empty,
            tin = biller.Tin ?? string.Empty,
            uedlid = biller.Uedlid ?? string.Empty,
            processid = biller.ProcessId ?? string.Empty,
            productCode = biller.ProductCode ?? string.Empty,
            location = string.IsNullOrWhiteSpace(location) ? biller.Location ?? string.Empty : location.Trim(),
            customerMobile = string.IsNullOrWhiteSpace(customerMobile) ? string.Empty : NormalizePhone(customerMobile),
            amount = BankAmount(amount),
            schoolCode = string.Empty
        }, ct);
        return BillPaymentEnvelope(response, reference);
    }

    public async Task<string> GetBillPaymentStatusAsync(string reference, CancellationToken ct = default)
    {
        RequiredValue(reference, nameof(reference));
        var response = await PostAsync("bill-payment-status",
            new { requestReference = reference, clientId = RequiredSetting("ClientId") }, ct);
        return BillPaymentEnvelope(response, reference);
    }

    private string BillPaymentEnvelope(Response response, string reference)
    {
        var state = BillPaymentState(response, reference, ReadStatusContract(_configuration));
        var message = Message(response);
        return JsonSerializer.Serialize(new
        {
            status = response.HttpStatus,
            status_message = message,
            data = new
            {
                billPayment = state != "FAILED",
                state,
                requestReference = reference,
                // A biller receipt is the most specific reference; fall back to FlexiPay identifiers.
                vendorReference = Field(response, "receiptNumber") ?? Field(response, "flexipayReferenceNumber")
                    ?? Field(response, "flexipayRefNum") ?? string.Empty,
                message
            }
        });
    }

    private static string BillPaymentState(Response response, string reference, StatusContract? contract)
    {
        if (IsTerminalPreProcessingRejection(response)) return "FAILED";
        if (contract == null || !response.IsSuccess) return "PENDING";
        if (!string.Equals(Field(response, "requestReference"), reference, StringComparison.OrdinalIgnoreCase))
            return "PENDING"; // Uncorrelated responses are not evidence about this bill.
        var remoteState = Field(response, contract.StateField)?.Trim() ?? string.Empty;
        return contract.SuccessValues.Contains(remoteState, StringComparer.OrdinalIgnoreCase) ? "SUCCESSFUL"
            : contract.FailureValues.Contains(remoteState, StringComparer.OrdinalIgnoreCase) ? "FAILED"
            : "PENDING";
    }

    private static bool IsTerminalPreProcessingRejection(Response response)
        => IsInvalidRequestIdRejection(response) ||
           (response.HttpStatus is 200 or 400 && Field(response, "httpCode") == "400" &&
            (Field(response, "moreInformation")?.Trim().StartsWith("Invalid amount", StringComparison.OrdinalIgnoreCase) ?? false));

    public static string CreatePendingCollectionResponse(string reference, string? message = null)
    {
        RequiredValue(reference, nameof(reference));
        message ??= "Dango submission outcome is unknown; poll the original reference and do not resubmit.";
        return JsonSerializer.Serialize(new
        {
            status = 202, status_message = message,
            data = new { requestToPay = true, transactionId = reference, vendorReference = string.Empty, status = "PENDING", message }
        });
    }

    public static string CreatePendingPayoutResponse(string reference, string? message = null)
    {
        RequiredValue(reference, nameof(reference));
        message ??= "Dango submission outcome is unknown; poll the original reference and do not resubmit.";
        return JsonSerializer.Serialize(new
        {
            status = 202, status_message = message,
            data = new { payout = true, otherReference = reference, vendorReference = string.Empty, status = "PENDING", message }
        });
    }

    public async Task<string> RequestToPayAsync(RequestToPayRequestDto request, string network, string referenceNumber)
    {
        ValidateCollection(request, network);
        RequiredValue(referenceNumber, nameof(referenceNumber));
        var reference = RequiredValue(request.Reference, nameof(request.Reference));
        var response = await PostAsync("merchant-payment", new
        {
            requestId = reference,
            clientId = RequiredSetting("ClientId"),
            msisdn = NormalizePhone(request.Phone),
            merchantCode = RequiredSetting("MerchantCode"),
            referenceNumber,
            amount = Amount(request.Amount),
            sourceSystem = network,
            narrative = reference
        });
        return Envelope(response, new
        {
            requestToPay = !IsInvalidRequestIdRejection(response),
            transactionId = reference,
            vendorReference = Field(response, "flexipayReferenceNumber") ?? string.Empty,
            status = IsInvalidRequestIdRejection(response) ? "FAILED" : "PENDING",
            message = Message(response),
            flexipayReferenceNumber = Field(response, "flexipayReferenceNumber")
        });
    }

    public async Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request)
    {
        ArgumentNullException.ThrowIfNull(request);
        var reference = RequiredValue(request.TransactionId, nameof(request.TransactionId));
        var response = await PostAsync("get-transaction-status", new { requestId = reference, clientId = RequiredSetting("ClientId") });
        var state = StatusState(response, reference, ReadStatusContract(_configuration));
        return Envelope(response, new
        {
            requestToPayStatus = state != "PENDING",
            transactionId = reference,
            vendorReference = Field(response, "flexipayReferenceNumber") ?? string.Empty,
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
            clientId = RequiredSetting("ClientId"),
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
            amount = BankAmount(request.amount),
            narrative = request.message ?? string.Empty,
            beneficiaryAccount = RequiredValue(request.accountNumber, nameof(request.accountNumber)),
            beneficiaryName = RequiredValue(request.accountName, nameof(request.accountName)),
            // A SWIFT/BIC must not be silently treated as a domestic bank sort code.
            bankSortCode = RequiredSetting($"BankSortCodes:{swiftCode}"),
            bankName = RequiredValue(request.bankName, nameof(request.bankName)),
            network = "BANK",
            currency = RequiredSetting("BankCurrency"),
            destination = "BANK"
        });
        return PayoutSubmission(response, reference);
    }

    public async Task<string> GetPayoutStatusAsync(PayoutStatusRequestDto request)
    {
        ArgumentNullException.ThrowIfNull(request);
        var reference = RequiredValue(request.Reference, nameof(request.Reference));
        // Supply clientId for Dango's model validation before its service applies configured credentials.
        var response = await PostAsync("get-transaction-status", new { requestId = reference, clientId = RequiredSetting("ClientId") });
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
                    new
                    {
                        status = state, status_message = message, message, transaction_id = reference,
                        vendorReference = Field(response, "flexipayReferenceNumber") ?? string.Empty
                    }
                }
            }
        });
    }

    public async Task<bool> HasUnresolvedNotFoundPayoutAsync(string reference, CancellationToken ct = default)
    {
        RequiredValue(reference, nameof(reference));
        var response = await PostAsync("get-transaction-status",
            new { requestId = reference, clientId = RequiredSetting("ClientId") }, ct);
        return response.HttpStatus is 200 or 404 && Field(response, "httpCode") == "404" &&
            string.Equals(Field(response, "httpMessage"), "Not Found", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(Field(response, "moreInformation"), "No Transaction found for the requested message ID", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(Field(response, "requestId"), reference, StringComparison.Ordinal);
    }

    private static string PayoutSubmission(Response response, string reference)
    {
        return Envelope(response, new
        {
            // Only this provider-confirmed rejection is terminal at submission time.
            payout = !IsInvalidRequestIdRejection(response),
            otherReference = reference,
            vendorReference = Field(response, "flexipayReferenceNumber") ?? string.Empty,
            status = IsInvalidRequestIdRejection(response) ? "FAILED" : "PENDING",
            message = Message(response),
            flexipayReferenceNumber = Field(response, "flexipayReferenceNumber")
        });
    }

    private async Task<Response> PostAsync(string endpoint, object payload, CancellationToken ct = default)
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
            using var response = await _http.SendAsync(message, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
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
            if (!response.IsSuccessStatusCode || body == null)
                _logger?.LogWarning("Dango endpoint {Endpoint} returned HTTP {StatusCode}; JSON object response: {HasJsonBody}. Settlement remains unconfirmed",
                    endpoint, (int)response.StatusCode, body != null);
            return new Response((int)response.StatusCode, response.IsSuccessStatusCode, body);
        }
        catch (HttpRequestException ex)
        {
            _logger?.LogWarning("Dango endpoint {Endpoint} transport failure: {ErrorCategory}. Settlement remains unconfirmed",
                endpoint, ex.HttpRequestError);
            return new Response(202, false, null);
        }
        catch (OperationCanceledException)
        {
            // A timed-out POST may already have been accepted. Never trigger a reversal or failover.
            _logger?.LogWarning("Dango endpoint {Endpoint} timed out or was cancelled. Settlement remains unconfirmed", endpoint);
            return new Response(202, false, null);
        }
    }

    private static string StatusState(Response response, string reference, StatusContract? contract)
    {
        if (IsInvalidRequestIdRejection(response)) return "FAILED";
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

    private static bool IsInvalidRequestIdRejection(Response response)
        => response.HttpStatus is 200 or 400 && Field(response, "httpCode") == "400" &&
           string.Equals(Field(response, "httpMessage"), "Bad Request", StringComparison.OrdinalIgnoreCase) &&
           string.Equals(Field(response, "moreInformation"), "Invalid requestId", StringComparison.OrdinalIgnoreCase);

    private static string Message(Response response) => IsInvalidRequestIdRejection(response) ? "Invalid requestId"
        : Field(response, "statusDescription")
        ?? ((!response.IsSuccess && response.HttpStatus != 202 ? $"Dango returned HTTP {response.HttpStatus}. " : string.Empty)
            + "Dango settlement is unconfirmed; retain this reference and reconcile before retrying.");

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

    private static string BankAmount(decimal amount)
    {
        if (amount <= 0 || decimal.Truncate(amount) != amount)
            throw new ArgumentOutOfRangeException(nameof(amount), "Dango bank payout amount must be a positive whole number; fractional amounts are not rounded.");
        return amount.ToString("0", CultureInfo.InvariantCulture);
    }

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
