using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class PropertyOtherIncome
    {
        public int Id { get; set; }

        public DateTime Date { get; set; }
        public double Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? ReceivedFrom { get; set; }
        public string? ReferenceNumber { get; set; }

        [ForeignKey("Owner")]
        public int OwnerId { get; set; }
        public User? Owner { get; set; }

        [ForeignKey("Property")]
        public int? PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
