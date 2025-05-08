using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService.WalletSvc;
using Application.Interfaces.PaymentService;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Domain.Entities.PropertyMgt;
using Domain.Dtos.Collecto;
using System.Text.Json;

namespace Infrastructure.Services.BackgroundServices
{
    public class CheckPaymentStatusProcessor : BackgroundService
    {
        private const string PendingStatus = "PENDING AT TELCOM";
        private const string SucessfulAtTelecom = "SUCCESSFUL AT TELECOM";
        private const string FailedStatus = "FAILED AT TELECOM";
        private readonly ILogger<CheckPaymentStatusProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public CheckPaymentStatusProcessor(ILogger<CheckPaymentStatusProcessor> logger,
                                IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken) 
        {
            while (!stoppingToken.IsCancellationRequested) 
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var payment = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                    var wallet = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    var collecto = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

                   var pendingPayments = await payment.GetPaymentsByStatusAsync(PendingStatus).ConfigureAwait(false);

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
                // Wait for 10 seconds before checking again
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

            if (tenantPayment.PaymentMethod.Equals("MOMO", StringComparison.OrdinalIgnoreCase))
            {
                await HandleMomoAsync(tenantPayment, collecto, paymentService);
            }
            else
            {
                _logger.LogInformation("Delegating to other channels for non-MOMO payment");
            }
                
        }


        private async Task HandleMomoAsync(
            TenantPayment tenantPayment,
            ICollectoApiClient collectoApi,
            IPaymentService paymentService)
        {
            _logger.LogInformation("Requesting mobile-money payment");

            var request = new RequestToPayStatusRequestDto
            {
                TransactionId = tenantPayment.VendorTransactionId,
            };

            var rawResponse = await collectoApi.GetRequestToPayStatusAsync(request).ConfigureAwait(false);

            if (!string.IsNullOrWhiteSpace(rawResponse))
            {
                // deserialize into a typed model
                var rtpResponse = JsonSerializer.Deserialize<RequestToPayStatusResponse>(rawResponse);

                if (rtpResponse?.data?.requestToPayStatus == true)
                {
                    if (rtpResponse.data.status.Equals("SUCCESSFUL"))
                    {
                        tenantPayment.PaymentStatus = SucessfulAtTelecom;
                    }
                    else if (rtpResponse.data.status.Contains("FAILED"))
                    {
                        tenantPayment.PaymentStatus = FailedStatus;
                    }

                    await paymentService.UpdatePaymentStatus(
                        tenantPayment.PaymentStatus,
                        tenantPayment.TransactionId,
                        rtpResponse.data.message ?? string.Empty,tenantPayment.VendorTransactionId);
                    _logger.LogInformation("MOMO request accepted");
                }
                else
                {
                    tenantPayment.PaymentStatus = FailedStatus;
                    await paymentService.UpdatePaymentStatus(
                        FailedStatus,
                        tenantPayment.TransactionId,
                        rtpResponse?.data?.message ?? "Unknown error",
                        string.Empty);
                    _logger.LogError("MOMO request failed");
                }
                _logger.LogError("Empty response from Collecto");
                return;
            }

            
        }
    }

    internal class RequestToPayStatusResponse
    {
        public DataModel data { get; set; }
        public string status_message { get; set; }

        public class DataModel
        {
            public bool requestToPayStatus { get; set; }
            public string status { get; set; }
            public string message { get; set; }
        }
    }
}
