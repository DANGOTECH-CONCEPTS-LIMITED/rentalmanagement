using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces.Accounting
{
    public record JournalPostLineDto(string AccountCode, decimal Debit, decimal Credit, int? WalletId = null, int? LandlordId = null, int? TenantId = null, string? Memo = null);

    public record JournalPostDto(
        string CorrelationId,
        string SourceType,
        string SourceId,
        string Description,
        IEnumerable<JournalPostLineDto> Lines
    );

    public interface IAccountingService
    {
        Task<int> PostAsync(JournalPostDto entry);
        Task<decimal> GetWalletBalanceAsync(int walletId); // Credit-normal (liability) balance from ledger
    }
}