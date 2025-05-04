using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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
        private const string PendingStatus = "SUCCESSFUL AT TELECOM";
        private const string Successful = "SUCCESSFUL";
        private const string FailedStatus = "FAILED AT TELECOM";
        private readonly ILogger<CreditWalletService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        public CreditWalletService(ILogger<CreditWalletService> logger,
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
                    // Add your logic here to process the credit wallet transactions
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing credit wallet transactions");
                }
                // Wait for a while before checking again
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken)
                          .ConfigureAwait(false);
            }
        }
        private async Task ProcessSinglePaymentAsync(
            TenantPayment tenantPayment,
            ICollectoApiClient collecto,
            IPaymentService payment,
            IWalletService wallet,
            CancellationToken stoppingToken)
        {
            try
            {
                // Call the Collecto API to check the payment status

                var wllt = await wallet.GetWalletByLandlordId(tenantPayment.PropertyTenant.Property.OwnerId);
                //check if wallet exists
                if (wllt == null)
                {
                    wllt = await wallet.CreateWallet(tenantPayment.PropertyTenant.Property.OwnerId, 0);
                }
                //credit wallet
                var walletTrannsaction = new WalletTransaction
                {
                    Amount = (decimal)tenantPayment.Amount,
                    Description = $"{tenantPayment.Description}. Tenant {tenantPayment.PropertyTenant.FullName}",
                    TransactionDate = DateTime.UtcNow,
                    WalletId = wllt.Id // Assuming you have a WalletId in TenantPayment
                };

                await wallet.AddWalletTransaction(walletTrannsaction);
                tenantPayment.PaymentStatus = Successful;
                await payment.UpdatePaymentAsync(tenantPayment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing single payment");
            }
        }
    }
}
