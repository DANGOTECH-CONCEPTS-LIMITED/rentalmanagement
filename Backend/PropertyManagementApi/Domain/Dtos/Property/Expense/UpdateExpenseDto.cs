using System;

namespace Domain.Dtos.Property.Expense
{
    public class UpdateExpenseDto
    {
        public DateTime Date { get; set; }
        public double Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string PaidBy { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public int? PropertyId { get; set; }
        public int? PropertyUnitId { get; set; }

        public string? ReceiptReference { get; set; }
    }
}
