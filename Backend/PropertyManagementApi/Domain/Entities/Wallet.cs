using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Wallet
    {
        public int Id { get; set; }
        // The landlord who owns this wallet
        public int LandlordId { get; set; }
        public User Landlord { get; set; } = null!;
        // Current wallet balance
        public decimal Balance { get; set; }
        // When wallet was created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        // Navigation for transaction history
        public ICollection<WalletTransaction> Transactions { get; set; } = new List<WalletTransaction>();
    }
}
