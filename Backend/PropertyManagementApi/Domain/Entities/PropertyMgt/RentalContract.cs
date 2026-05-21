using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class RentalContract
    {
        public int Id { get; set; }
        public string ContractNumber { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string TenantEmail { get; set; } = string.Empty;
        public string TenantPhone { get; set; } = string.Empty;
        public string PropertyName { get; set; } = string.Empty;
        public string UnitName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public double RentAmount { get; set; }
        public string Currency { get; set; } = "UGX";
        public double SecurityDeposit { get; set; }
        public string Status { get; set; } = "pending"; // active | expired | pending | terminated
        public string? Terms { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("Owner")]
        public int OwnerId { get; set; }
        public User? Owner { get; set; }

        [ForeignKey("Property")]
        public int? PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        [ForeignKey("Unit")]
        public int? UnitId { get; set; }
        public PropertyUnit? Unit { get; set; }

        [ForeignKey("Tenant")]
        public int? TenantId { get; set; }
        public PropertyTenant? Tenant { get; set; }
    }
}
