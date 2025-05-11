using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces.PaymentService;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    public class ProcessPendingTokenTransactions : BackgroundService
    {
        private const string Successful = "SUCCESSFUL";
        private readonly ILogger<ProcessPendingTokenTransactions> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        public ProcessPendingTokenTransactions(
            ILogger<ProcessPendingTokenTransactions> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ProcessPendingTokenTransactions started.");
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
            while (await timer.WaitForNextTickAsync(stoppingToken))
                await ProcessAllPendingAsync(stoppingToken);
        }

        private async Task ProcessAllPendingAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var tokenpayments = scope.ServiceProvider.GetRequiredService<IPaymentService>();

            var pendingTransactions = await tokenpayments
                .GetPaymentsByStatusAsync(Successful)
                .ConfigureAwait(false);
            foreach (var transaction in pendingTransactions)
            {
                try
                {
                    var response = await collecto
                        .ProcessTokenTransaction(transaction)
                        .ConfigureAwait(false);
                    // Handle the response as needed
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing transaction {TransactionId}", transaction.Id);
                }
            }
        }
    }
}
