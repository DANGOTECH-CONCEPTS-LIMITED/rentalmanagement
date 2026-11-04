using System;

namespace Domain.Entities.USSD
{
    /// <summary>An uploaded USSD statement queued for background processing.</summary>
    public class UssdImportBatch
    {
        public int Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime? BillingDate { get; set; }

        /// <summary>PENDING, PROCESSING, COMPLETED or FAILED.</summary>
        public string Status { get; set; } = "PENDING";

        public int TotalRows { get; set; }
        public int ImportedRows { get; set; }
        public int SkippedRows { get; set; }
        public string? Error { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; }
    }
}
