using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities.PropertyMgt
{
    public class CaretakerPropertyAssignment
    {
        public int Id { get; set; }

        [ForeignKey("Caretaker")]
        public int CaretakerId { get; set; }
        public User? Caretaker { get; set; }

        [ForeignKey("Property")]
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}