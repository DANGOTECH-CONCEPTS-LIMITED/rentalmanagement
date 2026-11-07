using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt;

public static class RentInvoiceStatus
{
    public const string Open = "OPEN";
    public const string PartiallyPaid = "PARTIALLY_PAID";
    public const string Paid = "PAID";
    public const string Overdue = "OVERDUE";
    public const string Cancelled = "CANCELLED";
}

/// <summary>
/// One rent charge for one contract and one billing month. The unique (contract, period) pair makes
/// generation idempotent: running it twice in a month never double-bills a tenant.
/// </summary>
public class RentInvoice
{
    public int Id { get; set; }

    [ForeignKey("RentalContract")]
    public int RentalContractId { get; set; }
    public RentalContract? RentalContract { get; set; }

    public int TenantId { get; set; }
    public int PropertyId { get; set; }

    /// <summary>Billing month in yyyy-MM format.</summary>
    public string Period { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;

    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public DateTime DueDate { get; set; }

    public decimal Amount { get; set; }
    public decimal AmountPaid { get; set; }
    public string Status { get; set; } = RentInvoiceStatus.Open;

    /// <summary>Highest dunning step already sent: 0 = none, 1 = first reminder, and so on.</summary>
    public int DunningLevel { get; set; }
    public DateTime? LastDunningAtUtc { get; set; }

    public DateTime? PaidAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public decimal Balance => Amount - AmountPaid;
}
