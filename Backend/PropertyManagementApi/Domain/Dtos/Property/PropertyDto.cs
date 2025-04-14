using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Property
{
    public class PropertyDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Type { get; set; } = string.Empty; // e.g., "Apartment", "House", etc.
        public string? Address { get; set; } = string.Empty;
        public string? Region { get; set; } = string.Empty;
        public string? District { get; set; } = string.Empty;
        public string? Zipcode { get; set; } = string.Empty;
        public int NumberOfRooms { get; set; } = 0;
        public string? Description { get; set; } = string.Empty;
        public bool Occupied { get; set; } = false;
        public double Price { get; set; }
        public int OwnerId { get; set; }
    }
}
