using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Collecto
{
    public class RequestToPayStatusRequestDto
    {
        public string TransactionId { get; set; }   // e.g. "PMT12345"
    }
}
