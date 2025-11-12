using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Accounting
{
    public class WalletAccountingNotifier
    {
        private readonly AppDbContext _db;
        private readonly IAccountingService _accounting;
        private readonly IWalletChargePolicy _charges; // used for deposits
        private readonly IConfiguration _cfg;          // used for withdrawal fee breakdown

        public WalletAccountingNotifier(
            AppDbContext db,
            IAccountingService accounting,
            IWalletChargePolicy charges,
            IConfiguration cfg)
        {
            _db = db;
            _accounting = accounting;
            _charges = charges;
            _cfg = cfg;
        }

        public sealed record Result(int Scanned, int Posted, int Skipped);

        public async Task<Result> NotifyAsync(DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
        {
            var start = from?.ToUniversalTime() ?? DateTime.MinValue;
            var end = to?.ToUniversalTime() ?? DateTime.MaxValue;

            var txns = await _db.WalletTransactions
                .AsNoTracking()
                .Include(t => t.Wallet)
                    .ThenInclude(w => w.Landlord)
                .Where(t => t.TransactionDate >= start && t.TransactionDate <= end)
                .OrderBy(t => t.TransactionDate)
                .ToListAsync(ct);

            var scanned = 0;
            var posted = 0;
            var skipped = 0;

            foreach (var t in txns)
            {
                scanned++;
                if (string.Equals(t.Status, "REVERSAL", StringComparison.OrdinalIgnoreCase))
                {
                    skipped++;
                    continue;
                }

                try
                {
                    if (t.Amount > 0) // Deposit/credit to wallet (from utility)
                    {
                        var ch = await _charges.GetDepositChargesAsync(t);
                        await _accounting.PostAsync(
                            PostingRules.WalletCreditWithCharges(
                                correlationId: $"WALLET_DEP:{t.TransactionId}",
                                transactionId: t.TransactionId,
                                grossAmount: t.Amount,
                                mobileMoneyFee: ch.PspFee,
                                smsChargeToWallet: ch.SmsChargeToWallet,
                                commissionToWallet: ch.CommissionToWallet,
                                walletId: t.WalletId,
                                landlordId: t.Wallet.LandlordId,
                                memo: t.Description));
                        posted++;
                        continue;
                    }

                    // Withdrawal flow (negative)
                    var status = t.Status?.Trim().ToUpperInvariant() ?? string.Empty;
                    var isPending = status == "PENDING" || status == "PENDING AT TELECOM" || status == "PENDING AT TELCOM";
                    var isSuccessful = status == "SUCCESSFUL" || status == "SUCCESSFUL AT TELECOM";
                    var isFailed = status == "FAILED" || status == "FAILED AT TELECOM";
                    var isReversed = status == "REVERSED";

                    // Initiation (principal only)
                    if (!isReversed)
                    {
                        await _accounting.PostAsync(
                            PostingRules.WithdrawalInitiated(
                                correlationId: $"WALLET_WD_INIT:{t.TransactionId}",
                                transactionId: t.TransactionId,
                                amount: Math.Abs(t.Amount),
                                walletId: t.WalletId,
                                landlordId: t.Wallet.LandlordId,
                                memo: t.Description));
                        posted++;
                    }

                    if (isSuccessful)
                    {
                        // Compute charge + individual fees from config (defaults shown)
                        var section = _cfg.GetSection("Accounting:Fees:Withdrawal");

                        var chargePct = section.GetValue<decimal?>("ChargePercent") ?? 10m;      // 10%
                        var pspPct    = section.GetValue<decimal?>("PspFeePercent") ?? 2.55m;   // 2.55%
                        var smsFee    = section.GetValue<decimal?>("SmsFeeFlat") ?? 35m;        // 35
                        var ussdFee   = section.GetValue<decimal?>("UssdFeeFlat") ?? 10m;       // 10

                        var amt = Math.Abs(t.Amount);
                        var charge = Math.Round(amt * chargePct / 100m, 2);
                        var psp    = Math.Round(amt * pspPct    / 100m, 2);

                        await _accounting.PostAsync(
                            PostingRules.WithdrawalSettledWithAllCharges(
                                correlationId: $"WALLET_WD_SETTLED:{t.TransactionId}",
                                transactionId: t.TransactionId,
                                amount: amt,
                                charge: charge,
                                pspFee: psp,
                                smsFee: smsFee,
                                ussdFee: ussdFee,
                                walletId: t.WalletId,
                                landlordId: t.Wallet.LandlordId,
                                memo: t.Description));
                        posted++;
                    }
                    else if (isFailed || isReversed)
                    {
                        await _accounting.PostAsync(
                            PostingRules.WithdrawalInitiationReversed(
                                correlationId: $"WALLET_WD_INIT_REV:{t.TransactionId}",
                                transactionId: t.TransactionId,
                                amount: Math.Abs(t.Amount),
                                walletId: t.WalletId,
                                landlordId: t.Wallet.LandlordId,
                                reason: t.ReasonAtTelecom ?? "Telecom failure"));
                        posted++;
                    }
                    else if (isPending)
                    {
                        // do nothing; initiation recorded above
                    }
                    else
                    {
                        skipped++;
                    }
                }
                catch
                {
                    skipped++;
                }
            }

            return new Result(scanned, posted, skipped);
        }
    }
}