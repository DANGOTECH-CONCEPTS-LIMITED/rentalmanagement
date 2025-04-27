using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.Collecto
{
    public class ServicePaymentRequest
    {
        public string Service { get; set; }         // e.g. "SMS"
        public string PaymentOption { get; set; }   // e.g. "mobilemoney"
        public string Phone { get; set; }           // e.g. "256705687760"
        public decimal Amount { get; set; }         // e.g. 6000
        public string Message { get; set; }         // e.g. "SMS Top up"
    }
}
