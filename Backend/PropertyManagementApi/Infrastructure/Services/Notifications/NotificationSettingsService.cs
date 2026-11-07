using Application.Interfaces.Notifications;
using Domain.Entities.Notifications;
using Domain.Notifications;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Notifications;

/// <summary>Reads and writes the notification matrix and exposes the delivery log.</summary>
public sealed class NotificationSettingsService(AppDbContext db) : INotificationSettingsService
{
    public async Task<IReadOnlyList<NotificationMatrixRow>> GetMatrixAsync(CancellationToken ct = default)
    {
        var stored = await db.NotificationSettings.AsNoTracking().ToListAsync(ct);
        var rows = new List<NotificationMatrixRow>();

        foreach (var definition in NotificationCatalog.All)
        {
            foreach (var fallback in NotificationCatalog.DefaultsFor(definition.Key))
            {
                var saved = stored.FirstOrDefault(x =>
                    string.Equals(x.EventType, definition.Key, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(x.Channel, fallback.Channel, StringComparison.OrdinalIgnoreCase));

                rows.Add(new NotificationMatrixRow(
                    definition.Key,
                    definition.Label,
                    definition.Description,
                    fallback.Channel,
                    saved?.IsEnabled ?? fallback.IsEnabled,
                    saved?.Recipients ?? fallback.Recipients,
                    saved?.Roles ?? fallback.Roles,
                    definition.IsOperationsAlert));
            }
        }

        return rows;
    }

    public async Task SaveAsync(IEnumerable<NotificationMatrixRow> rows, string? actor, CancellationToken ct = default)
    {
        var incoming = rows.ToList();
        if (incoming.Count == 0) return;

        foreach (var row in incoming)
        {
            if (NotificationCatalog.Find(row.EventType) == null)
                throw new ArgumentException($"Unknown notification event '{row.EventType}'.");
            if (!NotificationChannels.All.Contains(row.Channel, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Unknown notification channel '{row.Channel}'.");
            if (row.Channel == NotificationChannels.Email && row.IsEnabled)
            {
                var recipients = SplitAddresses(row.Recipients);
                var invalid = recipients.FirstOrDefault(x => !x.Contains('@'));
                if (invalid != null)
                    throw new ArgumentException($"'{invalid}' is not a valid email recipient.");
            }
        }

        var existing = await db.NotificationSettings.ToListAsync(ct);
        var now = DateTime.UtcNow;

        foreach (var row in incoming)
        {
            var entity = existing.FirstOrDefault(x =>
                string.Equals(x.EventType, row.EventType, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(x.Channel, row.Channel, StringComparison.OrdinalIgnoreCase));

            if (entity == null)
            {
                entity = new NotificationSetting { EventType = row.EventType, Channel = row.Channel };
                db.NotificationSettings.Add(entity);
            }

            entity.IsEnabled = row.IsEnabled;
            entity.Recipients = Normalize(row.Recipients);
            entity.Roles = Normalize(row.Roles);
            entity.UpdatedAtUtc = now;
            entity.UpdatedBy = actor;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<NotificationDeliveryPage> GetDeliveriesAsync(string? eventType, string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.NotificationDeliveries.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(eventType))
            query = query.Where(x => x.EventType == eventType);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new NotificationDeliveryItem(
                x.Id, x.EventType, x.Channel, x.Recipient, x.Subject, x.Status, x.Error, x.Reference, x.CreatedAtUtc))
            .ToListAsync(ct);

        return new NotificationDeliveryPage(items, page, pageSize, total);
    }

    private static IReadOnlyList<string> SplitAddresses(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string? Normalize(string? value)
    {
        var parts = SplitAddresses(value);
        return parts.Count == 0 ? null : string.Join(";", parts);
    }
}
