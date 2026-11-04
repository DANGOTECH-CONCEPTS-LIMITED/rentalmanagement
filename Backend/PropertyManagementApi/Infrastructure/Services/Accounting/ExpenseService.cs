using Application.Interfaces.Accounting;
using Domain.Dtos.Accounting;
using Domain.Entities.Accounting;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Accounting
{
    public class ExpenseService : IExpenseService
    {
        private readonly AppDbContext _db;
        private readonly IAccountingService _accounting;

        public ExpenseService(AppDbContext db, IAccountingService accounting)
        {
            _db = db;
            _accounting = accounting;
        }

        public async Task<IEnumerable<Expense>> GetByLandlordIdAsync(int landlordId, DateTime? from, DateTime? to, CancellationToken ct = default)
        {
            var query = _db.Expenses.AsNoTracking().Where(e => e.LandlordId == landlordId);
            if (from.HasValue) query = query.Where(e => e.ExpenseDate >= from.Value.Date);
            if (to.HasValue) query = query.Where(e => e.ExpenseDate < to.Value.Date.AddDays(1));
            return await query.OrderByDescending(e => e.ExpenseDate).ToListAsync(ct);
        }

        public async Task<Expense> CreateAsync(ExpenseDto dto, CancellationToken ct = default)
        {
            if (dto.Amount <= 0) throw new ArgumentException("Expense amount must be positive.");
            if (string.IsNullOrWhiteSpace(dto.Description)) throw new ArgumentException("A description is required.");
            if (!await _db.Users.AnyAsync(u => u.Id == dto.LandlordId, ct))
                throw new ArgumentException("Landlord not found.");

            var correlationId = $"EXPENSE:{Guid.NewGuid():N}";
            var expense = new Expense
            {
                Amount = dto.Amount,
                Description = dto.Description.Trim(),
                Category = dto.Category?.Trim() ?? string.Empty,
                ExpenseDate = dto.ExpenseDate,
                LandlordId = dto.LandlordId,
                CorrelationId = correlationId
            };

            _db.Expenses.Add(expense);
            await _db.SaveChangesAsync(ct);

            try
            {
                await _accounting.PostAsync(PostingRules.ManualExpense(
                    correlationId: correlationId,
                    transactionId: $"EXP-{expense.Id}",
                    amount: dto.Amount,
                    landlordId: dto.LandlordId,
                    memo: dto.Description.Trim()));
            }
            catch
            {
                // Compensate: remove the expense row so the feature stays consistent.
                _db.Expenses.Remove(expense);
                await _db.SaveChangesAsync(CancellationToken.None);
                throw;
            }

            return expense;
        }

        public async Task DeleteAsync(int id, CancellationToken ct = default)
        {
            var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct)
                ?? throw new KeyNotFoundException("Expense not found.");

            // Remove the linked journal entry if it exists, then the expense.
            var journal = await _db.Set<JournalEntry>().FirstOrDefaultAsync(j => j.CorrelationId == expense.CorrelationId, ct);
            if (journal != null) _db.Set<JournalEntry>().Remove(journal);
            _db.Expenses.Remove(expense);
            await _db.SaveChangesAsync(ct);
        }
    }
}
