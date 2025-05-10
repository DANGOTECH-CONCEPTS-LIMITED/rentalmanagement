using System;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    public class CreditWalletService : BackgroundService
    {
        private static class PaymentStatus
        {
            public const string Pending = "SUCCESSFUL AT TELECOM";
            public const string Completed = "SUCCESSFUL";
            public const string Failed = "FAILED AT TELECOM";
        }

        private readonly ILogger<CreditWalletService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(10);

        public CreditWalletService(
            ILogger<CreditWalletService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("CreditWalletService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                    var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    var collectoClient = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

                    var utilityPayments = await paymentService.GetUtilityPaymentByStatus(PaymentStatus.Pending);
                    var tenantPayments = await paymentService.GetPaymentsByStatusAsync(PaymentStatus.Pending);

                    await ProcessPaymentsAsync(
                        utilityPayments,
                        (up) => ProcessUtilityAsync(up, collectoClient, paymentService, walletService, stoppingToken),
                        stoppingToken);

                    await ProcessPaymentsAsync(
                        tenantPayments,
                        (tp) => ProcessTenantAsync(tp, collectoClient, paymentService, walletService, stoppingToken),
                        stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in polling loop of CreditWalletService");
                }

                try
                {
                    await Task.Delay(_pollInterval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // service is stopping
                }
            }

            _logger.LogInformation("CreditWalletService stopping.");
        }

        private async Task ProcessPaymentsAsync<T>(
            IEnumerable<T> payments,
            Func<T, Task> processor,
            CancellationToken cancellationToken)
        {
            foreach (var payment in payments)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                try
                {
                    await processor(payment);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing payment of type {PaymentType}", typeof(T).Name);
                }
            }
        }

        private async Task ProcessUtilityAsync(
            UtilityPayment utilityPayment,
            ICollectoApiClient collecto,
            IPaymentService paymentService,
            IWalletService walletService,
            CancellationToken cancellationToken)
        {
            var wallet = await walletService.GetWalletByUtilityMeterNumber(utilityPayment.MeterNumber);
            if (wallet == null)
            {
                _logger.LogWarning("No wallet found for meter {Meter}. Skipping.", utilityPayment.MeterNumber);
                return;
            }

            var transaction = new WalletTransaction
            {
                Amount = (decimal)utilityPayment.Amount,
                Description = $"{utilityPayment.Description}. Meter {utilityPayment.MeterNumber}",
                TransactionDate = DateTime.UtcNow,
                WalletId = wallet.Id
            };

            await walletService.AddWalletTransaction(transaction);
            await paymentService.UpdatePaymentStatus(
                PaymentStatus.Completed,
                utilityPayment.TransactionID,
                utilityPayment.ReasonAtTelecom,
                utilityPayment.VendorTranId,
                "UTILITY");
        }

        private async Task ProcessTenantAsync(
            TenantPayment tenantPayment,
            ICollectoApiClient collecto,
            IPaymentService paymentService,
            IWalletService walletService,
            CancellationToken cancellationToken)
        {
            var ownerId = tenantPayment.PropertyTenant.Property.OwnerId;
            var wallet = await walletService.GetWalletByLandlordId(ownerId);
            if (wallet == null)
            {
                wallet = await walletService.CreateWallet(ownerId, 0);
            }

            var transaction = new WalletTransaction
            {
                Amount = (decimal)tenantPayment.Amount,
                Description = $"{tenantPayment.Description}. Tenant {tenantPayment.PropertyTenant.FullName}",
                TransactionDate = DateTime.UtcNow,
                WalletId = wallet.Id
            };

            await walletService.AddWalletTransaction(transaction);
            tenantPayment.PaymentStatus = PaymentStatus.Completed;
            await paymentService.UpdatePaymentAsync(tenantPayment);
        }
    }
}
