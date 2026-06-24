using System;
using System.Collections.Generic;

namespace Domain.Dtos.Tenant.Invoice
{
    public class CustomerStatementLineDto
    {
        public DateTime Date { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Debit { get; set; }
        public double Credit { get; set; }
        public double RunningBalance { get; set; }
    }

    public class CustomerStatementDto
    {
        public int TenantId { get; set; }
        public string TenantName { get; set; } = string.Empty;
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public double OpeningBalance { get; set; }
        public double ClosingBalance { get; set; }
        public IReadOnlyList<CustomerStatementLineDto> Lines { get; set; } = Array.Empty<CustomerStatementLineDto>();
    }
}