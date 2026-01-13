using System;
using System.ComponentModel.DataAnnotations;

namespace Domain.Entities.PropertyMgt
{
    public class MeterToken
    {
        [Key]
        public int Id { get; set; }
        public string MeterNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string MeterName { get; set; } = string.Empty; // Assuming name is available
        public int Units { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public bool IsUsed { get; set; } = false;
    }
}