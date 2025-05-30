﻿using System;
using System.Collections.Generic;
using System.Linq;                      // for ToList()
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
            // 1) Load and materialize both sets in a short‐lived scope
            List<TenantPayment> tenantPayments;
            List<UtilityPayment> utilityPayments;

            using (var scope = _scopeFactory.CreateScope())
            {
                var paymentSvc = scope.ServiceProvider.GetRequiredService<IPaymentService>();

                tenantPayments = (await paymentSvc
                        .GetPaymentsByStatusAsync(PendingAtTelcom))
                    .ToList();

                utilityPayments = (await paymentSvc
                        .GetUtilityPaymentByStatus(PendingAtTelcom))
                    .ToList();
            } // ← DbContext disposed here

            // 2) Spawn one task per payment, each with its own scope
            var tasks = new List<Task>(tenantPayments.Count + utilityPayments.Count);

            foreach (var t in tenantPayments)
                tasks.Add(ProcessStatusAsync(
                    t.TransactionId,
                    t.VendorTransactionId,
                    "RENT",
                    ct));

            foreach (var u in utilityPayments)
                tasks.Add(ProcessStatusAsync(
                    u.TransactionID,
                    u.VendorTranId,
                    "UTILITY",
                    ct));

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

            using (_logger.BeginScope(new { transactionId, vendorTranId, tranType }))
            {
                try
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
                        await paymentSvc.UpdatePaymentStatus(
                            FailedAtTelecom,
                            transactionId,
                            "No response from Collecto",
                            string.Empty,
                            tranType);
                        return;
                    }

                    var dto = JsonSerializer
                        .Deserialize<RequestToPayStatusResponse>(responseJson);

                    if (dto?.data?.requestToPayStatus != true)
                    {
                        _logger.LogError("Collecto returned requestToPayStatus=false");
                        await paymentSvc.UpdatePaymentStatus(
                            FailedAtTelecom,
                            transactionId,
                            dto?.data?.message ?? "Unknown error",
                            string.Empty,
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
                            dto.data.transactionId ?? string.Empty,
                            tranType);
                        _logger.LogInformation("Status updated to {NewStatus}", newStatus);
                    }
                }
                catch (Exception ex)
                {
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
    }
}
