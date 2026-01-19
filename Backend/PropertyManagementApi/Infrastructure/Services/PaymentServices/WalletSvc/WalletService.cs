using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Payments.WalletDto;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        private readonly ILogger<WalletService> _logger; // Add logger

        public WalletService(AppDbContext context, ILogger<WalletService> logger)
        {
            _context = context;
            _logger = logger;
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

            // check landlord email
            var users = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == withdrawDto.landlordid);
            var status = "PENDING";
            if (users != null) 
            {
                if (users.Email == null || !users.Email.Contains("@"))
                    throw new Exception("Invalid landlord email address.");

                // check if email is dangotechconceptslimited@gmail.com

                if (users.Email.ToLower() == "dangotechconceptslimited@gmail.com")
                {
                    status = "SUCCESSFUL";
                }

                // check if user is has bank account linked
                if (!string.IsNullOrWhiteSpace(users.BankAccountNumber) &&
                    !string.IsNullOrWhiteSpace(users.BankName))
                {
                    status = "PENDING_BANK_PAYOUT";
                }

                if (!string.IsNullOrEmpty(users.BankName) && users.BankName.Equals("Wallet"))
                {
                    status = "PENDING_WALLET_PAYOUT";
                }

            }

            if (wallet == null)
                throw new Exception("Wallet not found for this landlord.");

            if (wallet.Balance < withdrawDto.amount)
                throw new Exception("Insufficient funds in wallet.");

            // Deduct balance
            wallet.Balance -= withdrawDto.amount;

            var finalStatus = status;

            if (!string.IsNullOrWhiteSpace(withdrawDto.description) &&
                withdrawDto.description.Contains("Automatic", StringComparison.OrdinalIgnoreCase))
            {
                finalStatus = "PENDING_BANK_PAYOUT";
            }

            // Record transaction
            var txn = new WalletTransaction
            {
                WalletId = wallet.Id,
                Amount = -withdrawDto.amount,
                Description = withdrawDto.description,
                TransactionDate = DateTime.UtcNow,
                Status = finalStatus,//status,
                TransactionId = Guid.NewGuid().ToString(),
            };
            _context.WalletTransactions.Add(txn);

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<WalletTransaction>> GetTransactionsByStatus(string status)
        {
            var transactions = await _context.WalletTransactions
                .Include(x => x.Wallet)
                .ThenInclude(x => x.Landlord)
                .AsNoTracking()
                .Where(t => t.Status == status)
                .ToListAsync();
            return transactions;
        }

        public async Task UpdateWalletTransaction(WalletTransaction walletTransaction)
        {
            var existingTransaction = await _context.WalletTransactions
                .FirstOrDefaultAsync(t => t.Id == walletTransaction.Id);
            if (existingTransaction == null)
                throw new Exception("Transaction not found.");
            existingTransaction.Status = walletTransaction.Status;
            existingTransaction.Description = walletTransaction.Description;
            existingTransaction.VendorTranId = walletTransaction.VendorTranId;
            await _context.SaveChangesAsync();
        }

        public async Task ReverseWalletTransaction(WalletTransaction walletTransaction)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var existingTransaction = await _context.WalletTransactions
                    .FirstOrDefaultAsync(t => t.Id == walletTransaction.Id);
                if (existingTransaction == null)
                    throw new Exception("Transaction not found.");
                if (existingTransaction.Status == "REVERSED")
                    throw new InvalidOperationException("Transaction already reversed.");

                existingTransaction.Status = "REVERSED";

                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.Id == existingTransaction.WalletId);
                if (wallet == null)
                    throw new Exception("Wallet not found.");

                var reversalAmount = Math.Abs(existingTransaction.Amount); // Ensure positive
                var reverseTransaction = new WalletTransaction
                {
                    WalletId = wallet.Id,
                    Amount = reversalAmount,
                    Description = $"Reversal of {existingTransaction.TransactionId}: {existingTransaction.Description}",
                    TransactionDate = DateTime.UtcNow,
                    Status = "REVERSAL", // Distinct status
                    TransactionId = Guid.NewGuid().ToString(),
                    VendorTranId = existingTransaction.TransactionId // Link to original
                };

                _context.WalletTransactions.Add(reverseTransaction);
                wallet.Balance += reversalAmount; // Update balance

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                _logger.LogInformation($"Reversed transaction {existingTransaction.TransactionId}, added {reversalAmount} to wallet {wallet.Id}");
            }
            catch (Exception ex)
            {
                await dbTransaction.RollbackAsync();
                _logger.LogError(ex, $"Failed to reverse transaction {walletTransaction.Id}");
                throw;
            }
        }

        public async Task<Wallet> GetWalletByUtilityMeterNumber(string utilityMeterNumber)
        {
            var getlandlordIdByUtilityMeterNumber = await _context.UtilityMeters
                .FirstOrDefaultAsync(x => x.MeterNumber == utilityMeterNumber);

            return await GetWalletByLandlordId(getlandlordIdByUtilityMeterNumber.LandLordId);
        }
    }
}
