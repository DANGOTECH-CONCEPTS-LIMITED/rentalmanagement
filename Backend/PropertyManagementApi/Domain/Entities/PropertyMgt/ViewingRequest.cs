using System;

namespace Domain.Entities.PropertyMgt
{
    public class ViewingRequest
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }
        public int TenantId { get; set; }
        public string TenantName { get; set; } = string.Empty;
        public string TenantEmail { get; set; } = string.Empty;
        public string TenantPhone { get; set; } = string.Empty;
        public DateTime PreferredDate { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
