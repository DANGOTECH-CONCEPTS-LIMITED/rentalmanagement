namespace Domain.Dtos.User
{
    public class LandlordUtilityChargeDto
    {
        public int LandlordId { get; set; }
        public string ChargeType { get; set; } = "Percentage";
        public decimal? ChargePercentage { get; set; }
        public decimal? FlatFee { get; set; }
        public List<LandlordUtilityChargeTierDto> Tiers { get; set; } = new();
        /// <summary>Set when the stored tier JSON could not be read, so the UI can explain the missing bands.</summary>
        public string? TiersWarning { get; set; }
    }

    public class LandlordUtilityChargeTierDto
    {
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
        public decimal Charge { get; set; }
    }
}