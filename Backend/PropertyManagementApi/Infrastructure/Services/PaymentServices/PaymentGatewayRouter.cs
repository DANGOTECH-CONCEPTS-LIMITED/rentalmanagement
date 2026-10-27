using Application.Interfaces.Collecto;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Dtos.Collecto;
using Infrastructure.Data;
using Infrastructure.Services.Collecto;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Infrastructure.Services.PaymentServices;

// Compatibility facade: every existing financial caller passes through the durable submission gate.
// Non-payment Collecto services intentionally remain Collecto-only.
public sealed class PaymentGatewayRouter(
    CollectoService collecto,
    DangoPaymentClient dango,
    AppDbContext db,
    PaymentProviderSettingsService settings) : ICollectoApiClient
{
    public static string SubmissionId(string operation, string reference)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(operation + ":" + reference)));

    private async Task<string> SubmitAsync<T>(string operation, string reference, T request,
        Func<Task<string>> submit, Func<Task<string>>? submitDango = null, Func<Task>? validateDango = null)
    {
        if (string.IsNullOrWhiteSpace(reference) || reference.Length > 128)
            throw new ArgumentException("A stable payment reference of at most 128 characters is required.");

        var id = SubmissionId(operation, reference);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request))));
        var submissions = db.Set<PaymentGatewaySubmission>();
        var existing = await submissions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id);
        if (existing != null)
            return Replay(existing, hash);

        // Collecto wallet operations are provider-specific, not interchangeable payouts.
        var provider = submitDango == null ? PaymentProviderSettingsService.Collecto : (await settings.GetAsync()).Provider;
        RequireProvider(provider);
        if (provider == PaymentProviderSettingsService.DangoPayment)
        {
            if (!(await settings.GetAsync()).DangoConfigured)
                throw new InvalidOperationException("The selected Dango provider is not configured. No payment was submitted.");
            if (validateDango != null) await validateDango();
        }
        var claim = new PaymentGatewaySubmission
        {
            Id = id, Operation = operation, Reference = reference, Provider = provider,
            RequestHash = hash, SubmittedAtUtc = DateTime.UtcNow
        };
        submissions.Add(claim);
        try
        {
            // Commit before any network I/O. A crash or timeout must never cause a second submission.
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            db.Entry(claim).State = EntityState.Detached;
            existing = await submissions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id);
            if (existing == null) throw;
            return Replay(existing, hash);
        }

        string response;
        try
        {
            response = provider == PaymentProviderSettingsService.DangoPayment ? await submitDango!() : await submit();
        }
        catch (HttpRequestException)
        {
            return PendingResponse(claim);
        }
        catch (OperationCanceledException)
        {
            return PendingResponse(claim);
        }
        claim.Response = response;
        claim.ProviderTransactionId = ReadTransactionId(response);
        await db.SaveChangesAsync();
        return response;
    }

    private static string Replay(PaymentGatewaySubmission existing, string hash)
    {
        RequireProvider(existing.Provider);
        if (!string.IsNullOrEmpty(existing.RequestHash) && existing.RequestHash != hash)
            throw new InvalidOperationException("This payment reference is already bound to a different request. Reconcile the original transaction; do not resubmit it.");
        return existing.Response ?? PendingResponse(existing);
    }

    private static string PendingResponse(PaymentGatewaySubmission submission)
        => submission.Provider != PaymentProviderSettingsService.DangoPayment ? string.Empty
            : submission.Operation == "Collection" ? DangoPaymentClient.CreatePendingCollectionResponse(submission.Reference)
            : DangoPaymentClient.CreatePendingPayoutResponse(submission.Reference);

    private static void RequireProvider(string provider)
    {
        if (provider != PaymentProviderSettingsService.Collecto && provider != PaymentProviderSettingsService.DangoPayment)
            throw new InvalidOperationException("The persisted payment provider is unavailable. Automatic failover is prohibited.");
    }

    private static string? ReadTransactionId(string response)
    {
        try
        {
            using var json = JsonDocument.Parse(response);
            if (json.RootElement.TryGetProperty("data", out var data) &&
                data.TryGetProperty("transactionId", out var id))
                return id.ValueKind == JsonValueKind.String ? id.GetString() : id.GetRawText();
        }
        catch (JsonException) { }
        return null;
    }

    private async Task<string> ProviderForAsync(string operation, string reference)
    {
        var id = SubmissionId(operation, reference);
        var provider = await db.Set<PaymentGatewaySubmission>().AsNoTracking()
            .Where(x => x.Operation == operation && (x.Id == id || x.ProviderTransactionId == reference))
            .Select(x => x.Provider).FirstOrDefaultAsync();
        // Rows predating this integration were submitted to Collecto, never to the current selection.
        provider ??= PaymentProviderSettingsService.Collecto;
        RequireProvider(provider);
        return provider;
    }

    public Task<string> RequestToPayAsync(RequestToPayRequestDto request)
        => SubmitAsync("Collection", request.Reference, request, () => collecto.RequestToPayAsync(request),
            () => dango.RequestToPayAsync(request), () =>
            {
                dango.ValidateCollection(request);
                return Task.CompletedTask;
            });

    public async Task<string> GetRequestToPayStatusAsync(RequestToPayStatusRequestDto request)
    {
        var provider = await ProviderForAsync("Collection", request.TransactionId);
        return provider == PaymentProviderSettingsService.DangoPayment
            ? await dango.GetRequestToPayStatusAsync(request)
            : await collecto.GetRequestToPayStatusAsync(request);
    }

    public Task<string> InitiatePayoutAsync(InitiatePayoutRequestDto request)
    {
        string? network = null;
        return SubmitAsync("Payout", request.Reference, request, () => collecto.InitiatePayoutAsync(request),
            () => dango.InitiatePayoutAsync(request, network), async () =>
            {
                network = await settings.ResolveMobileNetworkAsync(request.AccountNumber);
                dango.ValidatePayout(request, network);
            });
    }

    public Task<string> InitiateBankPayoutAsync(InitiatePayoutBankRequestDto request)
        => SubmitAsync("Payout", request.reference, request, () => collecto.InitiateBankPayoutAsync(request),
            () => dango.InitiateBankPayoutAsync(request), () =>
            {
                dango.ValidateBankPayout(request);
                return Task.CompletedTask;
            });

    public async Task<string> GetPayoutStatusAsync(PayoutStatusRequestDto request)
    {
        var provider = await ProviderForAsync("Payout", request.Reference);
        return provider == PaymentProviderSettingsService.DangoPayment
            ? await dango.GetPayoutStatusAsync(request)
            : await collecto.GetPayoutStatusAsync(request);
    }

    public Task<string> WithdrawToCollectoApi(CollectoWithdrawRequest request)
        => SubmitAsync("WalletTransfer", request.Reference, request, () => collecto.WithdrawToCollectoApi(request));

    public async Task<CollectoWalletWithdrawalExecutionResultDto> WithdrawFromCollectoWallet(WithdrawFromCollectoWalletDto request)
    {
        var raw = await SubmitAsync("Withdrawal", request.reference, request,
            async () => JsonSerializer.Serialize(await collecto.WithdrawFromCollectoWallet(request)));
        return string.IsNullOrEmpty(raw)
            ? new CollectoWalletWithdrawalExecutionResultDto
            {
                Status = "PENDING", IsSuccess = false,
                ErrorMessage = "Submission outcome is unknown. Reconcile the original reference; do not resubmit."
            }
            : JsonSerializer.Deserialize<CollectoWalletWithdrawalExecutionResultDto>(raw)!;
    }

    public Task<string> ServicePaymentAsync(ServicePaymentRequestDto request) => collecto.ServicePaymentAsync(request);
    public Task<string> GetServicePaymentStatusAsync(ServicePaymentStatusRequestDto request) => collecto.GetServicePaymentStatusAsync(request);
    public Task<string> SendSingleSmsAsync(SendSingleSmsRequestDto request) => collecto.SendSingleSmsAsync(request);
    public Task<string> GetCurrentBalanceAsync(CurrentBalanceRequestDto request) => collecto.GetCurrentBalanceAsync(request);
    public Task<string> VerifyPhoneNumberAsync(VerifyPhoneNumberRequestDto request) => collecto.VerifyPhoneNumberAsync(request);
    public Task<string> GetSupportedBanksAsync(string request) => collecto.GetSupportedBanksAsync(request);
}
