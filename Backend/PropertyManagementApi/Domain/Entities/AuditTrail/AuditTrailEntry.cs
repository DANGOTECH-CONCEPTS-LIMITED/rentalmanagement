using System;

namespace Domain.Entities.AuditTrail
{
    public class AuditTrailEntry
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string? UserName { get; set; }
        public string? UserRole { get; set; }
        public string HttpMethod { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string? RequestData { get; set; }
        public string? ResultStatus { get; set; }
        public string? SourceIp { get; set; }
        public string? Description { get; set; }
    }
}
