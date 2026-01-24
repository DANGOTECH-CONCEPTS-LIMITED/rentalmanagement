using Application.Interfaces.ServiceLogs;
using Domain.Entities.ServiceLogs;
using Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Diagnostics;
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

            // Also log to Windows Event Viewer
            try
            {
                using var eventLog = new EventLog("Application");
                eventLog.Source = serviceName;
                string fullMessage = $"{level}: {message} - Exception: {exception}";
                eventLog.WriteEntry(fullMessage, EventLogEntryType.Error);
            }
            catch (Exception ex)
            {
                // If EventLog fails, don't throw; perhaps log to console or ignore
                Console.WriteLine($"Failed to write to EventLog: {ex.Message}");
            }
        }
    }
}
