using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ServiceLogs
{
    public interface IServiceLogsRepository
    {
        Task LogErrorAsync(string serviceName, string level, string message, string exception);
    }
}
