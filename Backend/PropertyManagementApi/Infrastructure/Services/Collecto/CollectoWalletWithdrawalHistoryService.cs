using Application.Interfaces.Collecto;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Collecto
{
    public class CollectoWalletWithdrawalHistoryService : ICollectoWalletWithdrawalHistoryService
    {
        private readonly AppDbContext _context;

        public CollectoWalletWithdrawalHistoryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CollectoWalletWithdrawalHistory> CreateAsync(CollectoWalletWithdrawalHistory history)
        {
            await _context.CollectoWalletWithdrawalHistories.AddAsync(history);
            await _context.SaveChangesAsync();
            return history;
        }

        public async Task<IEnumerable<CollectoWalletWithdrawalHistory>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            return await _context.CollectoWalletWithdrawalHistories
                .AsNoTracking()
                .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }
    }
}