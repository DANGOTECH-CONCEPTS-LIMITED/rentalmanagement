using System;

namespace Domain.Entities.External
{
 public class MpesaCallbackAudit
 {
 public int Id { get; set; }
 public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
 public string? Payload { get; set; }
 public string? Headers { get; set; }
 public string? TransId { get; set; }
 public string? Amount { get; set; }
 public string? BillRefNumber { get; set; }
 public bool Processed { get; set; } = false;
 }
}
