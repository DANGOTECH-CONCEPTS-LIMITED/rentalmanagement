using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Payments
{
    public class PayInRequestDto
    {
        public string Gateway { get; set; } = string.Empty; // e.g., "stripe", "paypal", "mpesa"
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "UGX";
        public string Description { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty; // Unique reference for tracking
        public Dictionary<string, string> Metadata { get; set; } = new(); // Additional data
    }

    public class PayInResponseDto
    {
        public string TransactionId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // e.g., "pending", "completed"
        public string GatewayReference { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class PayoutRequestDto
    {
        public string Gateway { get; set; } = string.Empty; // e.g., "bank", "mobilemoney"
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "UGX";
        public string RecipientAccount { get; set; } = string.Empty; // Bank account or phone number
        public string RecipientName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    public class PayoutResponseDto
    {
        public string TransactionId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string GatewayReference { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}