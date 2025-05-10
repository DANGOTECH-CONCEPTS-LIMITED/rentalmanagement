
namespace Domain.Dtos.Meters
{
    public class UtilityMeterDto
    {
        public string MeterType { get; set; } // e.g., Electricity, Water, Gas
        public string MeterNumber { get; set; } // Unique identifier for the meter
        public int LandLordId { get; set; } // Foreign key to the LandLord
    }
}
