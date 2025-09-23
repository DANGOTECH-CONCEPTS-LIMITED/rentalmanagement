using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class InitiatePayoutBankRequestDto
    {
        public string gateway { get; set; }         // e.g. "bank"
        public string bankName { get; set; }       // Stsnbic Bank Uganda Limited
        public string bankSwiftCode { get; set; }       // e.g. "SBICUGKX"
        public string accountNumber { get; set; }     // e.g. "903XXXXXXXX"
        public string accountName { get; set; }   // e.g. "Daniel"
        public decimal amount { get; set; }         // e.g. 5000
        public string message { get; set; }         // e.g. "dangopay"
        public string phone { get; set; }           // e.g. "256705687760"
        public string reference { get; set; }       // e.g. "12345MYREF206"
    }
}
