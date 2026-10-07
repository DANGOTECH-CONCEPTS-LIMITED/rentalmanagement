namespace Domain.Dtos.Meters
{
    public class SetMonthlyFeeDto
    {
        public double MonthlyFee { get; set; }
    }

    public class MeterFeeSummaryDto
    {
        public int OwnerId { get; set; }
        public string? OwnerName { get; set; }
        public double MonthlyFee { get; set; }
        public double OutstandingBalance { get; set; }
        public List<MeterFeeChargeDto> Charges { get; set; } = new();
    }

    public class MeterFeeChargeDto
    {
        public int Id { get; set; }
        public string MeterNumber { get; set; } = string.Empty;
        public string Period { get; set; } = string.Empty;
        public double Amount { get; set; }
        public double AmountPaid { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SettledAt { get; set; }
    }

    public class MeterFeeReportDto
    {
        public double TotalCharged { get; set; }
        public double TotalCollected { get; set; }
        public double TotalOutstanding { get; set; }
        public List<MeterFeeReportRowDto> Rows { get; set; } = new();
    }

    public class MeterFeeReportRowDto
    {
        public int UtilityMeterId { get; set; }
        public string MeterNumber { get; set; } = string.Empty;
        public string? OwnerName { get; set; }
        public string Period { get; set; } = string.Empty;
        public double Amount { get; set; }
        public double AmountPaid { get; set; }
        public double Balance { get; set; }
        public DateTime ChargedAt { get; set; }
        public DateTime? SettledAt { get; set; }
    }
}
