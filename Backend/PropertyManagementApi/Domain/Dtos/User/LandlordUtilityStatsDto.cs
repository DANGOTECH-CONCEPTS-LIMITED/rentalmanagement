namespace Domain.Dtos.User
{
    public class LandlordUtilityStatsDto
    {
        public int LandlordId { get; set; }
        public int TotalMeters { get; set; }
        public int ActiveMeters { get; set; }
        public int InactiveMeters { get; set; }

        public int TotalUtilityPayments { get; set; }
        public double TotalUtilityAmount { get; set; }
        public double TotalUtilityCharges { get; set; }

        public int SuccessfulPayments { get; set; }
        public int PendingPayments { get; set; }
        public int FailedPayments { get; set; }

        public DateTime? FirstPaymentAt { get; set; }
        public DateTime? LastPaymentAt { get; set; }

        public List<MeterPaymentStatsDto> Meters { get; set; } = new();
    }

    public class MeterPaymentStatsDto
    {
        public string MeterNumber { get; set; } = string.Empty;
        public int Payments { get; set; }
        public double Amount { get; set; }
        //public double Charges { get; set; }
        public DateTime? LastPaymentAt { get; set; }
    }
}