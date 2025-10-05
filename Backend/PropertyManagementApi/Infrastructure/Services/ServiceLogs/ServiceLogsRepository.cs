using Application.Interfaces.ServiceLogs;
using Domain.Entities.ServiceLogs;
using Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.ServiceLogs
{
    public class ServiceLogsRepository : IServiceLogsRepository
    {
        private readonly AppDbContext _context;

        public ServiceLogsRepository(AppDbContext context) => _context = context;

        public async Task LogErrorAsync(string serviceName, string level, string message, string exception)
        {
            var logEntry = new Domain.Entities.ServiceLogs.ServiceLogs
            {
                ServiceName = serviceName,
                LogDate = DateTime.UtcNow,
                LogLevel = level,
                Message = message,
                Exception = exception
            };
            _context.ServiceLogs.Add(logEntry);
            await _context.SaveChangesAsync();
        }
    }
}
