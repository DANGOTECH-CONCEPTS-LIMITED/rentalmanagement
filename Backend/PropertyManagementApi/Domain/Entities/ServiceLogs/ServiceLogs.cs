using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities.ServiceLogs
{
    public class ServiceLogs
    {
        public int Id { get; set; }
        public string ServiceName { get; set; }
        public DateTime LogDate { get; set; }
        public string LogLevel { get; set; }
        public string Message { get; set; }
        public string Exception { get; set; }
    }
}
