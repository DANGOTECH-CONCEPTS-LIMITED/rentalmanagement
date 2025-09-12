using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.StsVending
{
    public sealed class StsVendResponse
    {
        public int Code { get; set; }
        public string? Message { get; set; }
        public StsVendData? Data { get; set; }
    }

    public sealed class StsVendData
    {
        public string? Token { get; set; }
        public string? MeterCode { get; set; }
        public string? Tarrif { get; set; }          // e.g. "3000.000 per unit"
        public decimal ServiceCharge { get; set; }
        public decimal VendingAmount { get; set; }   // maps to TotalPaid
        public decimal VendingQuantity { get; set; } // maps to TotalUnit
    }

}
