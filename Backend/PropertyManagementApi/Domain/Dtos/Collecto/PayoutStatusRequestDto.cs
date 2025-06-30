using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class PayoutStatusRequestDto
    {
        public string Gateway { get; set; }         // e.g. "mobilemoney", "stanbicbank", etc.
        public string Reference { get; set; }       // e.g. "12345MYREF206"
    }
}
