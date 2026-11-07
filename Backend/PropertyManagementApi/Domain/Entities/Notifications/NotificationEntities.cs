namespace Domain.Entities.Notifications;

/// <summary>
/// One cell of the notification matrix: an event delivered through a channel, with the recipients
/// and roles it should reach. Rows are upserted by administrators; a missing row means "use the
/// catalogue default".
/// </summary>
public class NotificationSetting
{
    public int Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    /// <summary>Semicolon or comma separated emails/phone numbers. Empty means "use the request context".</summary>
    public string? Recipients { get; set; }
    /// <summary>Roles that see the in-app copy when no explicit recipient is configured.</summary>
    public string? Roles { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public string? UpdatedBy { get; set; }
}

public static class NotificationDeliveryStatus
{
    public const string Sent = "SENT";
    public const string Failed = "FAILED";
    /// <summary>Channel was enabled but there was nobody to send to.</summary>
    public const string Skipped = "SKIPPED";
}

/// <summary>
/// Append-only delivery log. Doubles as the in-app inbox (channel = InApp) and as the audit trail
/// that proves an alert was attempted, even when the transport failed.
/// </summary>
public class NotificationDelivery
{
    public long Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string Status { get; set; } = NotificationDeliveryStatus.Sent;
    public string? Error { get; set; }
    /// <summary>Business reference (bill reference, transaction id) for cross-linking.</summary>
    public string? Reference { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
