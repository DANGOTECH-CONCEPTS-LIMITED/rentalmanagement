namespace Domain.Dtos.Property
{
    public class RemoveTenantFromUnitDto
    {
        public double RefundAmount { get; set; }
        public double DeductionAmount { get; set; }
        public string? Notes { get; set; }
        public int? ProcessedByUserId { get; set; }
    }
}