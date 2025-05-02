using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Entities.Collecto;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    public class PaymentProcessor : BackgroundService
    {
        private const string PendingStatus = "PENDING";
        private const string PendingAtTelcom = "PENDING AT TELCOM";
        private const string FailedStatus = "FAILED";

        private readonly ILogger<PaymentProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public PaymentProcessor(ILogger<PaymentProcessor> logger,
                                IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Billing Processing Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var payment = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                    var wallet = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    var collecto = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

                    var pendingPayments = await payment
                        .GetPaymentsByStatusAsync(PendingStatus)
                        .ConfigureAwait(false);

                    foreach (var tenantPayment in pendingPayments)
                    {
                        // isolate each payment in its own try/catch
                        await ProcessSinglePaymentAsync(
                            tenantPayment,
                            collecto,
                            payment,
                            wallet,
                            stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching or processing payments");
                }

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken)
                          .ConfigureAwait(false);
            }
        }

        private async Task ProcessSinglePaymentAsync(
            TenantPayment tenantPayment,
            ICollectoApiClient collecto,
            IPaymentService paymentService,
            IWalletService walletService,
            CancellationToken cancellationToken)
        {
            using var logScope = _logger.BeginScope(
                new { tenantPayment.TransactionId, tenantPayment.PaymentMethod });

            try
            {
                if (tenantPayment.PaymentMethod.Equals("MOMO", StringComparison.OrdinalIgnoreCase))
                {
                    await HandleMomoAsync(tenantPayment, collecto, paymentService);
                }
                else
                {
                    _logger.LogInformation("Delegating to wallet for non-MOMO payment");
                    //await walletService.ProcessOtherPaymentAsync(tenantPayment);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment");
            }
        }

        private async Task HandleMomoAsync(
            TenantPayment tenantPayment,
            ICollectoApiClient collectoApi,
            IPaymentService paymentService)
        {
            _logger.LogInformation("Requesting mobile-money payment");

            var request = new RequestToPayRequest
            {
                PaymentOption = "mobilemoney",
                Phone = tenantPayment.PropertyTenant.PhoneNumber,
                Amount = (decimal)tenantPayment.Amount,
                Reference = tenantPayment.TransactionId
            };

            var rawResponse = await collectoApi
                .RequestToPayAsync(request)
                .ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(rawResponse))
            {
                tenantPayment.PaymentStatus = FailedStatus;
                await paymentService.UpdatePaymentStatus(
                    FailedStatus,
                    tenantPayment.TransactionId,
                    "Empty response from Collecto",
                    string.Empty);
                _logger.LogError("Empty response from Collecto");
                return;
            }

            // deserialize into a typed model
            var rtpResponse = JsonSerializer.Deserialize<RequestToPayResponse>(rawResponse);

            if (rtpResponse?.Data?.RequestToPay == true)
            {
                tenantPayment.PaymentStatus = PendingAtTelcom;
                await paymentService.UpdatePaymentStatus(
                    PendingAtTelcom,
                    tenantPayment.TransactionId,
                    rtpResponse.StatusMessage ?? string.Empty,
                    rtpResponse.Data.TransactionId ?? string.Empty);
                _logger.LogInformation("MOMO request accepted");
            }
            else
            {
                tenantPayment.PaymentStatus = FailedStatus;
                await paymentService.UpdatePaymentStatus(
                    FailedStatus,
                    tenantPayment.TransactionId,
                    rtpResponse?.Data?.Message ?? "Unknown error",
                    string.Empty);
                _logger.LogError("MOMO request failed");
            }
        }
    }

    // Strongly-typed response model to replace manual JsonDocument parsing
    internal class RequestToPayResponse
    {
        public DataModel Data { get; set; }
        public string StatusMessage { get; set; }

        public class DataModel
        {
            public bool RequestToPay { get; set; }
            public string TransactionId { get; set; }
            public string Message { get; set; }
        }
    }
}
