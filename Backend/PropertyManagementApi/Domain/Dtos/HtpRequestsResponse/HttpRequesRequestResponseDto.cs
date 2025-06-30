using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.HtpRequestsResponse
{
    public class HttpRequesRequestResponseDto
    {
        public string? Request { get; set; }
        public string? Response { get; set; }
        public string? Status { get; set; }
        public string? ErrorMessage { get; set; }
        public string? RequestType { get; set; }
        public string? RequestUrl { get; set; }
    }
}
