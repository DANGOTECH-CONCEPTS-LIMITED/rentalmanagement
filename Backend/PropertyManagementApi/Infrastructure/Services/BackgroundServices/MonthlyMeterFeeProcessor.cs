using Application.Interfaces.Meter;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Services.BackgroundServices
{
    public class MonthlyMeterFeeProcessor : BackgroundService
    {
        private static readonly TimeSpan PollInterval = TimeSpan.FromHours(1);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MonthlyMeterFeeProcessor> _logger;

        public MonthlyMeterFeeProcessor(IServiceScopeFactory scopeFactory, ILogger<MonthlyMeterFeeProcessor> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Hourly polling with idempotent catch-up covers restarts and missed month-ends.
            using var timer = new PeriodicTimer(PollInterval);
            try
            {
                do
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var feeService = scope.ServiceProvider.GetRequiredService<IMeterFeeService>();
                        var created = await feeService.ApplyDueMonthlyFeesAsync(DateTime.Now);
                        if (created > 0)
                            _logger.LogInformation("Applied {Count} monthly meter fee charges.", created);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogError(ex, "Error applying monthly meter fees");
                    }
                }
                while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException)
            {
            }
        }
    }
}
