using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool Active { get; set; } = false;
        public string PassportPhoto { get; set; } = string.Empty;
        public string IdFront { get; set; } = string.Empty;
        public string IdBack { get; set; } = string.Empty;
        public string NationalIdNumber { get; set; } = string.Empty;
        public bool PasswordChanged { get; set; } = false;
        public bool Verified { get; set; } = false;
        public string? Token { get; set; } = string.Empty;
        [ForeignKey("SystemRole")]
        public int SystemRoleId { get; set; }

        public SystemRole? SystemRole { get; set; }
    }
}
