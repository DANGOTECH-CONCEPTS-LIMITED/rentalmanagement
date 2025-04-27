using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.Collecto
{
    public class PayoutStatusRequest
    {
        public string Gateway { get; set; }         // e.g. "mobilemoney", "stanbicbank", etc.
        public string Reference { get; set; }       // e.g. "12345MYREF206"
    }
}
