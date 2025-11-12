using System.Collections.Generic;
using Application.Interfaces.Accounting;

namespace Infrastructure.Services.Accounting
{
    public static class PostingRules
    {
        // Account codes used:
        // 1000 Cash, 2000 Wallets Payable, 2100 Withdrawals Payable (Clearing)
        // 4100 Commission Income, 4200 SMS Fee Income, 4300 Withdrawal Fee Income, 5100 PSP Fees Expense

        // Basic wallet deposit (no explicit charges)
        public static JournalPostDto WalletDeposit(
            string correlationId,
            string transactionId,
            decimal amount,
            int walletId,
            int landlordId,
            string memo)
        {
            return new JournalPostDto(
                correlationId,
                "WALLET_DEPOSIT",
                transactionId,
                $"Wallet deposit {transactionId}",
                new[]
                {
                    new JournalPostLineDto("1000", amount, 0, WalletId: walletId, LandlordId: landlordId, Memo: memo), // Dr Cash
                    new JournalPostLineDto("2000", 0, amount, WalletId: walletId, LandlordId: landlordId, Memo: memo), // Cr Wallets Payable
                });
        }

        // Deposit with explicit charges (PSP fee expense; SMS/commission charged to wallet as income)
        public static JournalPostDto WalletCreditWithCharges(
            string correlationId,
            string transactionId,
            decimal grossAmount,
            decimal mobileMoneyFee,
            decimal smsChargeToWallet,
            decimal commissionToWallet,
            int walletId,
            int landlordId,
            string memo)
        {
            var netCash = grossAmount - mobileMoneyFee;
            var lines = new List<JournalPostLineDto>
            {
                new("1000", netCash, 0, WalletId: walletId, LandlordId: landlordId, Memo: memo),                 // Dr Cash (net)
                new("5100", mobileMoneyFee, 0, WalletId: walletId, LandlordId: landlordId, Memo: "PSP fee"),     // Dr PSP fee expense
                new("2000", 0, grossAmount, WalletId: walletId, LandlordId: landlordId, Memo: "Gross credit"),   // Cr Wallets Payable (gross)
            };

            if (commissionToWallet > 0)
            {
                lines.Add(new JournalPostLineDto("2000", commissionToWallet, 0, WalletId: walletId, LandlordId: landlordId, Memo: "Commission charged"));
                lines.Add(new JournalPostLineDto("4100", 0, commissionToWallet, WalletId: walletId, LandlordId: landlordId, Memo: "Commission income"));
            }

            if (smsChargeToWallet > 0)
            {
                lines.Add(new JournalPostLineDto("2000", smsChargeToWallet, 0, WalletId: walletId, LandlordId: landlordId, Memo: "SMS charged"));
                lines.Add(new JournalPostLineDto("4200", 0, smsChargeToWallet, WalletId: walletId, LandlordId: landlordId, Memo: "SMS fee income"));
            }

            return new JournalPostDto(
                correlationId,
                "WALLET_CREDIT",
                transactionId,
                $"Wallet credit {transactionId} (gross {grossAmount})",
                lines);
        }

        // Withdrawal initiated: move liability to clearing
        public static JournalPostDto WithdrawalInitiated(
            string correlationId,
            string transactionId,
            decimal amount,
            int walletId,
            int landlordId,
            string memo)
        {
            return new JournalPostDto(
                correlationId,
                "WALLET_WITHDRAW_INIT",
                transactionId,
                $"Wallet withdrawal initiated {transactionId}",
                new[]
                {
                    new JournalPostLineDto("2000", amount, 0, WalletId: walletId, LandlordId: landlordId, Memo: memo), // Dr Wallets Payable
                    new JournalPostLineDto("2100", 0, amount, WalletId: walletId, LandlordId: landlordId, Memo: memo), // Cr Withdrawals Payable (clearing)
                });
        }

        // Withdrawal settled (simple): wrapper to detailed, pass PSP fee as 'fee'
        public static JournalPostDto WithdrawalSettled(
            string correlationId,
            string transactionId,
            decimal amount,
            int walletId,
            int landlordId,
            string memo,
            decimal fee = 0m)
        {
            return WithdrawalSettledDetailed(
                correlationId,
                transactionId,
                amount,
                walletId,
                landlordId,
                memo,
                pspFeeExpense: fee,
                companyFeeToWallet: 0m);
        }

        // Withdrawal settled (detailed): includes PSP fee expense and optional company fee charged to wallet
        public static JournalPostDto WithdrawalSettledDetailed(
            string correlationId,
            string transactionId,
            decimal amount,
            int walletId,
            int landlordId,
            string memo,
            decimal pspFeeExpense = 0m,
            decimal companyFeeToWallet = 0m)
        {
            var lines = new List<JournalPostLineDto>
            {
                new("2100", amount, 0, WalletId: walletId, LandlordId: landlordId, Memo: "Clear withdrawal payable"),  // Dr Withdrawals Payable
                new("1000", 0, amount + pspFeeExpense, WalletId: walletId, LandlordId: landlordId, Memo: memo),        // Cr Cash (amount + PSP fee)
            };

            if (pspFeeExpense > 0)
                lines.Add(new JournalPostLineDto("5100", pspFeeExpense, 0, WalletId: walletId, LandlordId: landlordId, Memo: "PSP withdrawal fee")); // Dr PSP fee

            if (companyFeeToWallet > 0)
            {
                lines.Add(new JournalPostLineDto("2000", companyFeeToWallet, 0, WalletId: walletId, LandlordId: landlordId, Memo: "Withdrawal fee charged")); // Dr Wallets Payable
                lines.Add(new JournalPostLineDto("4300", 0, companyFeeToWallet, WalletId: walletId, LandlordId: landlordId, Memo: "Withdrawal fee income"));   // Cr Income
            }

            return new JournalPostDto(
                correlationId,
                "WALLET_WITHDRAW_SETTLED",
                transactionId,
                $"Wallet withdrawal settled {transactionId}",
                lines);
        }

        // Reversal of withdrawal initiation
        public static JournalPostDto WithdrawalInitiationReversed(
            string correlationId,
            string transactionId,
            decimal amount,
            int walletId,
            int landlordId,
            string reason)
        {
            return new JournalPostDto(
                correlationId,
                "WALLET_WITHDRAW_INIT_REVERSAL",
                transactionId,
                $"Withdrawal initiation reversed {transactionId}: {reason}",
                new[]
                {
                    new JournalPostLineDto("2100", amount, 0, WalletId: walletId, LandlordId: landlordId, Memo: reason), // Dr Withdrawals Payable
                    new JournalPostLineDto("2000", 0, amount, WalletId: walletId, LandlordId: landlordId, Memo: reason), // Cr Wallets Payable
                });
        }

        // Withdrawal settled with all charges:
        // - amount: the principal withdrawal amount
        // - charge: what the customer pays on top (normally 10% of amount)
        // - pspFee: % of amount (e.g., 2.55%)
        // - smsFee: flat e.g., 35
        // - ussdFee: flat e.g., 10
        //
        // Entry (balanced):
        // Dr 2100 Withdrawals Payable                  amount
        // Dr 5100 PSP Fees Expense                     pspFee
        // Dr 5200 SMS Expense                          smsFee
        // Dr 5300 USSD Processing Expense              ussdFee
        // Dr 2000 Wallets Payable                      charge
        // Cr 1000 Cash                                 amount + pspFee + smsFee + ussdFee
        // Cr 4300 Withdrawal Fee Income                charge
        public static JournalPostDto WithdrawalSettledWithAllCharges(
            string correlationId,
            string transactionId,
            decimal amount,
            decimal charge,
            decimal pspFee,
            decimal smsFee,
            decimal ussdFee,
            int walletId,
            int landlordId,
            string memo)
        {
            var cashOut = amount + pspFee + smsFee + ussdFee;

            var lines = new List<JournalPostLineDto>
            {
                new("2100", amount, 0, WalletId: walletId, LandlordId: landlordId, Memo: "Clear withdrawal payable"),
                new("5100", pspFee, 0, WalletId: walletId, LandlordId: landlordId, Memo: "PSP withdrawal fee"),
                new("5200", smsFee, 0, WalletId: walletId, LandlordId: landlordId, Memo: "SMS fee"),
                new("5300", ussdFee, 0, WalletId: walletId, LandlordId: landlordId, Memo: "USSD processing fee"),
                new("2000", charge, 0, WalletId: walletId, LandlordId: landlordId, Memo: "Withdrawal charge deducted"),
                new("1000", 0, cashOut, WalletId: walletId, LandlordId: landlordId, Memo: memo),
                new("4300", 0, charge, WalletId: walletId, LandlordId: landlordId, Memo: "Withdrawal fee income")
            };

            return new JournalPostDto(
                correlationId,
                "WALLET_WITHDRAW_SETTLED",
                transactionId,
                $"Wallet withdrawal settled {transactionId}",
                lines
            );
        }
    }
}