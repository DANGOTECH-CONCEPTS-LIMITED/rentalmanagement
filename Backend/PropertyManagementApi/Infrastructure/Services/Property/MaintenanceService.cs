using Application.Interfaces.Property;
using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Property
{
    public class MaintenanceService : IMaintenanceService
    {
        private readonly AppDbContext _context;

        public MaintenanceService(AppDbContext context)
        {
            _context = context;
        }

        private static readonly string[] ValidStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
        private static readonly string[] ValidPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

        private IQueryable<MaintenanceRequest> BaseQuery() => _context.MaintenanceRequests.AsNoTracking()
            .Include(r => r.Property)
                .ThenInclude(p => p.Owner)
            .Include(r => r.Tenant);

        public async Task<IEnumerable<MaintenanceRequest>> GetByLandlordIdAsync(int landlordId, CancellationToken ct = default)
        {
            return await BaseQuery()
                .Where(r => r.Property.OwnerId == landlordId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<MaintenanceRequest>> GetByTenantIdAsync(int tenantId, CancellationToken ct = default)
        {
            return await BaseQuery()
                .Where(r => r.TenantId == tenantId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<MaintenanceRequest> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await BaseQuery().FirstOrDefaultAsync(r => r.Id == id, ct)
                ?? throw new KeyNotFoundException("Maintenance request not found.");
        }

        public async Task<MaintenanceRequest> CreateAsync(MaintenanceRequestDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Subject))
                throw new ArgumentException("Subject is required.");
            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new ArgumentException("Description is required.");

            var priority = (dto.Priority ?? "MEDIUM").Trim().ToUpperInvariant();
            if (!ValidPriorities.Contains(priority))
                throw new ArgumentException($"Priority must be one of: {string.Join(", ", ValidPriorities)}.");

            if (!await _context.LandLordProperties.AnyAsync(p => p.Id == dto.PropertyId, ct))
                throw new ArgumentException("Property not found.");
            if (dto.TenantId.HasValue && !await _context.Tenants.AnyAsync(t => t.Id == dto.TenantId.Value, ct))
                throw new ArgumentException("Tenant not found.");

            var request = new MaintenanceRequest
            {
                Subject = dto.Subject.Trim(),
                Description = dto.Description.Trim(),
                Priority = priority,
                PropertyId = dto.PropertyId,
                TenantId = dto.TenantId
            };
            _context.MaintenanceRequests.Add(request);
            await _context.SaveChangesAsync(ct);
            return await GetByIdAsync(request.Id, ct);
        }

        public async Task<MaintenanceRequest> UpdateAsync(int id, MaintenanceUpdateDto dto, CancellationToken ct = default)
        {
            var request = await _context.MaintenanceRequests.FirstOrDefaultAsync(r => r.Id == id, ct)
                ?? throw new KeyNotFoundException("Maintenance request not found.");

            var status = (dto.Status ?? string.Empty).Trim().ToUpperInvariant();
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException($"Status must be one of: {string.Join(", ", ValidStatuses)}.");
            if (dto.Cost < 0)
                throw new ArgumentException("Cost must not be negative.");

            request.Status = status;
            request.Cost = dto.Cost;
            request.ResolutionDetails = dto.ResolutionDetails;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var request = await _context.MaintenanceRequests.FirstOrDefaultAsync(r => r.Id == id, ct)
                ?? throw new KeyNotFoundException("Maintenance request not found.");
            _context.MaintenanceRequests.Remove(request);
            await _context.SaveChangesAsync(ct);
        }
    }
}
