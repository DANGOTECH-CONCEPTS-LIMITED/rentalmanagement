using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class WithdrawFromCollectoWalletDto
    {
        public string reference { get; set; }
        public string amount { get; set; }
        public string withdrawTo { get; set; } //<"mobilemoney", "stanbic", "flexipay", "SMS", "BULK", "ADS", "EMAILS", "AIRTIME">

    }
}
