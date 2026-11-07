using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt;

public static class SecurityDepositStatus
{
    /// <summary>Money is held against the tenancy; deductions can still change.</summary>
    public const string Held = "HELD";
    /// <summary>Settled at move-out with money refunded to the tenant.</summary>
    public const string Settled = "SETTLED";
    /// <summary>Settled at move-out with nothing left to refund.</summary>
    public const string Forfeited = "FORFEITED";
}

public static class DepositDeductionCategory
{
    public const string Damage = "DAMAGE";
    public const string Cleaning = "CLEANING";
    public const string Utility = "UTILITY";
    public const string Other = "OTHER";

    public static readonly string[] All = [Damage, Cleaning, Utility, Other];
}

/// <summary>
/// The security deposit held for one rental contract. A contract has at most one deposit row
/// (unique index), created from <see cref="RentalContract.Deposit"/> the first time it is needed.
/// </summary>
public class SecurityDeposit
{
    public int Id { get; set; }

    [ForeignKey("RentalContract")]
    public int RentalContractId { get; set; }
    public RentalContract? RentalContract { get; set; }

    public int TenantId { get; set; }
    public int PropertyId { get; set; }

    public decimal AmountHeld { get; set; }
    /// <summary>Arrears + deductions actually consumed when the deposit was settled.</summary>
    public decimal DeductedAmount { get; set; }
    public decimal RefundAmount { get; set; }

    public string Status { get; set; } = SecurityDepositStatus.Held;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? SettledAtUtc { get; set; }
    public string? SettledBy { get; set; }
    public string? Notes { get; set; }
}

/// <summary>A claim against the deposit (damage, cleaning, unpaid utility, ...).</summary>
public class DepositDeduction
{
    public int Id { get; set; }

    [ForeignKey("SecurityDeposit")]
    public int SecurityDepositId { get; set; }
    public SecurityDeposit? SecurityDeposit { get; set; }

    public string Category { get; set; } = DepositDeductionCategory.Other;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
}
