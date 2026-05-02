using Application.Interfaces.AuditTrail;
using Domain.Dtos.AuditTrail;
using Domain.Entities.AuditTrail;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Services.AuditTrail
{
    public class AuditTrailRepository : IAuditTrailRepository
    {
        private readonly AppDbContext _context;

        public AuditTrailRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task LogAuditAsync(AuditTrailWriteDto dto)
        {
            var entry = new AuditTrailEntry
            {
                CreatedAt = dto.CreatedAt == default ? DateTime.UtcNow : dto.CreatedAt,
                UserId = dto.UserId,
                UserName = dto.UserName,
                UserRole = dto.UserRole,
                HttpMethod = dto.HttpMethod,
                Route = dto.Route,
                Action = dto.Action,
                RequestData = dto.RequestData,
                ResultStatus = dto.ResultStatus,
                SourceIp = dto.SourceIp,
                Description = dto.Description,
            };

            await _context.AuditTrailEntries.AddAsync(entry);
            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<AuditTrailEntry>> GetByDateRangeAsync(
            DateTime startDate,
            DateTime endDate,
            string? userId = null,
            string? action = null,
            string? route = null,
            string? userRole = null)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            var query = _context.AuditTrailEntries.AsNoTracking()
                .Where(x => x.CreatedAt >= start && x.CreatedAt <= end);

            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(x => x.UserId == userId);
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(x => x.Action.Contains(action));
            }

            if (!string.IsNullOrWhiteSpace(route))
            {
                query = query.Where(x => x.Route.Contains(route));
            }

            if (!string.IsNullOrWhiteSpace(userRole))
            {
                query = query.Where(x => x.UserRole == userRole);
            }

            return await query
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }
    }
}
