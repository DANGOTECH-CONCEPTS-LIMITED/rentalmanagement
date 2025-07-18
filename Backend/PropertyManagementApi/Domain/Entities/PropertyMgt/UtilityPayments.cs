using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
{
    public class UtilityPayment
    {
        public int Id { get; set; }
        public string? Description { get; set; }
        public string? TransactionID { get; set; }
        public string? ReasonAtTelecom { get; set; }
        public string? PaymentMethod { get; set; }
        public string? UtilityType { get; set; }
        public string? Status { get; set; }
        public string? VendorTranId { get; set; }
        public double Amount { get; set; }
        public double Charges { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public string PhoneNumber { get; set; } = string.Empty;
        public string MeterNumber { get; set; } = string.Empty;
        public bool IsTokenGenerated { get; set; } = false;
        public string? Token { get; set; }
        public string? Units { get; set; }
        public string? Vendor { get; set; }
        public DateTime VendorPaymentDate { get; set; } = DateTime.Now;
        public string? UtilityAccountNumber { get; set; }
    }
}
