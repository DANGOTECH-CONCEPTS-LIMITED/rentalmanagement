using System;

namespace Domain.Dtos.Tenant
{
    public class TenantProfileDto
    {
        public int TenantId { get; set; }
        public int? UserId { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string NationalIdNumber { get; set; } = string.Empty;

        public bool Active { get; set; }
        public DateTime? DateMovedIn { get; set; }

        public int PropertyId { get; set; }
        public string PropertyName { get; set; } = string.Empty;
        public string PropertyType { get; set; } = string.Empty;

        public int? PropertyUnitId { get; set; }
        public string UnitNumber { get; set; } = string.Empty;

        public string PropertyAddress { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
    }
}
