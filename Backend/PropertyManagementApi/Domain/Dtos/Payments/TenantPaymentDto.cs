using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments
{
    public class TenantPaymentDto
    {
        public double Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string PaymentMethod { get; set; } = string.Empty;
        public string Vendor { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
        public string? TransactionId { get; set; } = string.Empty;
        public string Description { get; set; }
        public int PropertyTenantId { get; set; }
    }
}
