namespace Domain.Entities.PropertyMgt;

public class MeterLienPolicy
{
    public int UtilityMeterId { get; set; }
    public string RepaymentMode { get; set; } = "FullFirst";
    public decimal RepaymentPercentage { get; set; } = 100m;
}

public class MeterLien
{
    public int Id { get; set; }
    public int UtilityMeterId { get; set; }
    public decimal Amount { get; set; }
    public decimal AmountPaid { get; set; }
    public string Description { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Immutable financial allocation; vending state changes independently of repayments.
public class MeterLienRepayment
{
    public int Id { get; set; }
    public int PaymentId { get; set; }
    public int? UtilityMeterId { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal FeeAmount { get; set; }
    public decimal LienAmount { get; set; }
    public decimal TokenAmount { get; set; }
    public string RepaymentMode { get; set; } = "FullFirst";
    public decimal RepaymentPercentage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Ready -> InFlight -> Complete. Unknown provider outcomes remain InFlight for reconciliation.
    public string VendState { get; set; } = "Ready";
    public DateTime? VendStartedAt { get; set; }
    public string? VendError { get; set; }
}

public class MeterLienAllocation
{
    public int Id { get; set; }
    public int MeterLienId { get; set; }
    public int MeterLienRepaymentId { get; set; }
    public decimal Amount { get; set; }
}
