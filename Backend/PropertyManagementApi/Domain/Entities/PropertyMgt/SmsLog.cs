using System;

namespace Domain.Entities.PropertyMgt
{
    public class SmsLog
    {
        public int Id { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string SentByEmail { get; set; } = string.Empty;
        public string SentByRole { get; set; } = string.Empty;
        public bool Success { get; set; }
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
