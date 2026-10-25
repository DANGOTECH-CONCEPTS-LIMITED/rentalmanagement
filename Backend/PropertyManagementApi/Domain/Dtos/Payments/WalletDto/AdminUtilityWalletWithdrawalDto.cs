using System.ComponentModel.DataAnnotations;

namespace Domain.Dtos.Payments.WalletDto;

public class AdminUtilityWalletWithdrawalDto
{
    [Range(1, int.MaxValue)]
    public int SourceUserId { get; set; }
    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal Amount { get; set; }
    [Required, StringLength(500)]
    public string Description { get; set; } = string.Empty;

    public override string ToString() => $"SourceUserId={SourceUserId}; Amount={Amount}; Description={Description}";
}
