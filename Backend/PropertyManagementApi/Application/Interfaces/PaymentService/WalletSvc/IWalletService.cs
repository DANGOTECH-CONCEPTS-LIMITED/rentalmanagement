using Domain.Dtos.Payments.WalletDto;
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
    }
}
