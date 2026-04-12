namespace Domain.Dtos.Payments.WalletDto
{
    public class AdminWalletDebitDto
    {
        public int SourceUserId { get; set; }
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}