using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Domain.Dtos.ServiceLogs;

namespace Application.Interfaces.ServiceLogs
{
    public interface IServiceLogsRepository
    {
        Task LogErrorAsync(string serviceName, string level, string message, string exception);
        Task LogAsync(ServiceLogWriteDto dto);
        Task<IReadOnlyList<Domain.Entities.ServiceLogs.ServiceLogs>> GetByDateRangeAsync(DateTime startDate, DateTime endDate, string? sourceType = null);
        Task<(IReadOnlyList<Domain.Entities.ServiceLogs.ServiceLogs> Items, int Total)> GetPagedByDateRangeAsync(
            DateTime startDate, DateTime endDate, string? sourceType = null, string? search = null,
            int page = 1, int pageSize = 50, CancellationToken ct = default);
        Task<SerilogImportResultDto> ImportSerilogFilesAsync(string logsDirectory, string? fileName = null);
    }
}
