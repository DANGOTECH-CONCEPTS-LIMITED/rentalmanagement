using Domain.Dtos.Accounting;
using Domain.Entities.Accounting;

namespace Application.Interfaces.Accounting
{
    public interface IExpenseService
    {
        Task<IEnumerable<Expense>> GetByLandlordIdAsync(int landlordId, DateTime? from, DateTime? to, CancellationToken ct = default);
        Task<Expense> CreateAsync(ExpenseDto dto, CancellationToken ct = default);
        Task DeleteAsync(int id, CancellationToken ct = default);
    }
}
