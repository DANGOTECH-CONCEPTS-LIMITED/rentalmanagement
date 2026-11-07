namespace Domain.Dtos.Meters
{
    public class SetMonthlyFeeDto
    {
        public decimal MonthlyFee { get; set; }
    }

    public class MeterFeeSummaryDto
    {
        public int OwnerId { get; set; }
        public string? OwnerName { get; set; }
        public decimal MonthlyFee { get; set; }
        public decimal OutstandingBalance { get; set; }
        public List<MeterFeeChargeDto> Charges { get; set; } = new();
    }

    public class MeterFeeChargeDto
    {
        public int Id { get; set; }
        public string MeterNumber { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal AmountPaid { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SettledAt { get; set; }
    }

    public class MeterFeeReportDto
    {
        public decimal TotalCharged { get; set; }
        public decimal TotalCollected { get; set; }
        public decimal TotalOutstanding { get; set; }
        public List<MeterFeeReportRowDto> Rows { get; set; } = new();
    }

    public class MeterFeeReportRowDto
    {
        public int UtilityMeterId { get; set; }
        public string MeterNumber { get; set; } = string.Empty;
        public string? OwnerName { get; set; }
        public string Period { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal Balance { get; set; }
        public DateTime ChargedAt { get; set; }
        public DateTime? SettledAt { get; set; }
    }
}
