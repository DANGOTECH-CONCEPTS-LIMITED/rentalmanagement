using System.ComponentModel.DataAnnotations;

namespace Domain.Dtos.Payments;

/// <summary>An unresolved submitted Dango withdrawal available for manual reconciliation.</summary>
public sealed record AdminPayoutReconciliationItem(int Id, string TransactionId, decimal Amount, string Status, string VendorReference, string Owner);
/// <summary>A bounded page of unresolved Dango withdrawals.</summary>
public sealed record AdminPayoutReconciliationPage(IReadOnlyList<AdminPayoutReconciliationItem> Items, int Page, int PageSize, bool HasMore);
/// <summary>Explicit administrator confirmation of an unpaid payout and the reason for refunding it.</summary>
public sealed record FailAndReversePayoutRequest
{
    [Required, StringLength(500, MinimumLength = 5)]
    public string Reason { get; init; } = string.Empty;
    public bool ConfirmUnpaid { get; init; }
    [Required, MaxLength(128)]
    public string ConfirmedTransactionId { get; init; } = string.Empty;
}
/// <summary>Result of one atomic, manually authorized payout refund.</summary>
public sealed record FailAndReversePayoutResponse(string TransactionId, string Status, decimal Amount);
