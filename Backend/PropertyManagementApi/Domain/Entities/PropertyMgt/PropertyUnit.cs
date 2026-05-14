using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class PropertyUnit
    {
        public int Id { get; set; }

        [ForeignKey("Property")]
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        public string UnitNumber { get; set; } = string.Empty;

        public double SecurityDeposit { get; set; }
        public double MonthlyAmount { get; set; }

        public string Status { get; set; } = "Available";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
