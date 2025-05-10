using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
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
                {
                    await ProcessAllPendingAsync(stoppingToken);
                }
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
            using var scope = _scopeFactory.CreateScope();
            var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();
            var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();
            var collectoApi = scope.ServiceProvider.GetRequiredService<ICollectoApiClient>();

            // fetch both lists in parallel
            var tenantTask = paymentSvc.GetPaymentsByStatusAsync(PendingAtTelcom);
            var utilTask = paymentSvc.GetUtilityPaymentByStatus(PendingAtTelcom);
            await Task.WhenAll(tenantTask, utilTask);

            var work = new List<Task>();
            foreach (var t in tenantTask.Result)
                work.Add(ProcessStatusAsync(
                    transactionId: t.TransactionId,
                    vendorTranId: t.VendorTransactionId,
                    tranType: "RENT",
                    collectoApi,
                    paymentSvc,
                    ct));

            foreach (var u in utilTask.Result)
                work.Add(ProcessStatusAsync(
                    transactionId: u.TransactionID,
                    vendorTranId: u.VendorTranId,
                    tranType: "UTILITY",
                    collectoApi,
                    paymentSvc,
                    ct));

            await Task.WhenAll(work);
        }

        private async Task ProcessStatusAsync(
            string transactionId,
            string vendorTranId,
            string tranType,
            ICollectoApiClient collectoApi,
            IPaymentService paymentSvc,
            CancellationToken ct)
        {
            using (_logger.BeginScope(new { transactionId, vendorTranId, tranType }))
            {
                try
                {
                    await HandleStatusCheckAsync(
                        transactionId, vendorTranId, tranType,
                        collectoApi, paymentSvc, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in status check");
                }
            }
        }

        private async Task HandleStatusCheckAsync(
            string transactionId,
            string vendorTranId,
            string tranType,
            ICollectoApiClient collectoApi,
            IPaymentService paymentSvc,
            CancellationToken ct)
        {
            _logger.LogInformation("Checking status with Collecto");

            var responseJson = await collectoApi
                .GetRequestToPayStatusAsync(new RequestToPayStatusRequestDto
                {
                    TransactionId = vendorTranId
                });

            if (string.IsNullOrWhiteSpace(responseJson))
            {
                _logger.LogError("Empty response from Collecto");
                await UpdateStatusAsync(
                    FailedAtTelecom, transactionId,
                    "No response", string.Empty,
                    tranType, paymentSvc);
                return;
            }

            var dto = JsonSerializer
                .Deserialize<RequestToPayStatusResponse>(responseJson);

            if (dto?.data?.requestToPayStatus != true)
            {
                _logger.LogError("Collecto status=false");
                await UpdateStatusAsync(
                    FailedAtTelecom, transactionId,
                    dto?.data?.message ?? "Unknown error", string.Empty,
                    tranType, paymentSvc);
                return;
            }

            var newStatus = dto.data.status.Equals("SUCCESSFUL", StringComparison.OrdinalIgnoreCase)
                ? SuccessAtTelecom
                : FailedAtTelecom;

            await UpdateStatusAsync(
                newStatus,
                transactionId,
                dto.data.message ?? string.Empty,
                dto.data.transactionId ?? string.Empty,
                tranType,
                paymentSvc);

            _logger.LogInformation("Status updated to {NewStatus}", newStatus);
        }

        private static Task UpdateStatusAsync(
            string status,
            string transactionId,
            string message,
            string providerId,
            string tranType,
            IPaymentService paymentSvc)
        {
            // matching your 5-arg signature
            return paymentSvc.UpdatePaymentStatus(
                status, transactionId, message, providerId, tranType);
        }

        private class RequestToPayStatusResponse
        {
            public DataModel data { get; set; }
            public class DataModel
            {
                public bool requestToPayStatus { get; set; }
                public string status { get; set; }
                public string message { get; set; }
                public string transactionId { get; set; }
            }
        }
    }
}
