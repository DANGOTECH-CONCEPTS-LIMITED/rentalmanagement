using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PropertyTenant
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
        public string PaymentStatus { get; set; } = string.Empty;
        public double BalanceDue { get; set; } = 0.0;
        public double Arrears { get; set; } = 0.0;
        public DateTime NextPaymentDate { get; set; } = DateTime.UtcNow;
        public DateTime? DateMovedIn { get; set; }
        [ForeignKey("Property")]
        public int PropertyId { get; set; }

        public LandLordProperty? Property { get; set; } = new LandLordProperty();
    }
}
