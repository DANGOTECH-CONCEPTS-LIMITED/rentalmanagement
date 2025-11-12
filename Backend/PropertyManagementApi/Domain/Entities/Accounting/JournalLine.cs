namespace Domain.Entities.Accounting
{
    public class JournalLine
    {
        public int Id { get; set; }
        public int JournalEntryId { get; set; }
        public JournalEntry JournalEntry { get; set; } = null!;

        public int AccountId { get; set; }
        public Account Account { get; set; } = null!;

        public decimal Debit { get; set; }
        public decimal Credit { get; set; }

        // Sub-ledger dimensions
        public int? WalletId { get; set; }
        public int? LandlordId { get; set; }
        public int? TenantId { get; set; }
        public string? Memo { get; set; }
    }
}