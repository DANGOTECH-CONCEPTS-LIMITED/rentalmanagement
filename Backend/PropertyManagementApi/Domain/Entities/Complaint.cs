using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Complaint
    {
        public int Id { get; set; }
        public string Subject { get; set; }
        public string Description { get; set; }
        public string Priority { get; set; }
        public string Attachement {  get; set; }
        public DateTime DateCreated { get; set; }= DateTime.Now;
        public DateTime? DateUpdated { get; set; }
        public string Status { get; set; }
        public string? ResolutionDetails {  get; set; }
        [ForeignKey("Property")]
        public int PropertyId { get; set; }
        public LandLordProperty? Property { get; set; }

    }
}
