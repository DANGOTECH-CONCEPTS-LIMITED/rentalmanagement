using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Collecto
{
    public interface ICollectoWalletWithdrawalHistoryService
    {
        Task<CollectoWalletWithdrawalHistory> CreateAsync(CollectoWalletWithdrawalHistory history);
        Task<IEnumerable<CollectoWalletWithdrawalHistory>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
    }
}