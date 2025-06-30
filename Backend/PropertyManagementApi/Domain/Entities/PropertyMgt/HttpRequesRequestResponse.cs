using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.PropertyMgt
{
    public class HttpRequesRequestResponse
    {
        public int Id { get; set; }
        public string? Request { get; set; }
        public string? Response { get; set; }
        public string? Status { get; set; }
        public string? ErrorMessage { get; set; }
        public string? RequestType { get; set; }
        public string? RequestUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

    }
}
