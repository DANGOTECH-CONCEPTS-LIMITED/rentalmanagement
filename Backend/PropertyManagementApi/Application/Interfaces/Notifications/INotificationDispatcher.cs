using Domain.Notifications;

namespace Application.Interfaces.Notifications;

/// <summary>A notification to deliver. Addresses are optional: when the matrix has configured
/// recipients they win, otherwise the per-request address for that channel is used.</summary>
public sealed record NotificationRequest(
    string EventType,
    string Subject,
    string Body,
    string? Reference = null,
    string? EmailTo = null,
    string? SmsTo = null,
    /// <summary>Plain-text version for SMS. Derived from <see cref="Body"/> when omitted.</summary>
    string? SmsBody = null,
    string? InAppTo = null);

/// <summary>
/// Sends a notification through every channel enabled in the matrix. Implementations must never
/// throw: a notification failure may not break a payment that already succeeded.
/// </summary>
public interface INotificationDispatcher
{
    Task DispatchAsync(NotificationRequest request, CancellationToken ct = default);
}

public interface INotificationSettingsService
{
    /// <summary>Full matrix: one row per event/channel, defaults merged with saved overrides.</summary>
    Task<IReadOnlyList<NotificationMatrixRow>> GetMatrixAsync(CancellationToken ct = default);

    Task SaveAsync(IEnumerable<NotificationMatrixRow> rows, string? actor, CancellationToken ct = default);

    Task<NotificationDeliveryPage> GetDeliveriesAsync(string? eventType, string? status, int page, int pageSize, CancellationToken ct = default);
}

public sealed record NotificationMatrixRow(
    string EventType,
    string Label,
    string Description,
    string Channel,
    bool IsEnabled,
    string? Recipients,
    string? Roles,
    bool IsOperationsAlert);

public sealed record NotificationDeliveryItem(
    long Id,
    string EventType,
    string Channel,
    string Recipient,
    string Subject,
    string Status,
    string? Error,
    string? Reference,
    DateTime CreatedAtUtc);

public sealed record NotificationDeliveryPage(IReadOnlyList<NotificationDeliveryItem> Items, int Page, int PageSize, int Total);
