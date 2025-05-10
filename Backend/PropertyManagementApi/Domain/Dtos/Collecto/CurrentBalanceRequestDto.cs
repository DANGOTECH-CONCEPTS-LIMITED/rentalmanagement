using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class CurrentBalanceRequestDto
    {
        public string Type { get; set; }            // e.g. "Wallet", "CASH", "BULK", "SMS", "AIRTIME"
    }
}
