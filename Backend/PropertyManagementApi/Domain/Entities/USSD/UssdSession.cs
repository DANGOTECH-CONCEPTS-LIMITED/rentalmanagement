using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.USSD
{
    public class UssdSession
    {
        public int Id { get; set; }
        public string SessionId { get; set; } = default!;
        public string ServiceCode { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;
        public int CurrentNodeId { get; set; }
        public string DataJson { get; set; } = "{}";      // collected inputs { "meter": "...", "amount": "..." }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
