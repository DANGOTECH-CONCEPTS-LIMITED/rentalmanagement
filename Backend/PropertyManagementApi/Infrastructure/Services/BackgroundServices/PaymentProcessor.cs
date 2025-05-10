using System;
using System.Collections.Generic;
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

            // Fire every 10s until cancellation
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
            try
            {
                while (await timer.WaitForNextTickAsync(stoppingToken))
                {
                    await ProcessAllPendingAsync();
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("PaymentProcessor is stopping.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure in ExecuteAsync");
            }
        }

        private async Task ProcessAllPendingAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

            // Load both lists in parallel
            var tenantTask = paymentService.GetPaymentsByStatusAsync(Pending);
            var utilTask = paymentService.GetUtilityPaymentByStatus(Pending);
            await Task.WhenAll(tenantTask, utilTask);

            var tenantPayments = tenantTask.Result;
            var utilityPayments = utilTask.Result;

            //start with utility payments
            foreach (var u in utilityPayments)
            {
                await ProcessUtilityPaymentAsync(u, collectoApi, paymentService, walletService);
            }

            // Then tenant payments
            foreach (var t in tenantPayments)
            {
                await ProcessTenantPaymentAsync(t, collectoApi, paymentService, walletService);
            }

            // Kick off all of them in parallel, isolating failures
            //var work = new List<Task>();
            //foreach (var u in utilityPayments)
            //    work.Add(ProcessUtilityPaymentAsync(u, collectoApi, paymentService, walletService));

            //foreach (var t in tenantPayments)
            //    work.Add(ProcessTenantPaymentAsync(t, collectoApi, paymentService, walletService));

            //await Task.WhenAll(work);
        }

        private async Task ProcessUtilityPaymentAsync(
            UtilityPayment payment,
            ICollectoApiClient collectoApi,
            IPaymentService paymentService,
            IWalletService walletService)
        {
            using var logScope = _logger.BeginScope(
                new { payment.TransactionID, payment.PaymentMethod });

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

        private async Task ProcessTenantPaymentAsync(
            TenantPayment payment,
            ICollectoApiClient collectoApi,
            IPaymentService paymentService,
            IWalletService walletService)
        {
            using var logScope = _logger.BeginScope(
                new { payment.TransactionId, payment.PaymentMethod });

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
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                resp = JsonSerializer.Deserialize<RequestToPayResponse>(raw, options);
                _logger.LogDebug("Parsed response: {@Resp}", resp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse Collecto response");
                throw;
            }
            //var resp = JsonSerializer.Deserialize<RequestToPayResponse>(raw);
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

        // Typed model for the Collecto response
        private class RequestToPayResponse
        {
            [JsonPropertyName("data")]
            public DataModel data { get; set; }
            [JsonPropertyName("status_message")]
            public string status_message { get; set; }

            public class DataModel
            {
                [JsonPropertyName("requestToPay")]
                public bool requestToPay { get; set; }
                [JsonPropertyName("transactionId")]
                [JsonConverter(typeof(NumberOrStringJsonConverter))]
                public string transactionId { get; set; }
                [JsonPropertyName("message")]
                public string message { get; set; }
            }
        }

        public class NumberOrStringJsonConverter : JsonConverter<string>
        {
            public override string Read(
                ref Utf8JsonReader reader,
                Type typeToConvert,
                JsonSerializerOptions options)
            {
                return reader.TokenType switch
                {
                    JsonTokenType.String => reader.GetString()!,
                    JsonTokenType.Number => reader.GetInt64().ToString(),
                    _ => throw new JsonException(
                           $"Cannot convert token of type {reader.TokenType} to string")
                };
            }

            public override void Write(
                Utf8JsonWriter writer,
                string value,
                JsonSerializerOptions options)
            {
                // Always emit as JSON string
                writer.WriteStringValue(value);
            }
        }


    }
}
