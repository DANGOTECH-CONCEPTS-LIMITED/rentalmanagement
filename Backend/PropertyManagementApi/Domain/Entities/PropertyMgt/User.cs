using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
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
        public string? BankAccountNumber { get; set; } = string.Empty;
        public string? BankName { get; set; } = string.Empty;
        public string? SwiftCode { get; set; } = string.Empty;
        public bool PasswordChanged { get; set; } = false;
        public bool Verified { get; set; } = false;
        public string? Token { get; set; } = string.Empty;
        public string? UtilityChargeType { get; set; } = "Percentage";
        public decimal? UtilityChargePercentage { get; set; }
        public decimal? UtilityChargeFlatFee { get; set; }
        public string? UtilityChargeTiersJson { get; set; }
        // Fee charged monthly on every meter assigned to this user.
        public decimal MonthlyMeterFee { get; set; }
        public DateTime? MonthlyMeterFeeEffectiveFrom { get; set; }

        // Login flow flags: the password step succeeded but a TOTP code is still owed.
        // The secret itself lives in UserMfaSetting, never on the user row.
        [NotMapped] public bool RequiresMfa { get; set; }
        [NotMapped] public string? MfaChallengeId { get; set; }
        [ForeignKey("SystemRole")]
        public int SystemRoleId { get; set; }

        public SystemRole? SystemRole { get; set; }
    }
}
