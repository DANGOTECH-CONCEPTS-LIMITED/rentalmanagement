using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.USSD
{
    public class UssdMenu
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;   // e.g., "waterpay"
        public string Title { get; set; } = default!;  // e.g., "Welcome to WaterPay"
        public int RootNodeId { get; set; }
        public ICollection<UssdNode> Nodes { get; set; } = new List<UssdNode>();
    }
}
