using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Application.Interfaces.PrepaidApi;
using Application.Interfaces.UserServices;
using Domain.Dtos.Payments.WalletDto;
using Domain.Dtos.PrepaidApi;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Services.BackgroundServices
{
    public class ProcessPendingTokenTransactions : BackgroundService
    {
        private readonly ILogger<ProcessPendingTokenTransactions> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        // throttle to at most N concurrent purchase calls
        private const int MaxConcurrency = 5;
        private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);

        public ProcessPendingTokenTransactions(
            ILogger<ProcessPendingTokenTransactions> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("⏳ ProcessPendingTokenTransactions started.");
            using var timer = new PeriodicTimer(PollInterval);

            try
            {
                while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
                    await SafeProcessAllPendingAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // shutdown requested
            }

            _logger.LogInformation("✅ ProcessPendingTokenTransactions stopping.");
        }

        private async Task SafeProcessAllPendingAsync(CancellationToken ct)
        {
            try
            {
                await ProcessAllPendingAsync(ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in ProcessAllPendingAsync");
            }
        }

        private async Task ProcessAllPendingAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var paymentService = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var prepaidClient = scope.ServiceProvider.GetRequiredService<IPrepaidApiClient>();
            var user = scope.ServiceProvider.GetRequiredService<IUserService>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();

            var pending = await paymentService
                .GetUtilityPymtsPendingTokenGeneration()
                .ConfigureAwait(false);

            if (!pending.Any())
            {
                _logger.LogDebug("No pending transactions.");
                return;
            }

            using var semaphore = new SemaphoreSlim(MaxConcurrency);

            var tasks = pending.Select(async tx =>
            {
                // wait for a "slot"
                await semaphore.WaitAsync(ct).ConfigureAwait(false);
                try
                {
                    await ProcessSingleTransactionAsync(tx, paymentService, prepaidClient, user, walletService, ct)
                        .ConfigureAwait(false);
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks).ConfigureAwait(false);
        }

        private async Task ProcessSingleTransactionAsync(
            UtilityPayment transaction,
            IPaymentService paymentService,
            IPrepaidApiClient prepaidClient, IUserService userService, IWalletService walletService,
            CancellationToken ct)
        {
            try
            {
                var preview = new PurchasePreviewDto
                {
                    MeterNumber = transaction.MeterNumber,
                    Amount = (decimal)transaction.Amount
                };

                var response = await prepaidClient
                    .PurchaseAsync(preview)
                    .ConfigureAwait(false);

                if (response.ResultCode == 0)
                {
                    transaction.Token = response.Result.Token;
                    transaction.Units = response.Result.TotalUnit.ToString();
                    transaction.IsTokenGenerated = true;
                    await paymentService
                        .UpdateUtilityPayment(transaction)
                        .ConfigureAwait(false);

                    var user = await userService
                        .GetUserByUtilityMeter(transaction.MeterNumber)
                        .ConfigureAwait(false);

                    //check if user has bank account linked
                    if (!string.IsNullOrEmpty(user.BankAccountNumber))
                    {
                        // initiate automatic withdrawal from the wallet
                        // get wallet id by meter number
                        var wallet = await walletService
                            .GetWalletByUtilityMeterNumber(transaction.MeterNumber)
                            .ConfigureAwait(false);

                        // create withdraw dto
                        var withdrawDto = new WithdrawDto
                        {
                            landlordid = wallet.LandlordId,
                            amount = (decimal)transaction.Amount,
                            description = $"Automatic withdrawal for utility payment transaction {transaction.Id} to bank account {user.BankAccountNumber}"
                        };

                        await walletService
                            .WithdrawAsync(withdrawDto)
                            .ConfigureAwait(false);

                    }




                    _logger.LogInformation(
                        "✔ Transaction {TransactionId} processed successfully.",
                        transaction.Id);
                }
                else
                {
                    _logger.LogWarning(
                        "⚠ Transaction {TransactionId} returned code {ResultCode}.",
                        transaction.Id, response.ResultCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing transaction {TransactionId}",
                    transaction.Id);
            }
        }
    }
}
