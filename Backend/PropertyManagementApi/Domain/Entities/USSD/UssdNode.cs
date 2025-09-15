using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.USSD
{
    public class UssdNode
    {
        public int Id { get; set; }
        public int MenuId { get; set; }
        public UssdMenu Menu { get; set; } = default!;
        public NodeType Type { get; set; }

        // Prompt supports templates like: "Pay {CURRENCY} {amount} for Meter {meter}?"
        public string Prompt { get; set; } = default!;

        // For Input nodes
        public string? ValidationRegex { get; set; }     // optional validator
        public string? DataKey { get; set; }             // where to store input
        public int? NextNodeId { get; set; }             // default next

        // For Action nodes (e.g., "LookupCustomer", "Checkout", "Cancel")
        public string? ActionKey { get; set; }           // your handler key

        public ICollection<UssdOption> Options { get; set; } = new List<UssdOption>();
    }

    public enum NodeType { Menu = 1, Input = 2, Action = 3, Exit = 4 }
}
