using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class TransactionStatusRequestDto
    {
        public string RequestId { get; set; }
        public string ClientId { get; set; }
    }
}
