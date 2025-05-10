using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class ServicePaymentStatusRequestDto
    {
        public string Service { get; set; }         // e.g. "SMS"
        public string TransactionId { get; set; }   // e.g. "PMT12345"
    }
}
