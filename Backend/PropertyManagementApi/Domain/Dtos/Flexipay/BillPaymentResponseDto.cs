using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class BillPaymentResponseDto
    {
        public string StatusCode { get; set; }
        public string StatusDescription { get; set; }
        public string FlexiPayReferenceNumber { get; set; }
        public string ReceiptNumber { get; set; }
    }
}
