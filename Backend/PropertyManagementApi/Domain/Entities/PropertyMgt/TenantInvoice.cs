using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class TenantInvoice
    {
        public int Id { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public string Type { get; set; } = "Invoice";
        public string Status { get; set; } = "Pending";

        public double Amount { get; set; }
        public double OriginalAmount { get; set; }
        public double PaidAmount { get; set; }
        public double RefundedAmount { get; set; }
        public double DeductedAmount { get; set; }

        public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; }

        public string? Notes { get; set; }
        public string? PaymentMethod { get; set; }

        [ForeignKey("Tenant")]
        public int TenantId { get; set; }
        public PropertyTenant? Tenant { get; set; }

        [ForeignKey("Property")]
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        [ForeignKey("Unit")]
        public int? PropertyUnitId { get; set; }
        public PropertyUnit? Unit { get; set; }

        [ForeignKey("CreatedBy")]
        public int CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
