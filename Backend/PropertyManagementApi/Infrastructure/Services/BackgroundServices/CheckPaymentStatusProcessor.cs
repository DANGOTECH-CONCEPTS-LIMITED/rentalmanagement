using System;
using System.Collections.Generic;
using System.Linq;                      // for ToList()
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Application.Interfaces.ServiceLogs;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    // Note: Ensure database indexes on Status and TransactionId columns in TenantPayments, UtilityPayments, and WalletTransactions tables for better query performance.
    public class CheckPaymentStatusProcessor : BackgroundService
    {
        private const string PendingAtTelcom = "PENDING AT TELCOM";
        private const string SuccessAtTelecom = "SUCCESSFUL AT TELECOM";
        private const string FailedAtTelecom = "FAILED AT TELECOM";
        private const string SuccessFul = "SUCCESSFUL";
        private const string PENDING_AT_BANK = "PENDING AT THE BANK";
        private const string FailedAtBank = "FAILED AT THE BANK";
        private const string SuccessAtBank = "SUCCESSFUL AT THE BANK";
        private const string UnknownStatus = "UNKNOWN";

        private readonly ILogger<CheckPaymentStatusProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

        public CheckPaymentStatusProcessor(
            ILogger<CheckPaymentStatusProcessor> logger,
            IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("CheckPaymentStatusProcessor started.");

            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1)); // was 10
            try
            {
                while (await timer.WaitForNextTickAsync(stoppingToken))
                    await ProcessAllPendingAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("CheckPaymentStatusProcessor stopping.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error in ExecuteAsync");
            }
        }

        private async Task ProcessAllPendingAsync(CancellationToken ct)
        {
            List<TenantPayment> tenantPayments;
            List<UtilityPayment> utilityPayments;
            List<WalletTransaction> walletTransactions;
            List<WalletTransaction> pendingatbank;

            using (var scope = _scopeFactory.CreateScope())
            {
                var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
                tenantPayments = (await paymentSvc.GetPaymentsByStatusAsync(PendingAtTelcom)).ToList();
                utilityPayments = (await paymentSvc.GetUtilityPaymentByStatus(PendingAtTelcom)).ToList();
                walletTransactions = (await paymentSvc.GetWalletTransactionByStatus(PendingAtTelcom)).ToList();
                pendingatbank = (await paymentSvc.GetWalletTransactionByStatus(PENDING_AT_BANK)).ToList();
            }

            var tasks = new List<Task>();
            using var throttler = new SemaphoreSlim(10); // limit concurrency

            async Task RunSafe(Func<Task> work, string context, string transactionId)
            {
                await throttler.WaitAsync(ct);
                try
                {
                    await work();
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Task cancelled for {Context} TxId: {TransactionId}", context, transactionId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing {Context} TxId: {TransactionId}", context, transactionId);
                    using var scope = _scopeFactory.CreateScope();
                    var servicelog = scope.ServiceProvider.GetRequiredService<IServiceLogsRepository>();
                    await servicelog.LogErrorAsync(
                        "CheckPaymentStatusProcessor",
                        $"Error processing {context}. TxId: {transactionId}",
                        "Exception",
                        ex.ToString());
                }
                finally
                {
                    throttler.Release();
                }
            }

            foreach (var t in tenantPayments)
            {
                tasks.Add(RunSafe(
                    () => ProcessStatusAsync(t.TransactionId, t.VendorTransactionId, "RENT", "MOMO", ct),
                    $"tenant payment {t.TransactionId}",
                    t.TransactionId));
            }

            foreach (var u in utilityPayments)
            {
                tasks.Add(RunSafe(
                    () => ProcessStatusAsync(u.TransactionID!, u.VendorTranId!, "UTILITY", "MOMO", ct),
                    $"utility payment {u.TransactionID}",
                    u.TransactionID!));
            }

            foreach (var w in walletTransactions)
            {
                tasks.Add(RunSafe(
                    () => ProcessStatusAsync(w.TransactionId, w.TransactionId, "WALLET", "MOMO", ct),
                    $"wallet transaction {w.TransactionId}",
                    w.TransactionId));
            }

            foreach (var b in pendingatbank)
            {
                tasks.Add(RunSafe(
                    () => ProcessStatusAsync(b.TransactionId, b.TransactionId, "WALLET", "BANK", ct),
                    $"wallet transaction pending at bank {b.TransactionId}",
                    b.TransactionId));
            }

            await Task.WhenAll(tasks);
        }

        private async Task ProcessStatusAsync(
            string transactionId,
            string vendorTranId,
            string tranType,string type,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
            {
                _logger.LogError("TransactionId is null or empty");
                return;
            }
            if (string.IsNullOrWhiteSpace(tranType))
            {
                _logger.LogError("TranType is null or empty for TransactionId: {TransactionId}", transactionId);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();
            var servicelog = scope.ServiceProvider.GetRequiredService<IServiceLogsRepository>();

            using (_logger.BeginScope(new { transactionId, vendorTranId, tranType }))
            {
                try
                {
                    _logger.LogInformation("Checking status with Collecto");
                    var responseJson = await GetApiResponseWithRetryAsync(collectoApi, transactionId, vendorTranId, tranType, type, ct);

                    if (string.IsNullOrWhiteSpace(responseJson))
                    {
                        _logger.LogError("Empty response from Collecto");
                        return;
                    }

                    if (tranType.Equals("WALLET", StringComparison.OrdinalIgnoreCase))
                    {
                        var payout = JsonSerializer.Deserialize<PayoutStatusResponse>(responseJson, _jsonOptions);

                        if (payout == null || payout.data == null || payout.data.data.Count == 0)
                        {
                            _logger.LogInformation("No payout records found; skipping.");
                            return;
                        }

                        var item = payout.data.data.First();
                        var status = item.status?.Trim()?.ToUpperInvariant() ?? string.Empty;

                        if (status == "SUCCESSFUL")
                        {
                            if(type.Equals("BANK", StringComparison.OrdinalIgnoreCase))
                            {
                                var walletTx = new WalletTransaction
                                {
                                    TransactionId = transactionId,
                                    Description = string.IsNullOrWhiteSpace(item.status_message) ? item.message : item.status_message,
                                    Status = SuccessAtBank,
                                    TransactionDate = DateTime.UtcNow,
                                    VendorTranId = item.transaction_id,
                                    ReasonAtTelecom = item.status_message
                                };
                                await paymentSvc.UpdateWalletTransaction(walletTx);
                                _logger.LogInformation("Wallet payout marked SUCCESSFUL AT BANK");
                                return;
                            }
                            else 
                            {
                                var walletTx = new WalletTransaction
                                {
                                    TransactionId = transactionId,
                                    Description = string.IsNullOrWhiteSpace(item.status_message) ? item.message : item.status_message,
                                    Status = SuccessFul,
                                    TransactionDate = DateTime.UtcNow,
                                    VendorTranId = item.transaction_id,
                                    ReasonAtTelecom = item.status_message
                                };
                                await paymentSvc.UpdateWalletTransaction(walletTx);
                                _logger.LogInformation("Wallet payout marked SUCCESSFUL AT TELECOM");
                                return;
                            }
                                
                        }
                        else if (status == "FAILED")
                        {
                            if (type.Equals("BANK", StringComparison.OrdinalIgnoreCase))
                            {
                                var walletTx = new WalletTransaction
                                {
                                    TransactionId = transactionId,
                                    Description = string.IsNullOrWhiteSpace(item.status_message) ? item.message : item.status_message,
                                    Status = FailedAtBank,
                                    TransactionDate = DateTime.UtcNow,
                                    VendorTranId = item.transaction_id,
                                    ReasonAtTelecom = item.status_message
                                };
                                await paymentSvc.ReverseWalletTransaction(walletTx);
                                _logger.LogInformation("Wallet payout marked FAILED AT BANK and reversed");
                                return;
                            }
                            else 
                            {
                                var walletTx = new WalletTransaction
                                {
                                    TransactionId = transactionId,
                                    Description = string.IsNullOrWhiteSpace(item.status_message) ? item.message : item.status_message,
                                    Status = FailedAtTelecom,
                                    TransactionDate = DateTime.UtcNow,
                                    VendorTranId = item.transaction_id,
                                    ReasonAtTelecom = item.status_message
                                };
                                await paymentSvc.ReverseWalletTransaction(walletTx);
                                _logger.LogInformation("Wallet payout marked FAILED AT TELECOM and reversed");
                                return;
                            }     
                        }
                        else
                        {
                            _logger.LogWarning("Unhandled status '{Status}' for wallet transaction {TransactionId}", status, transactionId);
                            // Optionally, update to UNKNOWN
                            var walletTx = new WalletTransaction
                            {
                                TransactionId = transactionId,
                                Description = "Unknown status from API",
                                Status = UnknownStatus,
                                TransactionDate = DateTime.UtcNow,
                                VendorTranId = item.transaction_id,
                                ReasonAtTelecom = item.status_message
                            };
                            await paymentSvc.UpdateWalletTransaction(walletTx);
                            return;
                        }
                    }
                    else
                    {
                        var dto = JsonSerializer.Deserialize<RequestToPayStatusResponse>(responseJson, _jsonOptions);

                        if (dto == null || dto.data == null)
                        {
                            _logger.LogError("Invalid response structure from Collecto for TransactionId: {TransactionId}", transactionId);
                            return;
                        }

                        if (dto.data.requestToPayStatus != true)
                        {
                            if (dto.data.status?.Equals("Undetermined", StringComparison.OrdinalIgnoreCase) == true)
                            {
                                _logger.LogInformation("Status is undetermined, skipping update");
                                return;
                            }
                            else if (dto.data.status?.Equals("PENDING", StringComparison.OrdinalIgnoreCase) == true)
                            {
                                _logger.LogInformation("Status is still pending, skipping update");
                                return;
                            }
                            else if (dto.data.status?.Equals("SUCCESSFUL", StringComparison.OrdinalIgnoreCase) == true)
                            {
                                await paymentSvc.UpdatePaymentStatus(
                                    SuccessAtTelecom,
                                    transactionId,
                                    dto.data.message ?? string.Empty,
                                    vendorTranId,
                                    tranType);
                                _logger.LogInformation("Status updated to {NewStatus}", SuccessAtTelecom);
                                return;
                            }
                            else if (dto.data.status?.Equals("FAILED", StringComparison.OrdinalIgnoreCase) == true)
                            {
                                await paymentSvc.UpdatePaymentStatus(
                                    FailedAtTelecom,
                                    transactionId,
                                    dto.data.message ?? string.Empty,
                                    vendorTranId,
                                    tranType);
                                _logger.LogInformation("Status updated to {NewStatus}", FailedAtTelecom);
                                return;
                            }

                            _logger.LogError("Collecto returned requestToPayStatus=false with status '{Status}' for TransactionId: {TransactionId}", dto.data.status, transactionId);
                            await paymentSvc.UpdatePaymentStatus(
                                FailedAtTelecom,
                                transactionId,
                                dto.data.message ?? "Unknown error",
                                vendorTranId,
                                tranType);
                            return;
                        }
                        else if (!dto.data.status?.Equals("PENDING", StringComparison.OrdinalIgnoreCase) == true)
                        {
                            var newStatus = dto.data.status?.Equals("SUCCESSFUL", StringComparison.OrdinalIgnoreCase) == true
                                ? SuccessAtTelecom
                                : FailedAtTelecom;

                            await paymentSvc.UpdatePaymentStatus(
                                newStatus,
                                transactionId,
                                dto.data.message ?? string.Empty,
                                vendorTranId,
                                tranType);
                            _logger.LogInformation("Status updated to {NewStatus}", newStatus);
                        }
                    }
                }
                catch (Exception ex)
                {
                    await servicelog.LogErrorAsync(
                        "CheckPaymentStatusProcessor",
                        $"Error in status check. TxId: {transactionId}, Type: {tranType}",
                        "Exception",
                        ex.ToString());
                    _logger.LogError(ex, "Error in status check for TxId: {TransactionId}", transactionId);
                }
            }
        }

        private async Task<string> GetApiResponseWithRetryAsync(ICollectoApiClient collectoApi, string transactionId, string vendorTranId, string tranType, string type, CancellationToken ct)
        {
            const int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    if (tranType.Equals("WALLET", StringComparison.OrdinalIgnoreCase))
                    {
                        if (type.Equals("BANK", StringComparison.OrdinalIgnoreCase))
                        {
                            return await collectoApi.GetPayoutStatusAsync(new PayoutStatusRequestDto
                            {
                                Gateway = "bank",
                                Reference = transactionId
                            });
                        }
                        else
                        {
                            return await collectoApi.GetPayoutStatusAsync(new PayoutStatusRequestDto
                            {
                                Gateway = "mobilemoney",
                                Reference = transactionId
                            });
                        }
                    }
                    else
                    {
                        return await collectoApi.GetRequestToPayStatusAsync(new RequestToPayStatusRequestDto
                        {
                            TransactionId = vendorTranId
                        });
                    }
                }
                catch (Exception ex) when (attempt < maxRetries)
                {
                    _logger.LogWarning(ex, "API call failed on attempt {Attempt} for TransactionId: {TransactionId}. Retrying...", attempt, transactionId);
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), ct); // Exponential backoff
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "API call failed after {MaxRetries} attempts for TransactionId: {TransactionId}", maxRetries, transactionId);
                    throw;
                }
            }
            return string.Empty; // Should not reach here
        }

        // Response models for Collecto API
        // RequestToPayStatusResponse: Used for tenant and utility payments
        private class RequestToPayStatusResponse
        {
            public DataModel data { get; set; } = null!;

            public class DataModel
            {
                public bool requestToPayStatus { get; set; }
                public string status { get; set; } = null!;
                public string message { get; set; } = null!;
                public string transactionId { get; set; } = null!;
            }
        }

        // PayoutStatusResponse: Used for wallet transactions
        private class PayoutStatusResponse
        {
            public string status { get; set; } = "";            // "200"
            public string status_message { get; set; } = "";    // "success"
            public PayoutData data { get; set; } = null!;

            public class PayoutData
            {
                public bool payout { get; set; }                // true
                public string status { get; set; } = "";        // "success" (API-level)
                public string message { get; set; } = "";       // e.g. "Payout status for 1 payments"
                public List<PayoutItem> data { get; set; } = new();
            }

            public class PayoutItem
            {
                public string accountName { get; set; } = "";
                public string accountNumber { get; set; } = "";
                public string amount { get; set; } = "";        // string in payload
                public string message { get; set; } = "";
                public string phone { get; set; } = "";
                public CreatedOrApproved created { get; set; } = new();
                public CreatedOrApproved approved { get; set; } = new();
                public string status { get; set; } = "";        // "SUCCESSFUL" | "FAILED" | "PENDING"...
                public string status_message { get; set; } = ""; // e.g. "Mobilemoney sent successfully"
                public string transaction_id { get; set; } = "";
                public string amount_charged { get; set; } = "";
            }

            public class CreatedOrApproved
            {
                public string date_and_time { get; set; } = "";
                public string user_id { get; set; } = "";
                public string user_name { get; set;} = "";
            }
        }
    }
}
