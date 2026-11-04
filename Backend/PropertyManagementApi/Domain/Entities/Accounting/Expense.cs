using System;
using System.ComponentModel.DataAnnotations.Schema;
using Domain.Entities.PropertyMgt;

namespace Domain.Entities.Accounting
{
    public class Expense
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Links the expense to its journal entry for idempotency and cleanup.</summary>
        public string CorrelationId { get; set; } = string.Empty;

        [ForeignKey("Landlord")]
        public int LandlordId { get; set; }
        public User? Landlord { get; set; }
    }
}
