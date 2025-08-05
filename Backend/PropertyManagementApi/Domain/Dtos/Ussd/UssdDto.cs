using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Ussd
{
    public class UssdDto
    {
        public string SessionId { get; set; }
        public string PhoneNumber { get; set; }
        public string NetworkCode { get; set; }
        public string ServiceCode { get; set; }
        public string Text { get; set; }
    }
}
