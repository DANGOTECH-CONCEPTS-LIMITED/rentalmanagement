using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Payments.WalletDto;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.PaymentServices.WalletSvc
{
    public class WalletService : IWalletService
    {
        private readonly AppDbContext _context;

        public WalletService(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddWalletTransaction(WalletTransaction walletTransaction)
        {
            await _context.WalletTransactions.AddAsync(walletTransaction);
            //update wallet balance
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.Id == walletTransaction.WalletId);
            if (wallet == null)
                throw new Exception("Wallet not found.");
            wallet.Balance += walletTransaction.Amount;

            await _context.SaveChangesAsync();
        }

        public async Task<Wallet> CreateWallet(int landlordid, decimal bal)
        {
            var wallet = new Wallet
            {
                LandlordId = landlordid,
                Balance = bal
            };
            _context.Wallets.Add(wallet);
           await _context.SaveChangesAsync();
            return wallet;
        }

        public async Task<WalletBalanceDto> GetBalanceAsync(int landlordId)
        {
            var wallet = await _context.Wallets
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.LandlordId == landlordId);

            if (wallet == null)
                throw new Exception("Wallet not found for this landlord.");

            return new WalletBalanceDto
            {
                Balance = wallet.Balance
            };
        }

        public async Task<IEnumerable<WalletTransactionDto>> GetStatementAsync(int landlordId)
        {
            var wallet = await _context.Wallets
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.LandlordId == landlordId);

            if (wallet == null)
                throw new Exception("Wallet not found for this landlord.");

            return await _context.WalletTransactions
                .AsNoTracking()
                .Where(t => t.WalletId == wallet.Id)
                .OrderByDescending(t => t.TransactionDate)
                .Select(t => new WalletTransactionDto
                {
                    Amount = t.Amount,
                    Description = t.Description,
                    TransactionDate = t.TransactionDate
                })
                .ToListAsync();
        }

        public async Task<Wallet> GetWalletByLandlordId(int landlordId)
        {
            var wallet = await _context.Wallets
               .FirstOrDefaultAsync(w => w.LandlordId == landlordId);
            return wallet;
        }

        public async Task WithdrawAsync(WithdrawDto withdrawDto)
        {
            if (withdrawDto.amount <= 0)
                throw new Exception("Withdrawal amount must be positive.");

            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.LandlordId == withdrawDto.landlordid);

            if (wallet == null)
                throw new Exception("Wallet not found for this landlord.");

            if (wallet.Balance < withdrawDto.amount)
                throw new Exception("Insufficient funds in wallet.");

            // Deduct balance
            wallet.Balance -= withdrawDto.amount;

            // Record transaction
            var txn = new WalletTransaction
            {
                WalletId = wallet.Id,
                Amount = -withdrawDto.amount,
                Description = withdrawDto.description,
                TransactionDate = DateTime.UtcNow,
                Status = "PENDING",
            };
            _context.WalletTransactions.Add(txn);

            await _context.SaveChangesAsync();
        }
    }
}
