using System;
using System.Collections.Generic;
using System.Linq;                      // ← for ToList()
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    public class PaymentProcessor : BackgroundService
    {
        private const string Pending = "PENDING";
        private const string PendingTelcom = "PENDING AT TELCOM";
        private const string Failed = "FAILED";

        private readonly ILogger<PaymentProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public PaymentProcessor(
            ILogger<PaymentProcessor> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Billing Processing Service started.");

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessAllPendingAsync();
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("PaymentProcessor is stopping.");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected failure in ExecuteAsync");
                }
            }
        }

        private async Task ProcessAllPendingAsync()
        {
            // 1) Fetch & materialize both lists in one short‐lived scope
            List<UtilityPayment> utilityPayments;
            List<TenantPayment> tenantPayments;

            using (var scope = _scopeFactory.CreateScope())
            {
                var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();

                // await the Task<IEnumerable<…>>, then ToList()
                utilityPayments = (await paymentService
                        .GetUtilityPaymentByStatus(Pending))
                    .ToList();

                tenantPayments = (await paymentService
                        .GetPaymentsByStatusAsync(Pending))
                    .ToList();
            } // <-- DbContext disposed here

            // 2) Spawn one task per payment, each with its own scope
            var tasks = new List<Task>(utilityPayments.Count + tenantPayments.Count);

            foreach (var u in utilityPayments)
                tasks.Add(ProcessUtilityPaymentAsync(u));

            foreach (var t in tenantPayments)
                tasks.Add(ProcessTenantPaymentAsync(t));

            await Task.WhenAll(tasks);
        }

        private async Task ProcessUtilityPaymentAsync(UtilityPayment payment)
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

            using var logScope = _logger.BeginScope(new { payment.TransactionID, payment.PaymentMethod });

            try
            {
                if (payment.PaymentMethod.Equals("MOMO", StringComparison.OrdinalIgnoreCase))
                {
                    var total = payment.Amount + payment.Charges;
                    await HandleMomoAsync(
                        payment.TransactionID,
                        payment.PhoneNumber,
                        (decimal)total,
                        collectoApi,
                        paymentService,
                        tranType: "UTILITY");
                }
                else
                {
                    _logger.LogInformation("Delegating non-MOMO utility payment to wallet");
                    // await walletService.ProcessOtherPaymentAsync(payment);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing utility payment");
            }
        }

        private async Task ProcessTenantPaymentAsync(TenantPayment payment)
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

            using var logScope = _logger.BeginScope(new { payment.TransactionId, payment.PaymentMethod });

            try
            {
                if (payment.PaymentMethod.Equals("MOMO", StringComparison.OrdinalIgnoreCase))
                {
                    await HandleMomoAsync(
                        payment.TransactionId,
                        payment.PropertyTenant.PhoneNumber,
                        (decimal)payment.Amount,
                        collectoApi,
                        paymentService,
                        tranType: "RENT");
                }
                else
                {
                    _logger.LogInformation("Delegating non-MOMO tenant payment to wallet");
                    // await walletService.ProcessOtherPaymentAsync(payment);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing tenant payment");
            }
        }

        private async Task HandleMomoAsync(
            string transactionId,
            string phone,
            decimal amount,
            ICollectoApiClient collectoApi,
            IPaymentService paymentService,
            string tranType)
        {
            _logger.LogInformation("Requesting mobile-money payment");

            var request = new RequestToPayRequestDto
            {
                PaymentOption = "mobilemoney",
                Phone = phone,
                Amount = amount,
                Reference = transactionId
            };

            var raw = await collectoApi.RequestToPayAsync(request);
            if (string.IsNullOrWhiteSpace(raw))
            {
                _logger.LogError("Empty response from Collecto");
                await paymentService.UpdatePaymentStatus(
                    Failed,
                    transactionId,
                    "Empty response from Collecto",
                    string.Empty,
                    tranType);
                return;
            }

            RequestToPayResponse resp;
            try
            {
                resp = JsonSerializer.Deserialize<RequestToPayResponse>(raw,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
                _logger.LogDebug("Parsed response: {@Resp}", resp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse Collecto response");
                throw;
            }

            if (resp?.data?.requestToPay == true)
            {
                _logger.LogInformation("MOMO request accepted");
                await paymentService.UpdatePaymentStatus(
                    PendingTelcom,
                    transactionId,
                    resp.status_message ?? string.Empty,
                    resp.data.transactionId ?? string.Empty,
                    tranType);
            }
            else
            {
                _logger.LogError("MOMO request failed");
                await paymentService.UpdatePaymentStatus(
                    Failed,
                    transactionId,
                    resp?.data?.message ?? "Unknown error",
                    string.Empty,
                    tranType);
            }
        }

        // Models for Collecto JSON
        private class RequestToPayResponse
        {
            [JsonPropertyName("data")]
            public DataModel data { get; set; } = null!;
            [JsonPropertyName("status_message")]
            public string status_message { get; set; } = null!;

            public class DataModel
            {
                [JsonPropertyName("requestToPay")]
                public bool requestToPay { get; set; }

                [JsonPropertyName("transactionId")]
                [JsonConverter(typeof(NumberOrStringJsonConverter))]
                public string transactionId { get; set; } = null!;

                [JsonPropertyName("message")]
                public string message { get; set; } = null!;
            }
        }

        public class NumberOrStringJsonConverter : JsonConverter<string>
        {
            public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
                => reader.TokenType switch
                {
                    JsonTokenType.String => reader.GetString()!,
                    JsonTokenType.Number => reader.GetInt64().ToString(),
                    _ => throw new JsonException($"Cannot convert token {reader.TokenType} to string")
                };

            public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
                => writer.WriteStringValue(value);
        }
    }
}
