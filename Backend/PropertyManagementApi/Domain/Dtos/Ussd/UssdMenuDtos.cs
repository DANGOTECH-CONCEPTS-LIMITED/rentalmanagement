using System.Collections.Generic;

namespace Domain.Dtos.Ussd
{
    /// <summary>Editable representation of a USSD menu (tree of nodes and options).</summary>
    public class UssdMenuDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Title { get; set; } = default!;
        public int RootNodeId { get; set; }
        public List<UssdNodeDto> Nodes { get; set; } = new();
    }

    public class UssdNodeDto
    {
        public int Id { get; set; }

        /// <summary>1=Menu, 2=Input, 3=Action, 4=Exit (read-only; mirrors <see cref="Domain.Entities.USSD.NodeType"/>).</summary>
        public int Type { get; set; }

        public string Prompt { get; set; } = default!;
        public string? ValidationRegex { get; set; }
        public string? DataKey { get; set; }
        public int? NextNodeId { get; set; }
        public string? ActionKey { get; set; }
        public List<UssdOptionDto> Options { get; set; } = new();
    }

    public class UssdOptionDto
    {
        public int Id { get; set; }
        public string Label { get; set; } = default!;
        public string Value { get; set; } = default!;
        public int NextNodeId { get; set; }
    }

    /// <summary>Lightweight menu descriptor used by the admin menu picker.</summary>
    public class UssdMenuSummaryDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Title { get; set; } = default!;
        public int RootNodeId { get; set; }
    }

    public class CreateUssdMenuRequest
    {
        public string Code { get; set; } = default!;
        public string Title { get; set; } = default!;
    }
}
