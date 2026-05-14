using System;

namespace Domain.Dtos.Property.Expense
{
    public class ExpenseQueryDto
    {
        public int OwnerId { get; set; }
        public int? PropertyId { get; set; }
        public int? PropertyUnitId { get; set; }
        public string? Category { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Search { get; set; }
    }
}
