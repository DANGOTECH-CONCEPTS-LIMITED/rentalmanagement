﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
{
    public class TenantPayment
    {
        public int Id { get; set; }
        public double Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string PaymentMethod { get; set; } = string.Empty;
        public string Vendor { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public string VendorTransactionId { get; set; } = string.Empty;

        public string ReasonAtTelecom { get; set; } = string.Empty;
        public string? Description { get; set; } = string.Empty;
        [ForeignKey("PropertyTenant")]
        public int PropertyTenantId { get; set; }
        public PropertyTenant PropertyTenant { get; set; } = new PropertyTenant();
    }
}
