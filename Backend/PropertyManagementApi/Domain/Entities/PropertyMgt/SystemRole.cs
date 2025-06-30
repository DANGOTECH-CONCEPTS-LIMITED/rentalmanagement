using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
{
    public class SystemRole
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } = string.Empty;
        public string? Permissions { get; set; } = string.Empty; // JSON or comma-separated values
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
