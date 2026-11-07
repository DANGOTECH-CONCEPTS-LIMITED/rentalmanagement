namespace Domain.Entities.PropertyMgt;

/// <summary>Subjects that carry a status history, so the audit query stays bounded.</summary>
public static class PaymentStatusSubject
{
    public const string BillPayment = "BillPaymentInstruction";
    public const string RentInvoice = "RentInvoice";
    public const string UtilityPayment = "UtilityPayment";
    public const string WalletTransaction = "WalletTransaction";
    public const string RentalContract = "RentalContract";
}

/// <summary>
/// Append-only record of every status transition. Current-status columns keep the fast path for
/// lists; this table answers "what happened, when, and who did it" without guessing.
/// </summary>
public class PaymentStatusEvent
{
    public long Id { get; set; }
    public string SubjectType { get; set; } = string.Empty;
    public int SubjectId { get; set; }
    /// <summary>Business reference (bill reference, invoice number, transaction id).</summary>
    public string? Reference { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Reason { get; set; }
    /// <summary>"system" for workers, otherwise the administrator's id or email.</summary>
    public string? Actor { get; set; }
    public decimal? Amount { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
