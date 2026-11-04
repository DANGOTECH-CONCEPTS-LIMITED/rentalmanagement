using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices
{
    /// <summary>Processes queued USSD statement uploads in the background.</summary>
    public class UssdImportProcessor : BackgroundService
    {
        private readonly ILogger<UssdImportProcessor> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public UssdImportProcessor(ILogger<UssdImportProcessor> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("UssdImportProcessor started.");
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            try
            {
                do
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        var service = scope.ServiceProvider.GetRequiredService<IUssdSessionChargeService>();

                        var pending = await db.UssdImportBatches.AsNoTracking()
                            .Where(b => b.Status == "PENDING")
                            .OrderBy(b => b.Id)
                            .Select(b => b.Id)
                            .FirstOrDefaultAsync(stoppingToken);

                        if (pending != 0)
                        {
                            var (imported, skipped, total) = await service.ProcessBatchAsync(pending, stoppingToken);
                            _logger.LogInformation(
                                "UssdImportProcessor processed batch {BatchId}: imported {Imported}, skipped {Skipped}, total {Total}",
                                pending, imported, skipped, total);
                        }
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "UssdImportProcessor error while processing a batch.");
                    }
                }
                while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown.
            }
            _logger.LogInformation("UssdImportProcessor stopped.");
        }
    }
}
