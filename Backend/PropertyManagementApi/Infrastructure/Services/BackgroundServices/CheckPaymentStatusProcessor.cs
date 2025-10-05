using System;
using System.Collections.Generic;
using System.Linq;                      // for ToList()
using System.Text.Json;
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
    public class CheckPaymentStatusProcessor : BackgroundService
    {
        private const string PendingAtTelcom = "PENDING AT TELCOM";
        private const string SuccessAtTelecom = "SUCCESSFUL AT TELECOM";
        private const string FailedAtTelecom = "FAILED AT TELECOM";
        private const string SuccessFul = "SUCCESSFUL";

        private readonly ILogger<CheckPaymentStatusProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

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

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
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

            using (var scope = _scopeFactory.CreateScope())
            {
                var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();

                tenantPayments = (await paymentSvc
                        .GetPaymentsByStatusAsync(PendingAtTelcom))
                    .ToList();

                utilityPayments = (await paymentSvc
                        .GetUtilityPaymentByStatus(PendingAtTelcom))
                    .ToList();

                walletTransactions = (await paymentSvc
                        .GetWalletTransactionByStatus(PendingAtTelcom))
                    .ToList();
            }

            var tasks = new List<Task>();

            foreach (var t in tenantPayments)
                tasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        await ProcessStatusAsync(
                            t.TransactionId,
                            t.VendorTransactionId,
                            "RENT",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing tenant payment {t.TransactionId}");
                    }
                }));

            foreach (var u in utilityPayments)
                tasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        await ProcessStatusAsync(
                            u.TransactionID,
                            u.VendorTranId,
                            "UTILITY",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing utility payment {u.TransactionID}");
                    }
                }));

            foreach (var w in walletTransactions)
                tasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        await ProcessStatusAsync(
                            w.TransactionId.ToString(),
                            w.TransactionId,
                            "WALLET",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing wallet transaction {w.TransactionId}");
                    }
                }));

            await Task.WhenAll(tasks);
        }

        private async Task ProcessStatusAsync(
            string transactionId,
            string vendorTranId,
            string tranType,
            CancellationToken ct)
        {
            // Each status‐check runs in its own DI scope → its own DbContext
            using var scope = _scopeFactory.CreateScope();
            var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();
            var servicelog = scope.ServiceProvider.GetRequiredService<IServiceLogsRepository>();

            using (_logger.BeginScope(new { transactionId, vendorTranId, tranType }))
            {
                try
                {
                    _logger.LogInformation("Checking status with Collecto");
                    var responseJson = string.Empty;

                    if (tranType.Equals("WALLET",StringComparison.OrdinalIgnoreCase))
                    {
                        responseJson = await collectoApi
                        .GetPayoutStatusAsync(new PayoutStatusRequestDto
                        {
                            Gateway = "mobilemoney",
                            Reference = transactionId
                        });
                    }
                    else
                    {
                        responseJson = await collectoApi
                        .GetRequestToPayStatusAsync(new RequestToPayStatusRequestDto
                        {
                            TransactionId = vendorTranId
                        });
                    }

                    if (string.IsNullOrWhiteSpace(responseJson))
                    {
                        _logger.LogError("Empty response from Collecto");
                        return;
                    }

                    if (tranType.Equals("WALLET", StringComparison.OrdinalIgnoreCase))
                    {
                        var payout = JsonSerializer
                        .Deserialize<PayoutStatusResponse>(responseJson);

                        if (payout == null || payout.data == null || payout.data.data.Count == 0)
                        {
                            _logger.LogInformation("No payout records found; skipping.");
                            return;
                        }

                        // If API can return multiple entries, try to pick the one that matches our best hints.
                        // Fallback: first item.
                        var item = payout.data.data.First();
                        var status = item.status?.Trim().ToUpperInvariant();

                        if (status == "SUCCESSFUL")
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
                        else if (status == "FAILED")
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
                        var dto = JsonSerializer
                        .Deserialize<RequestToPayStatusResponse>(responseJson);

                        if (dto?.data?.requestToPayStatus != true)
                        {
                            if (dto.data.status.Equals("Undetermined"))
                            {
                                //do nothing if the status is undetermined
                                _logger.LogInformation("Status is undetermined, skipping update");
                                return;
                            }
                            else if (dto.data.status.Equals("PENDING"))
                            {
                                //do nothing if the status is pending
                                _logger.LogInformation("Status is still pending, skipping update");
                                return;
                            }
                            else if (dto.data.status.Equals("SUCCESSFUL", StringComparison.OrdinalIgnoreCase))
                            {
                                await paymentSvc.UpdatePaymentStatus(
                                    SuccessAtTelecom,
                                    transactionId,
                                    dto.data.message ?? string.Empty,
                                    //dto.data.transactionId ?? string.Empty,
                                    vendorTranId,
                                    tranType);
                                _logger.LogInformation("Status updated to {NewStatus}", SuccessAtTelecom);
                                return;
                            }
                            else if (dto.data.status.Equals("FAILED", StringComparison.OrdinalIgnoreCase))
                            {
                                await paymentSvc.UpdatePaymentStatus(
                                    FailedAtTelecom,
                                    transactionId,
                                    dto.data.message ?? string.Empty,
                                    //dto.data.transactionId ?? string.Empty,
                                    vendorTranId,
                                    tranType);
                                _logger.LogInformation("Status updated to {NewStatus}", FailedAtTelecom);
                                return;
                            }
                            _logger.LogError("Collecto returned requestToPayStatus=false");
                            await paymentSvc.UpdatePaymentStatus(
                                FailedAtTelecom,
                                transactionId,
                                dto?.data?.message ?? "Unknown error",
                                //string.Empty,
                                vendorTranId,
                                tranType);
                            return;
                        }
                        else if (!dto.data.status.Equals("PENDING"))
                        {
                            var newStatus = dto.data.status.Equals("SUCCESSFUL", StringComparison.OrdinalIgnoreCase)
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
                    await servicelog.LogErrorAsync("CheckPaymentStatusProcessor", "Error in status check", "Exception",ex.Message);
                    _logger.LogError(ex, "Error in status check");
                }
            }
        }

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
                public string user_name { get; set; } = "";
            }
        }
    }
}


//commenited out code

//using System;
//using System.Collections.Generic;
//using System.Linq;                      // for ToList()
//using System.Text.Json;
//using System.Threading;
//using System.Threading.Tasks;
//using Application.Interfaces.Collecto;
//using Application.Interfaces.PaymentService;
//using Application.Interfaces.PaymentService.WalletSvc;
//using Domain.Dtos.Collecto;
//using Domain.Entities.PropertyMgt;
//using Microsoft.Extensions.DependencyInjection;
//using Microsoft.Extensions.Hosting;
//using Microsoft.Extensions.Logging;

//namespace Infrastructure.Services.BackgroundServices
//{
//    public class CheckPaymentStatusProcessor : BackgroundService
//    {
//        private const string PendingAtTelcom = "PENDING AT TELCOM";
//        private const string SuccessAtTelecom = "SUCCESSFUL AT TELECOM";
//        private const string FailedAtTelecom = "FAILED AT TELECOM";

//        private readonly ILogger<CheckPaymentStatusProcessor> _logger;
//        private readonly IServiceScopeFactory _scopeFactory;

//        public CheckPaymentStatusProcessor(
//            ILogger<CheckPaymentStatusProcessor> logger,
//            IServiceScopeFactory scopeFactory)
//        {
//            _logger = logger;
//            _scopeFactory = scopeFactory;
//        }

//        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
//        {
//            _logger.LogInformation("CheckPaymentStatusProcessor started.");

//            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
//            try
//            {
//                while (await timer.WaitForNextTickAsync(stoppingToken))
//                    await ProcessAllPendingAsync(stoppingToken);
//            }
//            catch (OperationCanceledException)
//            {
//                _logger.LogInformation("CheckPaymentStatusProcessor stopping.");
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Fatal error in ExecuteAsync");
//            }
//        }

//        private async Task ProcessAllPendingAsync(CancellationToken ct)
//        {
//            using var scope = _scopeFactory.CreateScope();
//            var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
//            var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();

//            var tenantPaymentsTask = paymentSvc.GetPaymentsByStatusAsync(PendingAtTelcom);
//            var utilityPaymentsTask = paymentSvc.GetUtilityPaymentByStatus(PendingAtTelcom);
//            var walletTransactionsTask = walletSvc.GetTransactionsByStatus(PendingAtTelcom);

//            // explain below code

//            await Task.WhenAll(
//                tenantPaymentsTask,
//                utilityPaymentsTask,
//                walletTransactionsTask);

//            var tenantPayments = (await tenantPaymentsTask).ToList();
//            var utilityPayments = (await utilityPaymentsTask).ToList();
//            var walletTransactions = (await walletTransactionsTask).ToList();

//            var allTransactions = new List<(string TxnId, string VendorTranId, string Type)>();

//            allTransactions.AddRange(tenantPayments.Select(t => (t.TransactionId, t.VendorTransactionId, "RENT")));
//            allTransactions.AddRange(utilityPayments.Select(u => (u.TransactionID, u.VendorTranId, "UTILITY")));
//            allTransactions.AddRange(walletTransactions.Select(w => (w.Id.ToString(), w.TransactionId, "WALLET")));

//            var tasks = new List<Task>();
//            using var throttler = new SemaphoreSlim(10); // Limit to 10 concurrent tasks

//            foreach (var (txnId, vendorId, type) in allTransactions)
//            {
//                tasks.Add(RunWithThrottleAsync(throttler, async () =>
//                {
//                    await ProcessStatusAsync(txnId, vendorId, type, ct);
//                }, ct));
//            }

//            await Task.WhenAll(tasks);

//            //using (var scope = _scopeFactory.CreateScope())
//            //{
//            //    var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
//            //    var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();

//            //    tenantPayments = (await paymentSvc
//            //            .GetPaymentsByStatusAsync(PendingAtTelcom))
//            //        .ToList();

//            //    utilityPayments = (await paymentSvc
//            //            .GetUtilityPaymentByStatus(PendingAtTelcom))
//            //        .ToList();

//            //    walletTransactions = (await walletSvc
//            //            .GetTransactionsByStatus(PendingAtTelcom))
//            //        .ToList();
//            //} // ← DbContext disposed here

//            // 2) Spawn one task per payment, each with its own scope
//            //var tasks = new List<Task>(tenantPaymentsTask.Count + utilityPayments.Count+walletTransactions.Count);

//            //foreach (var t in tenantPayments)
//            //    tasks.Add(ProcessStatusAsync(
//            //        t.TransactionId,
//            //        t.VendorTransactionId,
//            //        "RENT",
//            //        ct));

//            //foreach (var u in utilityPayments)
//            //    tasks.Add(ProcessStatusAsync(
//            //        u.TransactionID,
//            //        u.VendorTranId,
//            //        "UTILITY",
//            //        ct));

//            //foreach (var w in walletTransactions)
//            //    tasks.Add(ProcessStatusAsync(
//            //        w.Id.ToString(),
//            //        w.TransactionId,
//            //        "WALLET",
//            //        ct));

//            //await Task.WhenAll(tasks);
//        }

//        private async Task ProcessStatusAsync(
//            string transactionId,
//            string vendorTranId,
//            string tranType,
//            CancellationToken ct)
//        {
//            // Each status‐check runs in its own DI scope → its own DbContext
//            using var scope = _scopeFactory.CreateScope();
//            var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
//            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();
//            var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();

//            using (_logger.BeginScope(new { transactionId, vendorTranId, tranType }))
//            {
//                try
//                {
//                    _logger.LogInformation("Checking status with Collecto");

//                    var responseJson = await collectoApi
//                        .GetRequestToPayStatusAsync(new RequestToPayStatusRequestDto
//                        {
//                            TransactionId = vendorTranId
//                        });

//                    if (string.IsNullOrWhiteSpace(responseJson))
//                    {
//                        _logger.LogError("Empty response from Collecto");
//                        //check if trantype is wallet
//                        if (tranType.Equals("WALLET", StringComparison.OrdinalIgnoreCase))
//                        {
//                            _logger.LogInformation("Wallet transaction failed at telecom");
//                            //generate a wallet transaction
//                            var walletTransaction = new WalletTransaction
//                            {
//                                TransactionId = transactionId,
//                                Description = "No response from Collecto",
//                                Status = FailedAtTelecom,
//                                TransactionDate = DateTime.UtcNow,
//                            };
//                            await walletSvc.UpdateWalletTransaction(walletTransaction);

//                            //reverse wallet transaction
//                            await walletSvc.ReverseWalletTransaction(walletTransaction);
//                            return;
//                        }
//                        else
//                        {
//                            await paymentSvc.UpdatePaymentStatus(
//                                FailedAtTelecom,
//                                transactionId,
//                                "No response from Collecto",
//                                string.Empty,
//                                tranType);
//                            return;
//                        }
//                    }

//                    var dto = JsonSerializer
//                        .Deserialize<RequestToPayStatusResponse>(responseJson);

//                    if (dto?.data?.requestToPayStatus != true)
//                    {
//                        _logger.LogError("Collecto returned requestToPayStatus=false");

//                        //check if trantype is wallet
//                        if (tranType.Equals("WALLET", StringComparison.OrdinalIgnoreCase))
//                        {
//                            _logger.LogInformation("Wallet transaction failed at telecom");
//                            //generate a wallet transaction
//                            var walletTransaction = new WalletTransaction
//                            {
//                                TransactionId = transactionId,
//                                Description = dto?.data?.message ?? "Unknown error",
//                                Status = FailedAtTelecom,
//                                TransactionDate = DateTime.UtcNow,
//                            };

//                            await walletSvc.UpdateWalletTransaction(walletTransaction);
//                            await walletSvc.ReverseWalletTransaction(walletTransaction);
//                            return;
//                        }
//                        else
//                        {
//                            await paymentSvc.UpdatePaymentStatus(
//                                FailedAtTelecom,
//                                transactionId,
//                                dto?.data?.message ?? "Unknown error",
//                                string.Empty,
//                                tranType);
//                            return;
//                        }

//                    }
//                    else if (!dto.data.status.Equals("PENDING"))
//                    {
//                        //check if trantype is wallet
//                        if (tranType.Equals("WALLET", StringComparison.OrdinalIgnoreCase))
//                        {
//                            //skip
//                            return;
//                        }
//                        var newStatus = dto.data.status.Equals("SUCCESSFUL", StringComparison.OrdinalIgnoreCase)
//                            ? SuccessAtTelecom
//                            : FailedAtTelecom;

//                        await paymentSvc.UpdatePaymentStatus(
//                            newStatus,
//                            transactionId,
//                            dto.data.message ?? string.Empty,
//                            dto.data.transactionId ?? string.Empty,
//                            tranType);
//                        _logger.LogInformation("Status updated to {NewStatus}", newStatus);
//                    }
//                }
//                catch (Exception ex)
//                {
//                    _logger.LogError(ex, "Error in status check");
//                }
//            }
//        }

//        private class RequestToPayStatusResponse
//        {
//            public DataModel data { get; set; } = null!;

//            public class DataModel
//            {
//                public bool requestToPayStatus { get; set; }
//                public string status { get; set; } = null!;
//                public string message { get; set; } = null!;
//                public string transactionId { get; set; } = null!;
//            }
//        }

//        private static async Task RunWithThrottleAsync(SemaphoreSlim throttler, Func<Task> action, CancellationToken ct)
//        {
//            await throttler.WaitAsync(ct);
//            try
//            {
//                await action();
//            }
//            finally
//            {
//                throttler.Release();
//            }
//        }
//    }
//}
