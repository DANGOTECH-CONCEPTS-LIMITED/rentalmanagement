using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.External
{
    public class VendorPayments
    {
        public int Id { get; set; }
        public string VendorName { get; set; }
        public string? VendorTranId { get; set; } = string.Empty;
        public string VendorCode { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string TransId { get; set; } = string.Empty;
        public string PhoneNumber { get; set; }
        public decimal Charge { get; set; } = 0;
        public string Status { get; set; } = "PENDING";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
