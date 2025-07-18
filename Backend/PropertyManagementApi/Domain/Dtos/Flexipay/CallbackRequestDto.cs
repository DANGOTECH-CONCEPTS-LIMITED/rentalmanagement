using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class CallbackRequestDto
    {
        public string StatusCode { get; set; }
        public string StatusDescription { get; set; }
        public string TransactionReferenceNumber { get; set; }
        public string FlexiPayReferenceNumber { get; set; }
        public string CustomerNumber { get; set; }
        public string Narrative { get; set; }
        public string Amount { get; set; }
    }
}
