using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments
{
    public class UtilityPaymentDto
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string MeterNumber { get; set; } = string.Empty;
        public double Amount { get; set; }
    }
}
