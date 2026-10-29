using Infrastructure.Services.PaymentServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices;

public class BillPaymentProcessor(ILogger<BillPaymentProcessor> logger, IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected virtual TimeSpan PollInterval => TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("BillPaymentProcessor started.");
        using var timer = new PeriodicTimer(PollInterval);
        try
        {
            do
            {
                try
                {
                    using var scope = scopeFactory.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<BillPaymentProcessingService>().ProcessAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { logger.LogError(ex, "NWSC bill payment cycle failed; retrying on the next poll"); }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
        logger.LogInformation("BillPaymentProcessor stopping.");
    }
}
