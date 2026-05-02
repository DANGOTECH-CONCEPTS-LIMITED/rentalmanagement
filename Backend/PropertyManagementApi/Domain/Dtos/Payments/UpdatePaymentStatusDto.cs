using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments
{
    public class UpdatePaymentStatusDto
    {
        public string TransactionId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ReasonAtTelecom { get; set; }
        public string? VendorTranRef { get; set; }
        public string TranType { get; set; } = "UTILITY"; // or "PAYMENT" for tenant payments
    }
}
