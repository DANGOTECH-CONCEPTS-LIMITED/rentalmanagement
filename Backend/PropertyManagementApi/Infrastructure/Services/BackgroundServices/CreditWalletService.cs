using System;
using System.Collections.Generic;
using System.Linq;                      // for ToList()
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

            using var timer = new PeriodicTimer(_pollInterval);
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    // 1) Fetch & materialize both lists in a short-lived scope
                    List<UtilityPayment> utilityPayments;
                    List<TenantPayment> tenantPayments;

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();

                        utilityPayments = (await paymentService
                                .GetUtilityPaymentByStatus(PaymentStatus.Pending))
                            .ToList();

                        tenantPayments = (await paymentService
                                .GetPaymentsByStatusAsync(PaymentStatus.Pending))
                            .ToList();
                    }

                    if (utilityPayments.Count>0 || tenantPayments.Count>0)
                    {
                        // 2) Process each payment in its own scope (parallel)
                        var tasks = new List<Task>(utilityPayments.Count + tenantPayments.Count);
                        foreach (var up in utilityPayments)
                            tasks.Add(ProcessUtilityAsync(up, stoppingToken));

                        foreach (var tp in tenantPayments)
                            tasks.Add(ProcessTenantAsync(tp, stoppingToken));

                        await Task.WhenAll(tasks);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in CreditWalletService polling loop");
                }
            }

            _logger.LogInformation("CreditWalletService stopping.");
        }

        private async Task ProcessUtilityAsync(UtilityPayment utilityPayment, CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();

            using (_logger.BeginScope(new { utilityPayment.TransactionID, utilityPayment.MeterNumber }))
            {
                try
                {
                    var wallet = await walletService
                        .GetWalletByUtilityMeterNumber(utilityPayment.MeterNumber);

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
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing utility payment");
                }
            }
        }

        private async Task ProcessTenantAsync(TenantPayment tenantPayment, CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();

            using (_logger.BeginScope(new { tenantPayment.TransactionId, tenantPayment.PropertyTenant.Property.OwnerId }))
            {
                try
                {
                    var ownerId = tenantPayment.PropertyTenant.Property.OwnerId;

                    // ensure landlord wallet exists
                    var wallet = await walletService.GetWalletByLandlordId(ownerId)
                                 ?? await walletService.CreateWallet(ownerId, 0m);

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
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing tenant payment");
                }
            }
        }
    }
}
