namespace Domain.Dtos.Property
{
    public class MaintenanceRequestDto
    {
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "MEDIUM";
        public int PropertyId { get; set; }
        public int? TenantId { get; set; }
    }

    public class MaintenanceUpdateDto
    {
        public string Status { get; set; } = string.Empty;
        public decimal Cost { get; set; }
        public string? ResolutionDetails { get; set; }
    }
}
