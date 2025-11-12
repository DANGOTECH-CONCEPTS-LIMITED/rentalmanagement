using System;
using System.Collections.Generic;

namespace Domain.Entities.Accounting
{
    public class JournalEntry
    {
        public int Id { get; set; }
        public DateTime EntryDate { get; set; } = DateTime.UtcNow;
        public string Description { get; set; } = string.Empty;

        public string CorrelationId { get; set; } = string.Empty; // unique for idempotency
        public string SourceType { get; set; } = string.Empty;    // e.g. WALLET_DEPOSIT
        public string SourceId { get; set; } = string.Empty;      // e.g. transactionId

        public ICollection<JournalLine> Lines { get; set; } = new List<JournalLine>();
    }
}