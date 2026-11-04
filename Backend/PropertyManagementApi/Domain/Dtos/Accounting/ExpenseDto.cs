using System;

namespace Domain.Dtos.Accounting
{
    public class ExpenseDto
    {
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
        public int LandlordId { get; set; }
    }
}
