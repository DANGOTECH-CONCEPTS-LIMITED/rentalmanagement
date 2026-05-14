using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Dtos.Property.Expense;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Property
{
    public interface IExpenseService
    {
        Task<PropertyExpense> CreateExpenseAsync(CreateExpenseDto dto);
        Task<PropertyExpense> UpdateExpenseAsync(int expenseId, UpdateExpenseDto dto);
        Task DeleteExpenseAsync(int expenseId);
        Task<PropertyExpense> GetExpenseByIdAsync(int expenseId);

        Task<IEnumerable<PropertyExpense>> GetExpensesAsync(ExpenseQueryDto query);
    }
}
