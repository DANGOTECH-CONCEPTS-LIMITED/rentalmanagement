using Domain.Dtos.AuditTrail;
using Domain.Entities.AuditTrail;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces.AuditTrail
{
    public interface IAuditTrailRepository
    {
        Task LogAuditAsync(AuditTrailWriteDto dto);
        Task<IReadOnlyList<AuditTrailEntry>> GetByDateRangeAsync(
            DateTime startDate,
            DateTime endDate,
            string? userId = null,
            string? action = null,
            string? route = null,
            string? userRole = null);
    }
}
