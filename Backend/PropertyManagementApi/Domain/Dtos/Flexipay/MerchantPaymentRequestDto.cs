using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class MerchantPaymentRequestDto
    {
        public string Msisdn { get; set; }
        public string RequestId { get; set; }
        public string MerchantCode { get; set; }
        public string ReferenceNumber { get; set; }
        public string Amount { get; set; }
        public string SourceSystem { get; set; }
        public string Narrative { get; set; }
        public string ClientId { get; set; }
    }
}
