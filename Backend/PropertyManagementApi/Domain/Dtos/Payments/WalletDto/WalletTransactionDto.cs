using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments.WalletDto
{
    public class WalletTransactionDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; }
        public DateTime TransactionDate { get; set; }
        public string TransactionId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}
