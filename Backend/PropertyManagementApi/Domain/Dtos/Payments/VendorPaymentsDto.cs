using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments
{
    public class VendorPaymentsDto
    {
        public string VendorName { get; set; }
        public string VendorCode { get; set; }
        public string? VendorTranId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PhoneNumber { get; set; } 
    }
}
