using Application.Interfaces.Notifications;
using Domain.Entities.Notifications;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Maintenance;

public sealed record LogRetentionOptions(
    bool Enabled = true,
    int HttpLogDays = 30,
    int ServiceLogDays = 30,
    int NotificationDays = 90,
    int BatchSize = 1000)
{
    public static LogRetentionOptions FromConfiguration(IConfigurationSection section) => new(
        Enabled: section.GetValue("Enabled", true),
        HttpLogDays: Math.Max(1, section.GetValue("HttpLogRetentionDays", 30)),
        ServiceLogDays: Math.Max(1, section.GetValue("ServiceLogRetentionDays", 30)),
        NotificationDays: Math.Max(1, section.GetValue("NotificationDeliveryRetentionDays", 90)),
        BatchSize: Math.Clamp(section.GetValue("BatchSize", 1000), 50, 10_000));
}

public sealed record LogRetentionResult(int HttpLogs, int ServiceLogs, int Notifications)
{
    public int Total => HttpLogs + ServiceLogs + Notifications;
}

/// <summary>
/// Trims the append-only diagnostic tables so they cannot grow without bound on the production
/// database. Deletes are batched by primary key so no statement holds a long table lock.
/// </summary>
public sealed class LogRetentionService(AppDbContext db, ILogger<LogRetentionService> logger)
{
    public async Task<LogRetentionResult> PurgeAsync(LogRetentionOptions options, DateTime? nowUtc = null, CancellationToken ct = default)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Log retention is disabled; nothing was purged.");
            return new LogRetentionResult(0, 0, 0);
        }

        var now = nowUtc ?? DateTime.UtcNow;
        // Both log tables are written with DateTime.Now, so their cutoffs are local time.
        var localNow = now.ToLocalTime();
        var httpCutoff = localNow.AddDays(-options.HttpLogDays);
        var serviceCutoff = localNow.AddDays(-options.ServiceLogDays);
        var notificationCutoff = now.AddDays(-options.NotificationDays);

        var http = await DeleteHttpLogsAsync(httpCutoff, options.BatchSize, ct);
        var service = await DeleteServiceLogsAsync(serviceCutoff, options.BatchSize, ct);
        var notifications = await DeleteNotificationsAsync(notificationCutoff, options.BatchSize, ct);

        var result = new LogRetentionResult(http, service, notifications);
        if (result.Total > 0)
        {
            logger.LogInformation(
                "Log retention removed {Total} rows: {Http} HTTP, {Service} service, {Notifications} notification deliveries.",
                result.Total, result.HttpLogs, result.ServiceLogs, result.Notifications);
        }

        return result;
    }

    private async Task<int> DeleteHttpLogsAsync(DateTime cutoff, int batchSize, CancellationToken ct)
    {
        var deleted = 0;
        while (true)
        {
            var ids = await db.HttpRequesRequestResponses.AsNoTracking()
                .Where(x => x.CreatedAt < cutoff)
                .OrderBy(x => x.Id)
                .Select(x => x.Id)
                .Take(batchSize)
                .ToListAsync(ct);
            if (ids.Count == 0) break;

            deleted += await db.HttpRequesRequestResponses.Where(x => ids.Contains(x.Id)).ExecuteDeleteAsync(ct);
            if (ids.Count < batchSize) break;
        }
        return deleted;
    }

    private async Task<int> DeleteServiceLogsAsync(DateTime cutoff, int batchSize, CancellationToken ct)
    {
        var deleted = 0;
        while (true)
        {
            var ids = await db.ServiceLogs.AsNoTracking()
                .Where(x => x.LogDate < cutoff)
                .OrderBy(x => x.Id)
                .Select(x => x.Id)
                .Take(batchSize)
                .ToListAsync(ct);
            if (ids.Count == 0) break;

            deleted += await db.ServiceLogs.Where(x => ids.Contains(x.Id)).ExecuteDeleteAsync(ct);
            if (ids.Count < batchSize) break;
        }
        return deleted;
    }

    private async Task<int> DeleteNotificationsAsync(DateTime cutoff, int batchSize, CancellationToken ct)
    {
        var deleted = 0;
        while (true)
        {
            var ids = await db.NotificationDeliveries.AsNoTracking()
                .Where(x => x.CreatedAtUtc < cutoff)
                .OrderBy(x => x.Id)
                .Select(x => x.Id)
                .Take(batchSize)
                .ToListAsync(ct);
            if (ids.Count == 0) break;

            deleted += await db.NotificationDeliveries.Where(x => ids.Contains(x.Id)).ExecuteDeleteAsync(ct);
            if (ids.Count < batchSize) break;
        }
        return deleted;
    }
}
