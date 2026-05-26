namespace Domain.Dtos.User
{
    public class LandlordInvoiceSettingsDto
    {
        public int LandlordId { get; set; }
        public int GenerationDay { get; set; } = 1;
        public int DueDays { get; set; } = 7;
    }
}
