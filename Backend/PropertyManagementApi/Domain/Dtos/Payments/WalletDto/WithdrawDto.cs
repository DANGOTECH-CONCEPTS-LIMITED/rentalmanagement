using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments.WalletDto
{
    public class WithdrawDto
    {
        public int landlordid { get; set; }
        public decimal amount { get; set; } 
        public string description { get; set; }
    }
}
