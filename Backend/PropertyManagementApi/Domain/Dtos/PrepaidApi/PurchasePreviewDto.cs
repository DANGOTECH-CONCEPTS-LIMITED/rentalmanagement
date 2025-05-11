using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.PrepaidApi
{
    public class PurchasePreviewDto
    {
        public string MeterNumber { get; init; }
        public decimal Amount { get; init; }
    }
}
