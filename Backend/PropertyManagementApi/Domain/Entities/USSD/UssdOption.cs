using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.USSD
{
    public class UssdOption
    {
        public int Id { get; set; }
        public int NodeId { get; set; }
        public UssdNode Node { get; set; } = default!;
        public string Label { get; set; } = default!;     // "1. Pay water bill"
        public string Value { get; set; } = default!;     // "1"
        public int NextNodeId { get; set; }
    }
}
