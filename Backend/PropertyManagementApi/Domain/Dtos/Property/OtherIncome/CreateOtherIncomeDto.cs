namespace Domain.Dtos.Property.OtherIncome
{
    public class CreateOtherIncomeDto
    {
        public DateTime Date { get; set; }
        public double Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? ReceivedFrom { get; set; }
        public string? ReferenceNumber { get; set; }
        public int OwnerId { get; set; }
        public int? PropertyId { get; set; }
    }
}
