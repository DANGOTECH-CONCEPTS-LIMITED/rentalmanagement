using Application.Interfaces.Notifications;
using Application.Interfaces.SMS;
using Domain.Entities.Notifications;
using Domain.Notifications;
using Infrastructure.Data;
using Infrastructure.Services.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;

namespace Infrastructure.Services.Notifications;

/// <summary>
/// Merges the catalogue defaults with the rows administrators have saved. A missing row means the
/// default applies, so a brand new event is never silently disabled by the absence of a migration.
/// </summary>
internal static class NotificationMatrixReader
{
    public static async Task<List<NotificationChannelSetting>> ResolveAsync(AppDbContext db, string eventType, CancellationToken ct)
    {
        var stored = await db.NotificationSettings.AsNoTracking()
            .Where(x => x.EventType == eventType)
            .ToListAsync(ct);

        var resolved = new List<NotificationChannelSetting>();
        foreach (var fallback in NotificationCatalog.DefaultsFor(eventType))
        {
            var row = stored.FirstOrDefault(x => string.Equals(x.Channel, fallback.Channel, StringComparison.OrdinalIgnoreCase));
            resolved.Add(row == null
                ? fallback
                : new NotificationChannelSetting(fallback.EventType, fallback.Channel, row.IsEnabled, row.Recipients, row.Roles));
        }

        // Channels saved for an event that the catalogue no longer lists by default.
        foreach (var row in stored.Where(x => !resolved.Any(r => string.Equals(r.Channel, x.Channel, StringComparison.OrdinalIgnoreCase))))
        {
            resolved.Add(new NotificationChannelSetting(row.EventType, row.Channel, row.IsEnabled, row.Recipients, row.Roles));
        }

        return resolved;
    }
}

/// <summary>
/// Delivers a notification through every channel enabled in the matrix and records the attempt.
/// Call it after the caller's own SaveChanges: it only appends delivery rows to the shared context
/// and never mutates other tracked entities.
/// </summary>
public sealed class NotificationDispatcher(
    AppDbContext db,
    IEmailService email,
    ISmsProcessor sms,
    ILogger<NotificationDispatcher> logger) : INotificationDispatcher
{
    private const int MaxSmsLength = 480;

    public async Task DispatchAsync(NotificationRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.EventType)) return;

        List<NotificationChannelSetting> channels;
        try
        {
            channels = await NotificationMatrixReader.ResolveAsync(db, request.EventType, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not resolve the notification matrix for {Event}.", request.EventType);
            return;
        }

        var deliveries = new List<NotificationDelivery>();
        foreach (var channel in channels.Where(c => c.IsEnabled))
        {
            var recipients = ResolveRecipients(channel, request);
            if (recipients.Count == 0)
            {
                deliveries.Add(Record(request, channel.Channel, "-", NotificationDeliveryStatus.Skipped, "No recipient configured."));
                continue;
            }

            foreach (var recipient in recipients)
            {
                try
                {
                    await SendAsync(channel.Channel, recipient, request, ct);
                    deliveries.Add(Record(request, channel.Channel, recipient, NotificationDeliveryStatus.Sent, null));
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Notification {Event} via {Channel} to {Recipient} failed.",
                        request.EventType, channel.Channel, recipient);
                    deliveries.Add(Record(request, channel.Channel, recipient, NotificationDeliveryStatus.Failed, Truncate(ex.Message)));
                }
            }
        }

        if (deliveries.Count == 0) return;

        try
        {
            db.NotificationDeliveries.AddRange(deliveries);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // The log row is bookkeeping; losing it must not fail the business operation.
            logger.LogError(ex, "Could not record {Count} notification deliveries for {Event}.", deliveries.Count, request.EventType);
        }
    }

    private async Task SendAsync(string channel, string recipient, NotificationRequest request, CancellationToken ct)
    {
        switch (channel)
        {
            case NotificationChannels.Email:
                await email.SendEmailAsync(recipient, request.Subject, request.Body);
                break;

            case NotificationChannels.Sms:
                var text = request.SmsBody ?? ToPlainText(request.Body);
                if (text.Length > MaxSmsLength) text = text[..MaxSmsLength];
                var sent = await sms.SendAsync(recipient, text);
                if (!sent) throw new InvalidOperationException("The SMS provider rejected the message.");
                break;

            case NotificationChannels.InApp:
                // The persisted delivery row is the in-app copy.
                break;

            default:
                throw new InvalidOperationException($"Unsupported notification channel '{channel}'.");
        }
    }

    private static List<string> ResolveRecipients(NotificationChannelSetting channel, NotificationRequest request)
    {
        var configured = Split(channel.Recipients);
        if (configured.Count > 0) return configured;

        var fromRequest = channel.Channel switch
        {
            NotificationChannels.Email => request.EmailTo,
            NotificationChannels.Sms => request.SmsTo,
            NotificationChannels.InApp => request.InAppTo,
            _ => null
        };

        if (!string.IsNullOrWhiteSpace(fromRequest)) return Split(fromRequest);

        // In-app copies land on the configured roles when no explicit address exists.
        if (channel.Channel == NotificationChannels.InApp) return Split(channel.Roles);

        return [];
    }

    private static List<string> Split(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                   .Distinct(StringComparer.OrdinalIgnoreCase)
                   .ToList();

    private static NotificationDelivery Record(NotificationRequest request, string channel, string recipient, string status, string? error) => new()
    {
        EventType = request.EventType,
        Channel = channel,
        Recipient = recipient,
        Subject = Truncate(request.Subject) ?? string.Empty,
        Body = request.Body,
        Status = status,
        Error = error,
        Reference = Truncate(request.Reference),
        CreatedAtUtc = DateTime.UtcNow
    };

    private static string? Truncate(string? value, int max = 450) =>
        string.IsNullOrEmpty(value) || value.Length <= max ? value : value[..max];

    internal static string ToPlainText(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;
        var text = Regex.Replace(html, "<br\\s*/?>|</p>", "\n", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "<[^>]+>", string.Empty);
        text = System.Net.WebUtility.HtmlDecode(text);
        return Regex.Replace(text, @"[ \t]+", " ").Trim();
    }
}
