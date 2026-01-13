using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.Prepaid
{
    public class PurchaseResultDto
    {
        public string Token { get; set; } = string.Empty;
        public int Units { get; set; }
    }
}