using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
{
    public class UtilityMeter
    {
        public int Id { get; set; }
        public string? MeterType { get; set; } // e.g., Electricity, Water, Gas
        public string MeterNumber { get; set; } // Unique identifier for the meter
        public string? NWSCAccount { get; set; }
        public string? LocationOfNwscMeter { get; set; } // Location of the NWSC meter, if applicable
        [ForeignKey("User")]
        public int LandLordId { get; set; } // Foreign key to the LandLord
        public User User { get; set; } // Navigation property to the LandLord

        public DateTime DateCreated { get; set; } = DateTime.Now;
    }
}
