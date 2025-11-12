using System.Threading.Tasks;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Accounting
{
    public record WalletDepositCharges(decimal PspFee, decimal SmsChargeToWallet, decimal CommissionToWallet);
    public record WalletWithdrawalCharges(decimal PspFeeExpense, decimal CompanyFeeToWallet);

    public interface IWalletChargePolicy
    {
        Task<WalletDepositCharges> GetDepositChargesAsync(WalletTransaction txn);
        Task<WalletWithdrawalCharges> GetWithdrawalChargesAsync(WalletTransaction txn);
    }
}