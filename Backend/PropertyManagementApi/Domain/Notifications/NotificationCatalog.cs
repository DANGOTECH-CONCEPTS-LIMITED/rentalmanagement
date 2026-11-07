namespace Domain.Notifications;

/// <summary>Channels a notification can be delivered through.</summary>
public static class NotificationChannels
{
    public const string Email = "Email";
    public const string Sms = "Sms";
    public const string InApp = "InApp";

    public static readonly string[] All = [Email, Sms, InApp];
}

/// <summary>Event keys used by the matrix. Stored in the database, so never rename a value.</summary>
public static class NotificationEvents
{
    public const string PaymentReceived = "payment_received";
    public const string BillPaymentFailed = "bill_payment_failed";
    public const string BillPaymentUndebited = "bill_payment_undebited";
    public const string BillPaymentUnconfirmed = "bill_payment_unconfirmed";
    public const string CollectionNotCredited = "collection_not_credited";
    public const string MeterFeeDue = "meter_fee_due";
    public const string RentDue = "rent_due";
    public const string RentOverdue = "rent_overdue";
    public const string RentInvoiceIssued = "rent_invoice_issued";
    public const string ContractExpiring = "contract_expiring";
    public const string UserRegistered = "user_registered";
}

/// <summary>One row of the event catalog shown to administrators.</summary>
public sealed record NotificationEventDefinition(
    string Key,
    string Label,
    string Description,
    string[] DefaultChannels,
    /// <summary>Recipients seeded for the email channel when the row has never been saved.</summary>
    string? DefaultEmailRecipients = null,
    string DefaultRoles = "Administrator",
    bool IsOperationsAlert = false);

/// <summary>A single cell of the matrix: one event delivered through one channel.</summary>
public sealed record NotificationChannelSetting(
    string EventType,
    string Channel,
    bool IsEnabled,
    string? Recipients,
    string? Roles);

/// <summary>
/// The catalogue of notification events and their out-of-the-box defaults. A missing database row
/// means "use the default", so new events work without a migration.
/// </summary>
public static class NotificationCatalog
{
    /// <summary>Fallback address for operational alerts when nothing is configured.</summary>
    public const string DefaultAdminRecipients = "ngobidaniel04@gmail.com";

    public static readonly NotificationEventDefinition[] All =
    [
        new(NotificationEvents.PaymentReceived, "Payment received",
            "Receipt sent when a customer's utility payment succeeds.", [NotificationChannels.Sms, NotificationChannels.InApp]),
        new(NotificationEvents.BillPaymentFailed, "Bill payment failed",
            "A NWSC bill payment was rejected by the provider.", [NotificationChannels.Email, NotificationChannels.InApp],
            DefaultAdminRecipients, "Administrator", IsOperationsAlert: true),
        new(NotificationEvents.BillPaymentUndebited, "Paid but wallet not debited",
            "The provider settled the bill but the utility wallet could not be debited.", [NotificationChannels.Email, NotificationChannels.InApp],
            DefaultAdminRecipients, "Administrator", IsOperationsAlert: true),
        new(NotificationEvents.BillPaymentUnconfirmed, "Bill payment unconfirmed",
            "A submitted bill payment still has no provider answer.", [NotificationChannels.Email, NotificationChannels.InApp],
            DefaultAdminRecipients, "Administrator", IsOperationsAlert: true),
        new(NotificationEvents.CollectionNotCredited, "Collection not credited",
            "A collection settled at the provider but was never credited to the owner's wallet.", [NotificationChannels.Email, NotificationChannels.InApp],
            DefaultAdminRecipients, "Administrator", IsOperationsAlert: true),
        new(NotificationEvents.MeterFeeDue, "Meter fee due",
            "A monthly meter fee became due for an owner's meter.", [NotificationChannels.Email, NotificationChannels.Sms]),
        new(NotificationEvents.RentDue, "Rent due soon",
            "A tenant's rent is due within the reminder window.", [NotificationChannels.Sms, NotificationChannels.Email]),
        new(NotificationEvents.RentOverdue, "Rent overdue",
            "A tenant has an outstanding rent balance.", [NotificationChannels.Sms, NotificationChannels.Email]),
        new(NotificationEvents.RentInvoiceIssued, "Rent invoice issued",
            "A monthly rent invoice was generated for a tenant.", [NotificationChannels.Sms, NotificationChannels.Email]),
        new(NotificationEvents.ContractExpiring, "Contract expiring",
            "A rental contract is approaching its end date.", [NotificationChannels.Sms, NotificationChannels.Email]),
        new(NotificationEvents.UserRegistered, "User registered",
            "Welcome message for a newly created account.", [NotificationChannels.Email])
    ];

    public static NotificationEventDefinition? Find(string eventType) =>
        All.FirstOrDefault(x => string.Equals(x.Key, eventType, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Default matrix rows for an event. Unknown events fall back to an email + in-app operations
    /// alert so a newly added dispatch call is never silently dropped.
    /// </summary>
    public static IReadOnlyList<NotificationChannelSetting> DefaultsFor(string eventType)
    {
        var definition = Find(eventType);
        if (definition == null)
        {
            return
            [
                new NotificationChannelSetting(eventType, NotificationChannels.Email, true, DefaultAdminRecipients, "Administrator"),
                new NotificationChannelSetting(eventType, NotificationChannels.InApp, true, null, "Administrator")
            ];
        }

        return definition.DefaultChannels
            .Select(channel => new NotificationChannelSetting(
                definition.Key,
                channel,
                true,
                channel == NotificationChannels.Email ? definition.DefaultEmailRecipients : null,
                definition.DefaultRoles))
            .ToList();
    }
}
