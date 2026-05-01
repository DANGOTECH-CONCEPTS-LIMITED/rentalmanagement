using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.External
{
    public class AfricasTalkingSmsRequest
    {
        public string username { get; set; }
        public string message { get; set; }
        public string senderId { get; set; }
        public List<string> phoneNumbers { get; set; }
    }
}
