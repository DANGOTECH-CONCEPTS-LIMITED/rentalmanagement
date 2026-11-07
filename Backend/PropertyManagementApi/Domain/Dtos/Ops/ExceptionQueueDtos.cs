namespace Domain.Dtos.Ops;

/// <summary>Categories of records that need an administrator's attention.</summary>
public static class ExceptionCategories
{
    /// <summary>A bill payment the provider rejected; it can be retried or reconciled.</summary>
    public const string BillPaymentFailed = "bill_payment_failed";
    /// <summary>Submitted long ago and still not resolved by the provider.</summary>
    public const string BillPaymentUnconfirmed = "bill_payment_unconfirmed";
    /// <summary>Provider paid the bill but the utility wallet could not be debited.</summary>
    public const string BillPaymentUndebited = "bill_payment_undebited";
    /// <summary>Claimed for submission but the provider never answered.</summary>
    public const string BillPaymentStuckSubmission = "bill_payment_stuck_submission";
    /// <summary>Collection received from the provider but never credited to the owner's wallet.</summary>
    public const string CollectionNotCredited = "collection_not_credited";
    /// <summary>Credited collection that should have produced a bill payment but has none.</summary>
    public const string CollectionUnbilled = "collection_unbilled";

    public static readonly string[] All =
    [
        BillPaymentFailed,
        BillPaymentUnconfirmed,
        BillPaymentUndebited,
        BillPaymentStuckSubmission,
        CollectionNotCredited,
        CollectionUnbilled
    ];
}

/// <summary>One item in the exception queue.</summary>
public sealed record ExceptionItem(
    string Category,
    int Id,
    string Reference,
    string? MeterNumber,
    string? NwscAccount,
    decimal Amount,
    string Status,
    string? Reason,
    DateTime OccurredAtUtc,
    int AgeMinutes,
    string ActionHint);

/// <summary>A filtered page of the exception queue plus the size of every category.</summary>
public sealed record ExceptionQueueResult(
    DateTime GeneratedAtUtc,
    IReadOnlyDictionary<string, int> Counts,
    IReadOnlyList<ExceptionItem> Items,
    int Total);
