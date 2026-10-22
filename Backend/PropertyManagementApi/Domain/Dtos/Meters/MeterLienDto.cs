using System.ComponentModel.DataAnnotations;

namespace Domain.Dtos.Meters;

public class SetMeterLienPolicyDto
{
    [Required, RegularExpression("^(FullFirst|Percentage)$")]
    public string RepaymentMode { get; set; } = "FullFirst";
    [Range(typeof(decimal), "0.000000000000000001", "100")]
    public decimal RepaymentPercentage { get; set; } = 100m;
}

public class AddMeterLienDto : SetMeterLienPolicyDto
{
    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal Amount { get; set; }
    [Required, StringLength(500)]
    public string Description { get; set; } = string.Empty;
}

public class MeterLienSummaryDto
{
    public int MeterId { get; set; }
    public string MeterNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Balance { get; set; }
    public string RepaymentMode { get; set; } = "FullFirst";
    public decimal RepaymentPercentage { get; set; } = 100m;
    public List<MeterLienItemDto> Liens { get; set; } = new();
    public List<MeterLienRepaymentDto> Repayments { get; set; } = new();
}

public record MeterLienItemDto(int Id, decimal Amount, decimal AmountPaid, decimal Balance, string Description, DateTime CreatedAt);
public record MeterLienRepaymentDto(int PaymentId, string? TransactionId, decimal PaymentAmount, decimal LienAmount, decimal TokenAmount, DateTime CreatedAt);
