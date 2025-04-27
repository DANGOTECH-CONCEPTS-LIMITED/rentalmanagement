using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
{
    public class WalletTransaction
    {
        public int Id { get; set; }
        public int WalletId { get; set; }
        public Wallet Wallet { get; set; } = null!;
        // Positive = deposit, Negative = withdrawal
        public decimal Amount { get; set; }
        // e.g. "Rent payout", "Withdrawal"
        public string Description { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public DateTime TransactionDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
