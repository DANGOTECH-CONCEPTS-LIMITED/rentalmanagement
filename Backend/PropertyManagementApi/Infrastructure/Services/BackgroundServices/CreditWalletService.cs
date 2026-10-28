using System;
using System.Collections.Generic;
using System.Linq;                      // for ToList()
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Entities.PropertyMgt;
using Infrastructure.Services.PaymentServices.WalletSvc;
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

        private async Task ProcessUtilityAsync(UtilityPayment payment, CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<CollectionWalletCreditService>()
                    .CreditUtilityAsync(payment.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing utility payment {PaymentId}", payment.Id);
            }
        }

        private async Task ProcessTenantAsync(TenantPayment payment, CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<CollectionWalletCreditService>()
                    .CreditRentAsync(payment.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing tenant payment {PaymentId}", payment.Id);
            }
        }
    }
}
