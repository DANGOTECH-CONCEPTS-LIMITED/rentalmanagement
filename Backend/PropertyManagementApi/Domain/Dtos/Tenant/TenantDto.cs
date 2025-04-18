using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Tenant
{
    public class TenantDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string NationalIdNumber { get; set; } = string.Empty;
        public int PropertyId { get; set; }
        public DateTime? DateMovedIn { get; set; }
    }
}
