using Infrastructure.Services.Maintenance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Maintenance;

[ApiController]
[Authorize(Roles = "Administrator")]
public sealed class AdminMaintenanceController(LogRetentionService retention, IConfiguration configuration) : ControllerBase
{
    /// <summary>
    /// Runs the log retention purge now. Windows come from LogRetention:* configuration, so the
    /// scheduled job and this manual trigger always agree.
    /// </summary>
    [HttpPost("/api/AdminMaintenance/purge-logs")]
    public async Task<IActionResult> PurgeLogs(CancellationToken ct)
    {
        var options = LogRetentionOptions.FromConfiguration(configuration.GetSection("LogRetention"));
        var result = await retention.PurgeAsync(options, ct: ct);
        return Ok(new
        {
            httpLogs = result.HttpLogs,
            serviceLogs = result.ServiceLogs,
            notifications = result.Notifications,
            total = result.Total,
            enabled = options.Enabled,
            windows = new
            {
                httpLogDays = options.HttpLogDays,
                serviceLogDays = options.ServiceLogDays,
                notificationDays = options.NotificationDays
            }
        });
    }
}
