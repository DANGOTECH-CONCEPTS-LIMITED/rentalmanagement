using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class BillPaymentRequestDto
    {
        public string ServiceId { get; set; }
        public string ClientId { get; set; }
        public string RequestReference { get; set; }
        public string CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Narrative { get; set; }
        public string Amount { get; set; }
        public string Location { get; set; }
        public string CustomerMobile { get; set; }
    }
}
