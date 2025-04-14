using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.User
{
    public class UserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool Active { get; set; } = false;
        public string PassportPhoto { get; set; } = string.Empty;
        public string IdFront { get; set; } = string.Empty;
        public string IdBack { get; set; } = string.Empty;
        public string NationalIdNumber { get; set; } = string.Empty;
        public int SystemRoleId { get; set; }
    }
}
