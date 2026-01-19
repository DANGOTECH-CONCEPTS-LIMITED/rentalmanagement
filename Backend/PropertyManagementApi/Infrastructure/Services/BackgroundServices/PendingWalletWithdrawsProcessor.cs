using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Dtos.Collecto;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Infrastructure.Services.BackgroundServices.PayoutResponse;

namespace Infrastructure.Services.BackgroundServices
{
    public class PendingWalletWithdrawsProcessor : BackgroundService
    {
        private const string PendingStatus = "PENDING";
        private const string PendingBankPayout = "PENDING_BANK_PAYOUT";
        private const string SucessfulAtTelecom = "SUCCESSFUL AT TELECOM";
        private const string SucessfulAtBank = "SUCCESSFUL AT THE BANK";
        private const string SucessfulWalletTransfer = "SUCCESSFUL_WALLET_TRANSFER";
        private const string FailedAtBank = "FAILED AT THE BANK";
        private const string FailedAtWalletTransfer = "FAILED_WALLET_TRANSFER";
        private const string FailedStatus = "FAILED AT TELECOM";
        private const string PendingAtTelcom = "PENDING AT TELCOM";
        private const string PendingWalletPayout = "PENDING_WALLET_PAYOUT";
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

                    var pendingWalletPayouts = await wallet
                        .GetTransactionsByStatus(PendingWalletPayout)
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

                    foreach (var walletTransaction in pendingWalletPayouts)
                    {
                        // isolate each payment in its own try/catch
                        await ProcessSingleWalletPayoutPaymentAsync(
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
                if(walletTransaction.Amount > 5000) 
                {
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
                

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing payment {ex.Message}");
            }
        }


        private async Task ProcessSingleWalletPayoutPaymentAsync(
            WalletTransaction walletTransaction,
            ICollectoApiClient collecto,
            IWalletService wallet,
            CancellationToken stoppingToken)
        {
            try
            {
                //make amount positive
                walletTransaction.Amount = Math.Abs(walletTransaction.Amount);
                if (walletTransaction.Amount > 5000)
                {
                    //prepare initate payout request
                    var request = new CollectoWithdrawRequest 
                    {
                        Reference = walletTransaction.TransactionId,
                        Message = walletTransaction.Description,
                        Amount = walletTransaction.Amount,
                        ReceivingWallet = long.Parse(walletTransaction.Wallet.Landlord.BankAccountNumber)//long.Parse(walletTransaction.Wallet.Landlord.CollectoWalletId)
                    };
                    //var request = new InitiatePayoutBankRequestDto
                    //{
                    //    gateway = "bank",
                    //    bankName = walletTransaction.Wallet.Landlord.BankName,
                    //    bankSwiftCode = walletTransaction.Wallet.Landlord.SwiftCode,
                    //    accountNumber = walletTransaction.Wallet.Landlord.BankAccountNumber,
                    //    accountName = walletTransaction.Wallet.Landlord.FullName,
                    //    reference = walletTransaction.TransactionId,
                    //    amount = walletTransaction.Amount,
                    //    message = walletTransaction.Description,
                    //    phone = walletTransaction.Wallet.Landlord.PhoneNumber
                    //};

                    var rawResponse = await collecto.WithdrawToCollectoApi(request);
                    if (!string.IsNullOrWhiteSpace(rawResponse))
                    {
                        var payoutResponse = JsonSerializer.Deserialize<CollectoWithdrawResponse>(rawResponse);
                        if (payoutResponse.data.walletToWallet)
                        {
                            walletTransaction.Status = SucessfulWalletTransfer;
                            walletTransaction.VendorTranId = payoutResponse.data.transactionId;
                            walletTransaction.ReasonAtTelecom = payoutResponse.data.message;
                            await wallet.UpdateWalletTransaction(walletTransaction);
                        }
                        else if (!payoutResponse.data.walletToWallet)
                        {
                            // Handle failed payments
                            walletTransaction.Status = FailedAtWalletTransfer;
                            walletTransaction.ReasonAtTelecom = payoutResponse.data.message;
                            await wallet.ReverseWalletTransaction(walletTransaction);
                        }
                    }
                }


            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing payment {ex.Message}");
            }
        }


    }


    internal class CollectoWithdrawResponse
    {
        public string status { get; set; }
        public string status_message { get; set; }
        public DataModel data { get; set; }
        public class DataModel {
            public string transactionId { get; set; }
            public string message { get; set; }
            public bool walletToWallet { get; set; }
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
