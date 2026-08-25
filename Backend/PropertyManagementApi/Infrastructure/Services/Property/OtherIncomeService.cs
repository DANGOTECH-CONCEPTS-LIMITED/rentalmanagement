using Application.Interfaces.Property;
using Domain.Dtos.Property.OtherIncome;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Property
{
    public class OtherIncomeService : IOtherIncomeService
    {
        private readonly AppDbContext _db;

        public OtherIncomeService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<PropertyOtherIncome> CreateAsync(CreateOtherIncomeDto dto)
        {
            var income = new PropertyOtherIncome
            {
                Date = dto.Date,
                Amount = dto.Amount,
                Category = dto.Category,
                Description = dto.Description,
                ReceivedFrom = dto.ReceivedFrom,
                ReferenceNumber = dto.ReferenceNumber,
                OwnerId = dto.OwnerId,
                PropertyId = dto.PropertyId,
                CreatedAt = DateTime.UtcNow,
            };
            await _db.OtherIncomes.AddAsync(income);
            await _db.SaveChangesAsync();
            await _db.Entry(income).Reference(i => i.Property).LoadAsync();
            return income;
        }

        public async Task<IEnumerable<PropertyOtherIncome>> GetByOwnerIdAsync(int ownerId)
        {
            return await _db.OtherIncomes
                .Include(i => i.Property)
                .Where(i => i.OwnerId == ownerId)
                .OrderByDescending(i => i.Date)
                .ToListAsync();
        }

        public async Task<PropertyOtherIncome> UpdateAsync(UpdateOtherIncomeDto dto)
        {
            var income = await _db.OtherIncomes.FindAsync(dto.Id)
                ?? throw new Exception("Record not found.");

            income.Date = dto.Date;
            income.Amount = dto.Amount;
            income.Category = dto.Category;
            income.Description = dto.Description;
            income.ReceivedFrom = dto.ReceivedFrom;
            income.ReferenceNumber = dto.ReferenceNumber;
            income.PropertyId = dto.PropertyId;
            income.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await _db.Entry(income).Reference(i => i.Property).LoadAsync();
            return income;
        }

        public async Task DeleteAsync(int id, int ownerId)
        {
            var income = await _db.OtherIncomes.FirstOrDefaultAsync(i => i.Id == id && i.OwnerId == ownerId)
                ?? throw new Exception("Record not found.");
            _db.OtherIncomes.Remove(income);
            await _db.SaveChangesAsync();
        }
    }
}
