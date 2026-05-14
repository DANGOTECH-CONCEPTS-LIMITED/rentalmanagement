using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class PropertyExpense
    {
        public int Id { get; set; }

        public DateTime Date { get; set; }
        public double Amount { get; set; }

        public string Category { get; set; } = string.Empty;
        public string PaidBy { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public string? ReceiptReference { get; set; }

        [ForeignKey("Owner")]
        public int OwnerId { get; set; }
        public User? Owner { get; set; }

        [ForeignKey("Property")]
        public int? PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        [ForeignKey("Unit")]
        public int? PropertyUnitId { get; set; }
        public PropertyUnit? Unit { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
