using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class RentalContract
    {
        public int Id { get; set; }

        [ForeignKey("Tenant")]
        public int TenantId { get; set; }
        public PropertyTenant? Tenant { get; set; }

        [ForeignKey("Property")]
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal RentAmount { get; set; }
        public decimal Deposit { get; set; }

        /// <summary>PENDING, ACTIVE, EXPIRED or TERMINATED.</summary>
        public string Status { get; set; } = "PENDING";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? TerminatedAt { get; set; }
        public string? TerminationReason { get; set; }
    }
}
