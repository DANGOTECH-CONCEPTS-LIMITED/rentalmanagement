using System;

namespace Domain.Dtos.Payments
{
    public class LandlordProfitLossDto
    {
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public decimal Income { get; set; }
        public decimal Expenses { get; set; }
        public decimal Net { get; set; }
        public int PaymentCount { get; set; }
        public int MaintenanceCount { get; set; }
    }
}
