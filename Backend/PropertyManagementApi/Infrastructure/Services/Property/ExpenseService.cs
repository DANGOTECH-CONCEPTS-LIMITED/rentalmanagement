using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.Property;
using Domain.Dtos.Property.Expense;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Property
{
    public class ExpenseService : IExpenseService
    {
        private readonly AppDbContext _db;

        public ExpenseService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<PropertyExpense> CreateExpenseAsync(CreateExpenseDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.OwnerId <= 0)
                throw new Exception("Owner is required.");

            if (dto.Amount <= 0)
                throw new Exception("Amount must be greater than zero.");

            if (dto.Date == default)
                dto.Date = DateTime.UtcNow.Date;

            if (string.IsNullOrWhiteSpace(dto.Category))
                throw new Exception("Category is required.");

            if (string.IsNullOrWhiteSpace(dto.PaidBy))
                throw new Exception("PaidBy is required.");

            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new Exception("Description is required.");

            var ownerExists = await _db.Users.AsNoTracking().AnyAsync(u => u.Id == dto.OwnerId);
            if (!ownerExists)
                throw new Exception("Owner not found.");

            if (dto.PropertyId.HasValue)
            {
                var property = await _db.LandLordProperties.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.PropertyId.Value);
                if (property == null)
                    throw new Exception("Property not found.");

                if (property.OwnerId != dto.OwnerId)
                    throw new Exception("Property does not belong to owner.");
            }

            if (dto.PropertyUnitId.HasValue)
            {
                var unit = await _db.PropertyUnits.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.PropertyUnitId.Value);
                if (unit == null)
                    throw new Exception("Unit not found.");

                if (dto.PropertyId.HasValue && unit.PropertyId != dto.PropertyId.Value)
                    throw new Exception("Unit does not belong to the selected property.");
            }

            var expense = new PropertyExpense
            {
                OwnerId = dto.OwnerId,
                PropertyId = dto.PropertyId,
                PropertyUnitId = dto.PropertyUnitId,
                Date = dto.Date,
                Amount = dto.Amount,
                Category = dto.Category.Trim(),
                PaidBy = dto.PaidBy.Trim(),
                Description = dto.Description.Trim(),
                ReceiptReference = string.IsNullOrWhiteSpace(dto.ReceiptReference) ? null : dto.ReceiptReference.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.PropertyExpenses.Add(expense);
            await _db.SaveChangesAsync();
            return expense;
        }

        public async Task<PropertyExpense> UpdateExpenseAsync(int expenseId, UpdateExpenseDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            var expense = await _db.PropertyExpenses.FirstOrDefaultAsync(x => x.Id == expenseId);
            if (expense == null)
                throw new Exception("Expense not found.");

            if (dto.Amount <= 0)
                throw new Exception("Amount must be greater than zero.");

            if (dto.Date == default)
                throw new Exception("Date is required.");

            if (string.IsNullOrWhiteSpace(dto.Category))
                throw new Exception("Category is required.");

            if (string.IsNullOrWhiteSpace(dto.PaidBy))
                throw new Exception("PaidBy is required.");

            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new Exception("Description is required.");

            if (dto.PropertyId.HasValue)
            {
                var property = await _db.LandLordProperties.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.PropertyId.Value);
                if (property == null)
                    throw new Exception("Property not found.");

                if (property.OwnerId != expense.OwnerId)
                    throw new Exception("Property does not belong to owner.");
            }

            if (dto.PropertyUnitId.HasValue)
            {
                var unit = await _db.PropertyUnits.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.PropertyUnitId.Value);
                if (unit == null)
                    throw new Exception("Unit not found.");

                if (dto.PropertyId.HasValue && unit.PropertyId != dto.PropertyId.Value)
                    throw new Exception("Unit does not belong to the selected property.");
            }

            expense.PropertyId = dto.PropertyId;
            expense.PropertyUnitId = dto.PropertyUnitId;
            expense.Date = dto.Date;
            expense.Amount = dto.Amount;
            expense.Category = dto.Category.Trim();
            expense.PaidBy = dto.PaidBy.Trim();
            expense.Description = dto.Description.Trim();
            expense.ReceiptReference = string.IsNullOrWhiteSpace(dto.ReceiptReference) ? null : dto.ReceiptReference.Trim();
            expense.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return expense;
        }

        public async Task DeleteExpenseAsync(int expenseId)
        {
            var expense = await _db.PropertyExpenses.FirstOrDefaultAsync(x => x.Id == expenseId);
            if (expense == null)
                throw new Exception("Expense not found.");

            _db.PropertyExpenses.Remove(expense);
            await _db.SaveChangesAsync();
        }

        public async Task<PropertyExpense> GetExpenseByIdAsync(int expenseId)
        {
            var expense = await _db.PropertyExpenses
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == expenseId);

            if (expense == null)
                throw new Exception("Expense not found.");

            return expense;
        }

        public async Task<IEnumerable<PropertyExpense>> GetExpensesAsync(ExpenseQueryDto query)
        {
            if (query == null)
                throw new ArgumentNullException(nameof(query));

            if (query.OwnerId <= 0)
                throw new Exception("OwnerId is required.");

            var q = _db.PropertyExpenses
                .AsNoTracking()
                .Where(x => x.OwnerId == query.OwnerId);

            if (query.PropertyId.HasValue)
                q = q.Where(x => x.PropertyId == query.PropertyId.Value);

            if (query.PropertyUnitId.HasValue)
                q = q.Where(x => x.PropertyUnitId == query.PropertyUnitId.Value);

            if (!string.IsNullOrWhiteSpace(query.Category))
                q = q.Where(x => x.Category == query.Category);

            if (query.From.HasValue)
                q = q.Where(x => x.Date >= query.From.Value);

            if (query.To.HasValue)
                q = q.Where(x => x.Date <= query.To.Value);

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var s = query.Search.Trim();
                q = q.Where(x => x.Description.Contains(s) || x.PaidBy.Contains(s));
            }

            return await q
                .OrderByDescending(x => x.Date)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }
    }
}
