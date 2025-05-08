using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.PrepaidApi
{
    public class PurchaseResultDto
    {
        public string TransactionId { get; init; }
        public bool Success { get; init; }
        public string Message { get; init; }
    }
}
