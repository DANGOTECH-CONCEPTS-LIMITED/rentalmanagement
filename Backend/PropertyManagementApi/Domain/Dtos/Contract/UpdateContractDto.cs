namespace Domain.Dtos.Contract
{
    public class UpdateContractDto
    {
        public int Id { get; set; }
        public string TenantName { get; set; } = string.Empty;
        public string TenantEmail { get; set; } = string.Empty;
        public string TenantPhone { get; set; } = string.Empty;
        public string PropertyName { get; set; } = string.Empty;
        public string UnitName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public double RentAmount { get; set; }
        public string Currency { get; set; } = "UGX";
        public double SecurityDeposit { get; set; }
        public string Status { get; set; } = "pending";
        public string? Terms { get; set; }
        public int? PropertyId { get; set; }
        public int? UnitId { get; set; }
        public int? TenantId { get; set; }
    }
}
