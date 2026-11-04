using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class ArrearsPaymentPlan
    {
        public int Id { get; set; }

        [ForeignKey("Tenant")]
        public int TenantId { get; set; }
        public PropertyTenant? Tenant { get; set; }

        public decimal TotalAmount { get; set; }
        public decimal InstallmentAmount { get; set; }
        public int TotalInstallments { get; set; }
        public int PaidInstallments { get; set; }

        /// <summary>ACTIVE, COMPLETED or CANCELLED.</summary>
        public string Status { get; set; } = "ACTIVE";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
