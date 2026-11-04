using System;

namespace Domain.Entities.USSD
{
    /// <summary>One billed USSD session charge imported from the operator's statement.</summary>
    public class UssdSessionCharge
    {
        public int Id { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public int? DurationSeconds { get; set; }
        public decimal Charge { get; set; }

        /// <summary>SUCCESSFUL, FAILED or UNKNOWN.</summary>
        public string? Outcome { get; set; }

        public DateTime BillingDate { get; set; } = DateTime.UtcNow;
        public string CorrelationId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
