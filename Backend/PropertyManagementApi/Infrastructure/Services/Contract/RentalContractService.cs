using Application.Interfaces.Contract;
using Domain.Dtos.Contract;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Contract
{
    public class RentalContractService : IRentalContractService
    {
        private readonly AppDbContext _context;

        public RentalContractService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<RentalContract>> GetAllContractsAsync()
        {
            return await _context.RentalContracts
                .Include(c => c.Owner)
                .Include(c => c.Property)
                .Include(c => c.Unit)
                .Include(c => c.Tenant)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<RentalContract>> GetContractsByOwnerIdAsync(int ownerId)
        {
            return await _context.RentalContracts
                .Include(c => c.Property)
                .Include(c => c.Unit)
                .Include(c => c.Tenant)
                .Where(c => c.OwnerId == ownerId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<RentalContract> GetContractByIdAsync(int id)
        {
            var contract = await _context.RentalContracts
                .Include(c => c.Owner)
                .Include(c => c.Property)
                .Include(c => c.Unit)
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (contract == null)
                throw new Exception($"Contract with id {id} not found.");

            return contract;
        }

        public async Task<RentalContract> CreateContractAsync(CreateContractDto dto)
        {
            var contractNumber = $"RC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

            var contract = new RentalContract
            {
                ContractNumber = contractNumber,
                TenantName = dto.TenantName,
                TenantEmail = dto.TenantEmail,
                TenantPhone = dto.TenantPhone,
                PropertyName = dto.PropertyName,
                UnitName = dto.UnitName,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                RentAmount = dto.RentAmount,
                Currency = dto.Currency,
                SecurityDeposit = dto.SecurityDeposit,
                Status = dto.Status,
                Terms = dto.Terms,
                OwnerId = dto.OwnerId,
                PropertyId = dto.PropertyId,
                UnitId = dto.UnitId,
                TenantId = dto.TenantId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _context.RentalContracts.AddAsync(contract);
            await _context.SaveChangesAsync();

            return contract;
        }

        public async Task<RentalContract> UpdateContractAsync(UpdateContractDto dto)
        {
            var contract = await _context.RentalContracts.FindAsync(dto.Id)
                ?? throw new Exception($"Contract with id {dto.Id} not found.");

            contract.TenantName = dto.TenantName;
            contract.TenantEmail = dto.TenantEmail;
            contract.TenantPhone = dto.TenantPhone;
            contract.PropertyName = dto.PropertyName;
            contract.UnitName = dto.UnitName;
            contract.StartDate = dto.StartDate;
            contract.EndDate = dto.EndDate;
            contract.RentAmount = dto.RentAmount;
            contract.Currency = dto.Currency;
            contract.SecurityDeposit = dto.SecurityDeposit;
            contract.Status = dto.Status;
            contract.Terms = dto.Terms;
            contract.PropertyId = dto.PropertyId;
            contract.UnitId = dto.UnitId;
            contract.TenantId = dto.TenantId;
            contract.UpdatedAt = DateTime.UtcNow;

            _context.RentalContracts.Update(contract);
            await _context.SaveChangesAsync();

            return contract;
        }

        public async Task DeleteContractAsync(int id)
        {
            var contract = await _context.RentalContracts.FindAsync(id)
                ?? throw new Exception($"Contract with id {id} not found.");

            _context.RentalContracts.Remove(contract);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<RentalContract>> GetContractsByTenantIdAsync(int tenantId)
        {
            return await _context.RentalContracts
                .Include(c => c.Owner)
                .Include(c => c.Property)
                .Include(c => c.Unit)
                .Include(c => c.Tenant)
                .Where(c => c.TenantId == tenantId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<RentalContract> AcknowledgeContractAsync(int id)
        {
            var contract = await _context.RentalContracts.FindAsync(id)
                ?? throw new Exception($"Contract with id {id} not found.");

            contract.Status = "active";
            contract.UpdatedAt = DateTime.UtcNow;

            _context.RentalContracts.Update(contract);
            await _context.SaveChangesAsync();

            return contract;
        }
    }
}
