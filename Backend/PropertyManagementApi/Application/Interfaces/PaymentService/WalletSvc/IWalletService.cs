using Domain.Dtos.Payments.WalletDto;
using Domain.Entities.PropertyMgt;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.PaymentService.WalletSvc
{
    public interface IWalletService
    {
        Task<WalletBalanceDto> GetBalanceAsync(int landlordId);
        Task<IEnumerable<WalletTransactionDto>> GetStatementAsync(int landlordId);
        Task WithdrawAsync(WithdrawDto withdrawDto);

        Task AddWalletTransaction(WalletTransaction walletTransaction);

        Task<Wallet> GetWalletByLandlordId(int landlordId);
        Task<Wallet> CreateWallet(int landlordid, decimal bal);
        Task<IEnumerable<WalletTransaction>> GetTransactionsByStatus(string status);

        Task UpdateWalletTransaction(WalletTransaction walletTransaction);

        Task ReverseWalletTransaction(WalletTransaction walletTransaction);
    }
}
