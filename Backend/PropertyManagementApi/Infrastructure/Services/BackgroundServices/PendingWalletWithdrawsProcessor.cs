using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    public class PendingWalletWithdrawsProcessor : BackgroundService
    {
        private const string PendingStatus = "PENDING";
        private const string PendingBankPayout = "PENDING_BANK_PAYOUT";
        private const string SucessfulAtTelecom = "SUCCESSFUL AT TELECOM";
        private const string FailedStatus = "FAILED AT TELECOM";
        private const string PendingAtTelcom = "PENDING AT TELCOM";
        private readonly ILogger<CheckPaymentStatusProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public PendingWalletWithdrawsProcessor(ILogger<CheckPaymentStatusProcessor> logger,
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

                    var wallet = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    var collecto = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

                    var pendingwithdraws = await wallet
                        .GetTransactionsByStatus(PendingStatus)
                        .ConfigureAwait(false);

                    var pendingBankPayouts = await wallet
                        .GetTransactionsByStatus(PendingBankPayout)
                        .ConfigureAwait(false);
                    foreach (var walletTransaction in pendingwithdraws)

                    {
                        //
                        // isolate each payment in its own try/catch
                        await ProcessSinglePaymentAsync(
                            walletTransaction,
                            collecto,
                            wallet,
                            stoppingToken);
                    }

                    foreach (var walletTransaction in pendingBankPayouts)
                    {
                        // isolate each payment in its own try/catch
                        await ProcessSingleBankPayoutPaymentAsync(
                            walletTransaction,
                            collecto,
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
            WalletTransaction walletTransaction,
            ICollectoApiClient collecto,
            IWalletService wallet,
            CancellationToken stoppingToken)
        {
            try
            {
                //make amount positive
                walletTransaction.Amount = Math.Abs(walletTransaction.Amount);
                //prepare initate payout request
                var request = new InitiatePayoutRequestDto
                {
                    Gateway = "mobilemoney",
                    SwiftCode = "",
                    Reference = walletTransaction.TransactionId,
                    AccountName = walletTransaction.Wallet.Landlord.FullName,
                    AccountNumber = walletTransaction.Wallet.Landlord.PhoneNumber,
                    Amount = walletTransaction.Amount,
                    Message = walletTransaction.Description,
                    Phone = walletTransaction.Wallet.Landlord.PhoneNumber
                };
                var rawResponse = await collecto.InitiatePayoutAsync(request);
                if (!string.IsNullOrWhiteSpace(rawResponse)) 
                {
                    var payoutResponse = JsonSerializer.Deserialize< PayoutResponse >(rawResponse);
                    if (payoutResponse.data.payout)
                    {
                        walletTransaction.Status = PendingAtTelcom;
                        walletTransaction.VendorTranId = payoutResponse.data.otherReference;
                        await wallet.UpdateWalletTransaction(walletTransaction);
                    }
                    else if (!payoutResponse.data.payout)
                    {
                        // Handle failed payments
                        walletTransaction.Status = FailedStatus;
                        walletTransaction.Description = payoutResponse.data.message;
                        await wallet.ReverseWalletTransaction(walletTransaction);
                    }
                }
                    
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing payment {ex.Message}");
            }
        }

        private async Task ProcessSingleBankPayoutPaymentAsync(
            WalletTransaction walletTransaction,
            ICollectoApiClient collecto,
            IWalletService wallet,
            CancellationToken stoppingToken)
        {
            try
            {
                //make amount positive
                walletTransaction.Amount = Math.Abs(walletTransaction.Amount);
                //prepare initate payout request
                var request = new InitiatePayoutBankRequestDto
                {
                    gateway = "bank",
                    bankName = walletTransaction.Wallet.Landlord.BankName,
                    bankSwiftCode = walletTransaction.Wallet.Landlord.SwiftCode,
                    accountNumber = walletTransaction.Wallet.Landlord.BankAccountNumber,
                    accountName = walletTransaction.Wallet.Landlord.FullName,
                    reference = walletTransaction.TransactionId,
                    amount = walletTransaction.Amount,
                    message = walletTransaction.Description,
                    phone = walletTransaction.Wallet.Landlord.PhoneNumber
                };
                var rawResponse = await collecto.InitiateBankPayoutAsync(request);
                if (!string.IsNullOrWhiteSpace(rawResponse))
                {
                    var payoutResponse = JsonSerializer.Deserialize<PayoutResponse>(rawResponse);
                    if (payoutResponse.data.payout)
                    {
                        walletTransaction.Status = "PENDING AT THE BANK";
                        walletTransaction.VendorTranId = payoutResponse.data.otherReference;
                        await wallet.UpdateWalletTransaction(walletTransaction);
                    }
                    else if (!payoutResponse.data.payout)
                    {
                        // Handle failed payments
                        walletTransaction.Status = FailedStatus;
                        walletTransaction.Description = payoutResponse.data.message;
                        await wallet.ReverseWalletTransaction(walletTransaction);
                    }
                }

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing payment {ex.Message}");
            }
        }


    }

    internal class PayoutResponse
    {
        public DataModel data { get; set; }
        public string status_message { get; set; }

        public class DataModel
        {
            public bool payout { get; set; }
            public string status { get; set; }
            public string message { get; set; }
            public string reference { get; set; }
            public string otherReference { get; set; }
        }
    }
}
