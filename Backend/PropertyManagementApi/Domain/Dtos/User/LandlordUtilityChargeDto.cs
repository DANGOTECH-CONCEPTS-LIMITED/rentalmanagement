namespace Domain.Dtos.User
{
    public class LandlordUtilityChargeDto
    {
        public int LandlordId { get; set; }
        public string ChargeType { get; set; } = "Percentage";
        public double? ChargePercentage { get; set; }
        public double? FlatFee { get; set; }
        public List<LandlordUtilityChargeTierDto> Tiers { get; set; } = new();
    }

    public class LandlordUtilityChargeTierDto
    {
        public double? MinAmount { get; set; }
        public double? MaxAmount { get; set; }
        public double Charge { get; set; }
    }
}