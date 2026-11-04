using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class MaintenanceRequest
    {
        public int Id { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        /// <summary>LOW, MEDIUM, HIGH or URGENT.</summary>
        public string Priority { get; set; } = "MEDIUM";

        /// <summary>OPEN, IN_PROGRESS, RESOLVED or CLOSED.</summary>
        public string Status { get; set; } = "OPEN";

        public decimal Cost { get; set; }
        public string? ResolutionDetails { get; set; }

        [ForeignKey("Property")]
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        [ForeignKey("Tenant")]
        public int? TenantId { get; set; }
        public PropertyTenant? Tenant { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
