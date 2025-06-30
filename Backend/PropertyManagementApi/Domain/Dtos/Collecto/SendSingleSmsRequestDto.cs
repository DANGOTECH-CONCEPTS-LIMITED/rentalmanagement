using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class SendSingleSmsRequestDto
    {
        public string Phone { get; set; }           // e.g. "256705687760"
        public string Message { get; set; }         // e.g. "SMS Message"
        public string Reference { get; set; }       // e.g. "12345"
    }
}
