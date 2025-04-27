using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.Collecto
{
    public class RequestToPayRequest
    {
        public string PaymentOption { get; set; }   // e.g. "mobilemoney"
        public string Phone { get; set; }           // e.g. "256705687760"
        public decimal Amount { get; set; }         // e.g. 6000
        public string Reference { get; set; }       // user-defined reference
    }
}
