using System;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Domain.Entities.PropertyMgt;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Accounting
{
    // Simple config-based policy. Replace with per-wallet rules if needed.
    public class ConfigWalletChargePolicy : IWalletChargePolicy
    {
        private readonly IConfiguration _cfg;
        public ConfigWalletChargePolicy(IConfiguration cfg) => _cfg = cfg;

        public Task<WalletDepositCharges> GetDepositChargesAsync(WalletTransaction txn)
        {
            var section = _cfg.GetSection("Accounting:Fees:Deposit");
            var pspPct = section.GetValue<decimal?>("PspFeePercent") ?? 0m;
            var smsFlat = section.GetValue<decimal?>("SmsFeeFlat") ?? 0m;
            var commissionPct = section.GetValue<decimal?>("CommissionPercent") ?? 0m;

            var amount = Math.Abs(txn.Amount);
            var psp = Math.Round(amount * pspPct / 100m, 2);
            var commission = Math.Round(amount * commissionPct / 100m, 2);

            return Task.FromResult(new WalletDepositCharges(psp, smsFlat, commission));
        }

        public Task<WalletWithdrawalCharges> GetWithdrawalChargesAsync(WalletTransaction txn)
        {
            var section = _cfg.GetSection("Accounting:Fees:Withdrawal");
            var pspPct = section.GetValue<decimal?>("PspFeePercent") ?? 0m;
            var companyPct = section.GetValue<decimal?>("CompanyFeePercent") ?? 0m;

            var amount = Math.Abs(txn.Amount);
            var psp = Math.Round(amount * pspPct / 100m, 2);
            var company = Math.Round(amount * companyPct / 100m, 2);

            return Task.FromResult(new WalletWithdrawalCharges(psp, company));
        }
    }
}