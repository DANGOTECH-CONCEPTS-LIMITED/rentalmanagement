using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.Collecto
{
    public class ServicePaymentStatusRequest
    {
        public string Service { get; set; }         // e.g. "SMS"
        public string TransactionId { get; set; }   // e.g. "PMT12345"
    }
}
