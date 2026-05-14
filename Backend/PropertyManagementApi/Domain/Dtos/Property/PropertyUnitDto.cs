namespace Domain.Dtos.Property
{
    public class PropertyUnitDto
    {
        public int PropertyId { get; set; }
        public string UnitNumber { get; set; } = string.Empty;
        public double SecurityDeposit { get; set; }
        public double MonthlyAmount { get; set; }
        public string Status { get; set; } = "Available";
    }
}
