using Application.Interfaces.Collecto;
using Application.Interfaces.PaymentService;
using Application.Interfaces.ServiceLogs;
using Domain.Dtos.Collecto;
using Domain.Entities.PropertyMgt;
using Infrastructure.Services.BackgroundServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using System.Reflection;

namespace Tests;

public class PaymentStatusPollingTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task BankPendingPayoutIsPolledAtStartupAndAfterTransientQueryFailure(bool failFirstCycle)
    {
        var payments = DispatchProxy.Create<IPaymentService, PaymentQueries>();
        var queries = (PaymentQueries)(object)payments;
        queries.FailFirstCycle = failFirstCycle;
        var gateway = DispatchProxy.Create<ICollectoApiClient, StatusGateway>();
        var status = (StatusGateway)(object)gateway;
        using var services = new ServiceCollection().AddSingleton(payments).AddSingleton(gateway)
            .AddSingleton(DispatchProxy.Create<IServiceLogsRepository, UnexpectedLog>()).BuildServiceProvider();
        using var worker = new FastStatusWorker(services.GetRequiredService<IServiceScopeFactory>());
        await worker.StartAsync(CancellationToken.None);
        try
        {
            await queries.Polled.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Assert.Equal("bank-ref", status.Reference);
            Assert.Equal("bank", status.Gateway);
            Assert.Equal("provider-bank-ref", queries.Payout.VendorTranId);
            Assert.Equal("PENDING AT THE BANK", queries.Payout.Status);
            Assert.True(queries.Cycles >= (failFirstCycle ? 2 : 1));
            Assert.True(status.StatusCalls > 0);
            Assert.Equal(0, status.SubmissionCalls);
        }
        finally
        {
            await worker.StopAsync(CancellationToken.None);
        }
    }

    private sealed class FastStatusWorker(IServiceScopeFactory scopes)
        : CheckPaymentStatusProcessor(NullLogger<CheckPaymentStatusProcessor>.Instance, scopes)
    {
        protected override TimeSpan PollInterval => TimeSpan.FromMilliseconds(20);
    }

    public class PaymentQueries : DispatchProxy
    {
        public bool FailFirstCycle { get; set; }
        public int Cycles { get; private set; }
        public TaskCompletionSource<bool> Polled { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public WalletTransaction Payout { get; } = new()
        {
            TransactionId = "bank-ref", Status = "PENDING AT THE BANK", Amount = -10000,
            VendorTranId = "", CreatedAt = DateTime.UtcNow
        };
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            switch (targetMethod!.Name)
            {
                case "GetPaymentsByStatusAsync":
                    Cycles++;
                    if (FailFirstCycle && Cycles == 1) throw new InvalidOperationException("Simulated transient database failure");
                    return Task.FromResult<IEnumerable<TenantPayment>>([]);
                case "GetUtilityPaymentByStatus": return Task.FromResult<IEnumerable<UtilityPayment>>([]);
                case "GetWalletTransactionByStatus":
                    return Task.FromResult<IEnumerable<WalletTransaction>>((string)args![0]! == "PENDING AT THE BANK" ? [Payout] : []);
                case "GetWalletTransactionByIdAsync": return Task.FromResult(Payout);
                case "UpdateWalletTransaction":
                    var update = (WalletTransaction)args![0]!;
                    Payout.VendorTranId = update.VendorTranId;
                    Polled.TrySetResult(true);
                    return Task.CompletedTask;
                default: throw new InvalidOperationException("Unexpected payment service operation: " + targetMethod.Name);
            }
        }
    }

    public class UnexpectedLog : DispatchProxy
    {
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
            => throw new InvalidOperationException("Status processing unexpectedly failed");
    }

    public class StatusGateway : DispatchProxy
    {
        public string? Reference { get; private set; }
        public string? Gateway { get; private set; }
        public int StatusCalls { get; private set; }
        public int SubmissionCalls { get; private set; }
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            if (targetMethod!.Name != "GetPayoutStatusAsync")
            {
                SubmissionCalls++;
                throw new InvalidOperationException("Status worker must never submit a payout");
            }
            StatusCalls++;
            var request = (PayoutStatusRequestDto)args![0]!;
            Reference = request.Reference;
            Gateway = request.Gateway;
            return Task.FromResult("""{"status":200,"data":{"payout":true,"data":[{"status":"PENDING","transaction_id":"bank-ref","vendorReference":"provider-bank-ref"}]}}""");
        }
    }
}
