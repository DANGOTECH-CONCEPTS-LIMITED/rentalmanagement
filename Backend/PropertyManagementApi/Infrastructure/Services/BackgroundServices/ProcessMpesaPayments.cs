using Application.Interfaces.PaymentService;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.BackgroundServices
{
    public class ProcessMpesaPayments : BackgroundService
    {
        private readonly ILogger<ProcessMpesaPayments> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public ProcessMpesaPayments(
            ILogger<ProcessMpesaPayments> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("⏳ ProcessMpesaPayments started.");
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
            try
            {
                while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
                {
                    await SafeProcessAllPendingAsync(stoppingToken);
                    _logger.LogInformation("Processing Mpesa payments...");
                }
            }
            catch (OperationCanceledException)
            {
                // shutdown requested
            }
            _logger.LogInformation("✅ ProcessMpesaPayments stopping.");
        }


        private async Task SafeProcessAllPendingAsync(CancellationToken ct)
        {
            try
            {
                List<UtilityPayment> utilityPayments;
                using (var scope = _scopeFactory.CreateScope())
                {
                    var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                    utilityPayments = (await paymentSvc.GetMpesaPaymentsFromCallBack()).ToList();
                }

                var tasks = new List<Task>();
                using var throttler = new SemaphoreSlim(10); // limit concurrency
                async Task RunSafe(Func<Task> work)
                {
                    await throttler.WaitAsync(ct);
                    try
                    {
                        await work();
                    }
                    finally
                    {
                        throttler.Release();
                    }
                }

                foreach (var u in utilityPayments)
                {
                    tasks.Add(Task.Run(() => RunSafe(() => ProcessMpesaTransAsync(u, ct)), ct));
                }

                await Task.WhenAll(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Mpesa payments.");
            }
        }

        private async Task ProcessMpesaTransAsync(UtilityPayment utilityPayment, CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            try
            {
                await paymentSvc.MakeMPesaUtilityPayment(utilityPayment);
                await paymentSvc.UpdateMpesaProcessedPaymt(utilityPayment.VendorTranId, utilityPayment.TransactionID);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing Mpesa transaction {utilityPayment.TransactionID}.");
            }
        }
    }
}
