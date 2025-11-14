using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class InitiateBankPayoutDto
    {
        public string Gateway { get; set; }         // e.g. "mobilemoney", "flexipay", "stanbicbank", "otherBanks"
        public string SwiftCode { get; set; }       // required for otherBanks
        public string Reference { get; set; }       // e.g. "12345MYREF206"
        public string AccountName { get; set; }     // e.g. "Samson Kwiz"
        public string AccountNumber { get; set; }   // e.g. "256705687760"
        public decimal Amount { get; set; }         // e.g. 5000
        public string Message { get; set; }         // e.g. "Test Payout"
        public string Phone { get; set; }           // e.g. "256705687760"
    }
}
