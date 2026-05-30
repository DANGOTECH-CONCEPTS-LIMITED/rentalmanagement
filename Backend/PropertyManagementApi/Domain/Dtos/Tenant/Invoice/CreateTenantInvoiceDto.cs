using System;

namespace Domain.Dtos.Tenant.Invoice
{
    public class CreateTenantInvoiceDto
    {
        public string Type { get; set; } = "Invoice";
        public string Status { get; set; } = "Pending";

        public int TenantId { get; set; }
        public int PropertyId { get; set; }
        public int? PropertyUnitId { get; set; }

        public double Amount { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime DueDate { get; set; }

        public string? Notes { get; set; }
        public string? PaymentMethod { get; set; }

        public int CreatedByUserId { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
    }
}
