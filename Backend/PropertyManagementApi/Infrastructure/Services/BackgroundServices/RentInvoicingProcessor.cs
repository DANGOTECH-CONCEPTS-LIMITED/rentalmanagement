using Application.Interfaces.Billing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices;

/// <summary>
/// Issues monthly rent invoices and runs the dunning ladder on a daily timer. Both steps are
/// idempotent, so a restart mid-cycle cannot double-bill or double-chase a tenant.
/// </summary>
public sealed class RentInvoicingProcessor : BackgroundService
{
    private readonly ILogger<RentInvoicingProcessor> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;

    public RentInvoicingProcessor(
        ILogger<RentInvoicingProcessor> logger,
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _enabled = configuration.GetValue("RentInvoicing:Enabled", true);
        var intervalHours = configuration.GetValue("RentInvoicing:IntervalHours", 24);
        _interval = TimeSpan.FromHours(intervalHours is >= 1 and <= 168 ? intervalHours : 24);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation("RentInvoicingProcessor is disabled (RentInvoicing:Enabled is false).");
            return;
        }

        _logger.LogInformation("RentInvoicingProcessor started; interval {Interval}.", _interval);
        using var timer = new PeriodicTimer(_interval);
        try
        {
            do
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IRentInvoicingService>();
                    var today = DateTime.Now.Date;
                    var created = await service.GenerateDueInvoicesAsync(today, stoppingToken);
                    var chased = await service.RunDunningAsync(today, stoppingToken);
                    _logger.LogInformation("Rent invoicing cycle: {Created} invoices created, {Chased} invoices dunned.", created, chased);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Rent invoicing cycle failed.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }
        _logger.LogInformation("RentInvoicingProcessor stopped.");
    }
}
