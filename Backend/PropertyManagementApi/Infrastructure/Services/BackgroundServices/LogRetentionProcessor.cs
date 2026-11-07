using Infrastructure.Data;
using Infrastructure.Services.Maintenance;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BackgroundServices;

/// <summary>
/// Runs the log retention purge on a schedule (daily by default). Enabled with
/// LogRetention:Enabled (default true) so the production tables stop growing unattended.
/// </summary>
public sealed class LogRetentionProcessor : BackgroundService
{
    private readonly ILogger<LogRetentionProcessor> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly LogRetentionOptions _options;
    private readonly TimeSpan _interval;

    public LogRetentionProcessor(
        ILogger<LogRetentionProcessor> logger,
        IServiceScopeFactory scopeFactory,
        Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        var section = configuration.GetSection("LogRetention");
        _options = LogRetentionOptions.FromConfiguration(section);
        _interval = TimeSpan.FromHours(Math.Clamp(section.GetValue("IntervalHours", 24), 1, 168));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("LogRetentionProcessor is disabled (LogRetention:Enabled is false).");
            return;
        }

        _logger.LogInformation(
            "LogRetentionProcessor started; HTTP logs kept {HttpDays}d, service logs {ServiceDays}d, notification logs {NotificationDays}d, interval {Interval}.",
            _options.HttpLogDays, _options.ServiceLogDays, _options.NotificationDays, _interval);

        using var timer = new PeriodicTimer(_interval);
        try
        {
            do
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<LogRetentionService>();
                    await service.PurgeAsync(_options, ct: stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Log retention purge failed.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }

        _logger.LogInformation("LogRetentionProcessor stopped.");
    }
}
