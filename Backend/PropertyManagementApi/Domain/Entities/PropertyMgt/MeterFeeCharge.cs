namespace Domain.Entities.PropertyMgt
{
    public class MeterFeeCharge
    {
        public int Id { get; set; }
        public int UtilityMeterId { get; set; }
        public string MeterNumber { get; set; } = string.Empty;
        // Billing month in yyyy-MM format; unique per meter so a month is never charged twice.
        public string Period { get; set; } = string.Empty;
        public double Amount { get; set; }
        public double AmountPaid { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? SettledAt { get; set; }
    }
}
