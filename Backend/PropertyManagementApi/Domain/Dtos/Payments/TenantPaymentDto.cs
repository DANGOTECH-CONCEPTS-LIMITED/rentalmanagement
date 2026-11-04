using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities.PropertyMgt;

namespace Domain.Dtos.Payments
{
    public class TenantPaymentDto
    {
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string PaymentMethod { get; set; } = string.Empty;
        public string Vendor { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
        public string? TransactionId { get; set; } = string.Empty;
        public string Description { get; set; }
        public int PropertyTenantId { get; set; }
    }

    public class TenantPaymentPage
    {
        public List<TenantPayment> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasMore { get; set; }
    }
}
