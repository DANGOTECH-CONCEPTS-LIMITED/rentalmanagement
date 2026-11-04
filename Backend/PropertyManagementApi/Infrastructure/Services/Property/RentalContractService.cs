using Application.Interfaces.Property;
using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Property
{
    public class RentalContractService : IRentalContractService
    {
        private readonly AppDbContext _context;

        public RentalContractService(AppDbContext context)
        {
            _context = context;
        }

        private static readonly string[] ValidStatuses = ["PENDING", "ACTIVE", "EXPIRED", "TERMINATED"];

        private IQueryable<RentalContract> BaseQuery() => _context.RentalContracts.AsNoTracking()
            .Include(c => c.Tenant)
            .Include(c => c.Property)
                .ThenInclude(p => p.Owner);

        public async Task<IEnumerable<RentalContract>> GetByLandlordIdAsync(int landlordId, CancellationToken ct = default)
        {
            return await BaseQuery()
                .Where(c => c.Property.OwnerId == landlordId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<RentalContract> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await BaseQuery().FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw new KeyNotFoundException("Rental contract not found.");
        }

        public async Task<RentalContract> CreateAsync(RentalContractDto dto, CancellationToken ct = default)
        {
            if (dto.EndDate <= dto.StartDate)
                throw new ArgumentException("End date must be after the start date.");
            if (dto.RentAmount < 0 || dto.Deposit < 0)
                throw new ArgumentException("Rent and deposit must not be negative.");

            var tenant = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == dto.TenantId, ct)
                ?? throw new ArgumentException("Tenant not found.");
            var property = await _context.LandLordProperties.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.PropertyId, ct)
                ?? throw new ArgumentException("Property not found.");

            var status = (dto.Status ?? "PENDING").Trim().ToUpperInvariant();
            if (!ValidStatuses.Contains(status))
                throw new ArgumentException($"Status must be one of: {string.Join(", ", ValidStatuses)}.");

            var contract = new RentalContract
            {
                TenantId = dto.TenantId,
                PropertyId = dto.PropertyId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                RentAmount = dto.RentAmount,
                Deposit = dto.Deposit,
                Status = status
            };
            _context.RentalContracts.Add(contract);
            await _context.SaveChangesAsync(ct);
            return await GetByIdAsync(contract.Id, ct);
        }

        public async Task<RentalContract> RenewAsync(int id, DateTime newEndDate, CancellationToken ct = default)
        {
            var contract = await _context.RentalContracts.FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw new KeyNotFoundException("Rental contract not found.");
            if (newEndDate <= contract.EndDate)
                throw new ArgumentException("The renewed end date must be after the current end date.");
            contract.EndDate = newEndDate;
            contract.Status = "ACTIVE";
            contract.TerminatedAt = null;
            contract.TerminationReason = null;
            await _context.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task<RentalContract> TerminateAsync(int id, string reason, CancellationToken ct = default)
        {
            var contract = await _context.RentalContracts.FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw new KeyNotFoundException("Rental contract not found.");
            if (contract.Status == "TERMINATED")
                throw new InvalidOperationException("The contract is already terminated.");
            contract.Status = "TERMINATED";
            contract.TerminatedAt = DateTime.UtcNow;
            contract.TerminationReason = string.IsNullOrWhiteSpace(reason) ? "Terminated" : reason.Trim();
            await _context.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var contract = await _context.RentalContracts.FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw new KeyNotFoundException("Rental contract not found.");
            _context.RentalContracts.Remove(contract);
            await _context.SaveChangesAsync(ct);
        }
    }
}
