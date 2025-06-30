using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.TenantComplaints
{
    public class ComplaintDto
    {
        public string? Subject { get; set; }
        public string? Description { get; set; }
        public string? Priority { get; set; }
        public string? Status { get; set; }
        public string? ResolutionDetails { get; set; }
        public int PropertyId { get; set; }
    }
}
