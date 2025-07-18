using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Flexipay
{
    public class CallbackResponseDto
    {
        public string StatusCode { get; set; }
        public string StatusDescription { get; set; }
    }
}
