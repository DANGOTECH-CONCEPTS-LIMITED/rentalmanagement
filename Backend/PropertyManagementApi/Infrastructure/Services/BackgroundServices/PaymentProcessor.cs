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
        private readonly ILogger<PaymentProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        public  PaymentProcessor(ILogger<PaymentProcessor> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Billing Processing Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                // Create the scope once for the entire loop
                using (var scope = _scopeFactory.CreateScope())
                {
                    var payment = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                    var wallet = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    var collecto = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

                    try
                    {
                        var pendingpayments = await payment.GetPaymentsByStatusAsync("PENDING");
                        await ProcessPendingPayments(pendingpayments, collecto, payment);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogInformation($"Bill Period Error {ex.Message}.");
                    }

                }

                // delay to prevent busy-waiting and high CPU usage
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);  // Delay for 10 minutes
            }
        }

        private async Task ProcessPendingPayments(IEnumerable<TenantPayment> tenantPayments, ICollectoApiClient collectoApi, IPaymentService paymentService)
        {
            foreach (var tenantPayment in tenantPayments)
            {
                // Process each payment
                // check if payment is momo
                if (tenantPayment.PaymentMethod == "MOMO")
                {
                    // send request to pay request to collecto
                    var requestToPay = new RequestToPayRequest
                    {
                        PaymentOption = tenantPayment.PaymentMethod,
                        Phone = tenantPayment.PropertyTenant.PhoneNumber,
                        Amount = (decimal)tenantPayment.Amount,
                        Reference = tenantPayment.TransactionId
                    };


                    var response = await collectoApi.RequestToPayAsync(requestToPay);
                    // Handle the response from Collecto
                    if (response != null) 
                    {
                        // Update the payment status in your database
                        tenantPayment.PaymentStatus = "PENDING AT TELCOM";
                        // await _context.SaveChangesAsync(); // Save changes to the database
                    }
                    else
                    {
                        // Handle error case
                        _logger.LogError($"Failed to process Momo payment for Tenant ID: {tenantPayment.TransactionId}");
                    }

                    _logger.LogInformation($"Processing Momo payment for Tenant ID: {tenantPayment.TransactionId}");
                }
                else
                {
                    // Handle other payment methods
                    // await wallet.ProcessOtherPaymentAsync(tenantPayment);
                    _logger.LogInformation($"Processing other payment for Tenant ID: {tenantPayment.TransactionId}");
                }
                // For example, you might want to call a method to process the payment
                // await ProcessPaymentAsync(tenantPayment);
                _logger.LogInformation($"Processing payment for Tenant ID: {tenantPayment.TransactionId}");
            }
        }
    }
}
