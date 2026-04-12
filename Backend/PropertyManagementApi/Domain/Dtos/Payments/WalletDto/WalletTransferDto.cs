namespace Domain.Dtos.Payments.WalletDto
{
    public class WalletTransferDto
    {
        public int SourceUserId { get; set; }
        public int TargetUserId { get; set; }
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}