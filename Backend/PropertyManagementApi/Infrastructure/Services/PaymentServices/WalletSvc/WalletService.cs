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
        private const int AdministratorRoleId = 1;
        private const int LandlordRoleId = 2;
        private const int UtilityPaymentRoleId = 4;

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

        public async Task AdminDebitAsync(AdminWalletDebitDto debitDto)
        {
            if (debitDto.Amount <= 0)
                throw new Exception("Debit amount must be positive.");

            if (string.IsNullOrWhiteSpace(debitDto.Reason))
                throw new Exception("A reason is required for admin wallet debits.");

            var sourceWallet = await GetRequiredWalletForSupportedUserAsync(debitDto.SourceUserId);

            if (sourceWallet.Balance < debitDto.Amount)
                throw new Exception("Insufficient funds in wallet.");

            sourceWallet.Balance -= debitDto.Amount;

            var transaction = new WalletTransaction
            {
                WalletId = sourceWallet.Id,
                Amount = -debitDto.Amount,
                Description = $"Admin debit: {debitDto.Reason.Trim()}",
                TransactionDate = DateTime.UtcNow,
                Status = "SUCCESSFUL",
                TransactionId = Guid.NewGuid().ToString(),
                ReasonAtTelecom = debitDto.Reason.Trim(),
            };

            _context.WalletTransactions.Add(transaction);
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
            var wallet = await GetOrCreateWalletForSupportedUserAsync(landlordId, trackChanges: false);

            return new WalletBalanceDto
            {
                Balance = wallet.Balance
            };
        }

        public async Task<IEnumerable<WalletTransactionDto>> GetStatementAsync(int landlordId)
        {
            var wallet = await GetOrCreateWalletForSupportedUserAsync(landlordId, trackChanges: false);

            return await _context.WalletTransactions
                .AsNoTracking()
                .Where(t => t.WalletId == wallet.Id)
                .OrderByDescending(t => t.TransactionDate)
                .Select(t => new WalletTransactionDto
                {
                    Id = t.Id,
                    Amount = t.Amount,
                    Description = t.Description,
                    TransactionDate = t.TransactionDate,
                    TransactionId = t.TransactionId,
                    Status = t.Status
                })
                .ToListAsync();
        }

        public async Task<WalletTransactionsPage> GetWalletTransactionsAsync(string? search, int page, int pageSize, DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
        {
            if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || search?.Length > 128)
                throw new ArgumentException("Invalid search or pagination.");

            var query = _context.WalletTransactions.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var value = search.Trim();
                query = query.Where(t => t.Description.Contains(value) ||
                                         t.TransactionId.Contains(value) ||
                                         t.Status.Contains(value) ||
                                         t.Wallet.Landlord.FullName.Contains(value));
            }
            if (from.HasValue) query = query.Where(t => t.TransactionDate >= from.Value);
            if (to.HasValue) query = query.Where(t => t.TransactionDate < to.Value.Date.AddDays(1));

            var totalCount = await query.CountAsync(ct);
            var rows = await query.OrderByDescending(t => t.TransactionDate).Skip((page - 1) * pageSize).Take(pageSize + 1)
                .Select(t => new WalletTransactionAdminItem(t.Id, t.WalletId, t.Wallet.Landlord.FullName, t.Amount,
                    t.Description, t.TransactionId, t.Status, t.VendorTranId, t.TransactionDate))
                .ToListAsync(ct);
            return new(rows.Take(pageSize).ToList(), page, pageSize, rows.Count > pageSize, totalCount);
        }

        public async Task<Wallet> GetWalletByLandlordId(int landlordId)
        {
            var wallet = await _context.Wallets
               .FirstOrDefaultAsync(w => w.LandlordId == landlordId);
            return wallet;
        }

        public async Task TransferAsync(WalletTransferDto transferDto)
        {
            if (transferDto.Amount <= 0)
                throw new Exception("Transfer amount must be positive.");

            if (transferDto.SourceUserId == transferDto.TargetUserId)
                throw new Exception("Source and destination wallets must be different.");

            if (string.IsNullOrWhiteSpace(transferDto.Reason))
                throw new Exception("A reason is required for wallet transfers.");

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var sourceWallet = await GetRequiredWalletForSupportedUserAsync(transferDto.SourceUserId);
                var targetWallet = await GetOrCreateWalletForSupportedUserAsync(transferDto.TargetUserId, trackChanges: true);

                if (sourceWallet.Balance < transferDto.Amount)
                    throw new Exception("Insufficient funds in source wallet.");

                var sourceUser = await GetSupportedWalletOwnerAsync(transferDto.SourceUserId);
                var targetUser = await GetSupportedWalletOwnerAsync(transferDto.TargetUserId);

                sourceWallet.Balance -= transferDto.Amount;
                targetWallet.Balance += transferDto.Amount;

                var correlationId = Guid.NewGuid().ToString();
                var reason = transferDto.Reason.Trim();

                _context.WalletTransactions.Add(new WalletTransaction
                {
                    WalletId = sourceWallet.Id,
                    Amount = -transferDto.Amount,
                    Description = $"Admin transfer to {targetUser.FullName}: {reason}",
                    TransactionDate = DateTime.UtcNow,
                    Status = "SUCCESSFUL",
                    TransactionId = correlationId,
                    ReasonAtTelecom = reason,
                    VendorTranId = targetWallet.Id.ToString(),
                });

                _context.WalletTransactions.Add(new WalletTransaction
                {
                    WalletId = targetWallet.Id,
                    Amount = transferDto.Amount,
                    Description = $"Admin transfer from {sourceUser.FullName}: {reason}",
                    TransactionDate = DateTime.UtcNow,
                    Status = "SUCCESSFUL",
                    TransactionId = correlationId,
                    ReasonAtTelecom = reason,
                    VendorTranId = sourceWallet.Id.ToString(),
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task WithdrawForUserAsync(WithdrawDto withdrawDto, string requesterEmail)
        {
            var actor = await GetWithdrawalActorAsync(requesterEmail);
            if (actor.Id != withdrawDto.landlordid && actor.SystemRoleId != AdministratorRoleId)
                throw new UnauthorizedAccessException("You cannot withdraw from another user's wallet.");

            await WithdrawAsync(withdrawDto);
        }

        public async Task AdminWithdrawUtilityAsync(AdminUtilityWalletWithdrawalDto withdrawDto, string requesterEmail)
        {
            var actor = await GetWithdrawalActorAsync(requesterEmail);
            if (actor.SystemRoleId != AdministratorRoleId)
                throw new UnauthorizedAccessException("Only administrators can withdraw on behalf of a utility account.");

            if (withdrawDto.Amount <= 0 || withdrawDto.Amount > 9999999999999999.99m || decimal.Round(withdrawDto.Amount, 2) != withdrawDto.Amount)
                throw new ArgumentException("Withdrawal amount must be positive with at most two decimal places.");
            if (string.IsNullOrWhiteSpace(withdrawDto.Description) || withdrawDto.Description.Length > 500)
                throw new ArgumentException("A withdrawal reason of at most 500 characters is required.");

            var owner = await _context.Users.AsNoTracking()
                .SingleOrDefaultAsync(u => u.Id == withdrawDto.SourceUserId);
            if (owner == null || owner.SystemRoleId != UtilityPaymentRoleId)
                throw new ArgumentException("The selected account must be a utility payment user.");

            await WithdrawCoreAsync(new WithdrawDto
            {
                landlordid = owner.Id,
                amount = withdrawDto.Amount,
                description = withdrawDto.Description.Trim(),
            }, allowAutomaticRouting: false);
            _logger.LogInformation("Administrator {ActorUserId} requested wallet withdrawal for utility owner {OwnerUserId} of {Amount}",
                actor.Id, owner.Id, withdrawDto.Amount);
        }

        private async Task<User> GetWithdrawalActorAsync(string requesterEmail)
        {
            if (string.IsNullOrWhiteSpace(requesterEmail))
                throw new UnauthorizedAccessException("An authenticated wallet actor is required.");

            return await _context.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Email == requesterEmail)
                ?? throw new UnauthorizedAccessException("The authenticated wallet actor was not found.");
        }

        public Task WithdrawAsync(WithdrawDto withdrawDto) => WithdrawCoreAsync(withdrawDto, allowAutomaticRouting: true);

        private async Task WithdrawCoreAsync(WithdrawDto withdrawDto, bool allowAutomaticRouting)
        {
            if (withdrawDto.amount <= 0)
                throw new Exception("Withdrawal amount must be positive.");

            var wallet = await GetRequiredWalletForSupportedUserAsync(withdrawDto.landlordid);

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

            var finalStatus = status;

            if (allowAutomaticRouting && !string.IsNullOrWhiteSpace(withdrawDto.description) &&
                withdrawDto.description.Contains("Automatic", StringComparison.OrdinalIgnoreCase))
            {
                finalStatus = "PENDING_BANK_PAYOUT";
            }

            // Every payout sends the landlord's mobile number to the provider, and a bank payout also
            // needs a SWIFT/BIC. Checking here stops an un-submittable debit from leaving the wallet:
            // the worker can only reject it later, where the failure used to be invisible.
            EnsurePayoutProfileIsSubmittable(users!, finalStatus);

            // Allocate before changing the balance: allocation saves its own durable sequence.
            var transactionId = finalStatus is "PENDING" or "PENDING_BANK_PAYOUT"
                ? await DangoReferenceNumberAllocator.AllocateAsync(_context, "W", DateTime.UtcNow)
                : Guid.NewGuid().ToString();
            wallet.Balance -= withdrawDto.amount;

            // Record transaction
            var txn = new WalletTransaction
            {
                WalletId = wallet.Id,
                Amount = -withdrawDto.amount,
                Description = withdrawDto.description,
                TransactionDate = DateTime.UtcNow,
                Status = finalStatus,//status,
                TransactionId = transactionId,
            };
            _context.WalletTransactions.Add(txn);

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<WalletTransaction>> GetTransactionsByStatus(string status)
        {
            // Query projections to reduce data transfer; only include necessary fields
            return await _context.WalletTransactions
                .AsNoTracking()
                .Where(t => t.Status == status)
                .Include(t => t.Wallet)
                .ThenInclude(w => w.Landlord)
                .ToListAsync();
        }

        public async Task UpdateWalletTransaction(WalletTransaction walletTransaction)
        {
            var existingTransaction = await _context.WalletTransactions
                .FirstOrDefaultAsync(t => t.Id == walletTransaction.Id);
            if (existingTransaction == null)
                throw new Exception("Transaction not found.");
            await _context.WalletTransactions.Where(x => x.Id == existingTransaction.Id && x.Status != "REVERSED")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, walletTransaction.Status)
                    .SetProperty(x => x.Description, walletTransaction.Description)
                    .SetProperty(x => x.VendorTranId, walletTransaction.VendorTranId));
            await _context.Entry(existingTransaction).ReloadAsync();
        }

        /// <summary>
        /// Persists why a payout could not be submitted. The status is deliberately untouched: the
        /// worker keeps retrying until the profile or provider configuration is corrected.
        /// </summary>
        public async Task RecordPayoutBlockedAsync(int transactionId, string reason)
        {
            var text = string.IsNullOrWhiteSpace(reason)
                ? null
                : reason.Length > 256 ? reason[..256] : reason;
            await _context.WalletTransactions
                .Where(x => x.Id == transactionId && x.Status != "REVERSED")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReasonAtTelecom, text));
        }

        private static void EnsurePayoutProfileIsSubmittable(User landlord, string finalStatus)
        {
            if (finalStatus is not ("PENDING" or "PENDING_BANK_PAYOUT" or "PENDING_WALLET_PAYOUT"))
                return;

            // Only a bank payout needs a SWIFT/BIC; mobile and wallet-transfer payouts do not.
            var isWalletTransfer = string.Equals(landlord.BankName, "Wallet", StringComparison.OrdinalIgnoreCase);
            if (finalStatus == "PENDING_BANK_PAYOUT" && !isWalletTransfer)
            {
                // Dango/Collecto normalise the payout phone; an invalid value fails before any HTTP call.
                DangoPaymentClient.NormalizePhone(landlord.PhoneNumber);
                if (string.IsNullOrWhiteSpace(landlord.SwiftCode))
                {
                    throw new Exception(
                        "This landlord's bank account has no SWIFT/BIC code, so the bank payout cannot be submitted. " +
                        "Add the SWIFT code to the landlord's profile, then withdraw again.");
                }
            }
            else if (!string.IsNullOrWhiteSpace(landlord.PhoneNumber))
            {
                // A malformed phone would fail the same way later; catch it while nothing is debited.
                DangoPaymentClient.NormalizePhone(landlord.PhoneNumber);
            }
        }

        public Task ReverseWalletTransaction(WalletTransaction walletTransaction) => WalletPayoutReversal.ReverseAsync(_context, walletTransaction, matchById: true);

        public async Task<Wallet> GetWalletByUtilityMeterNumber(string utilityMeterNumber)
        {
            if (string.IsNullOrWhiteSpace(utilityMeterNumber))
                throw new ArgumentException("Utility meter number is required.", nameof(utilityMeterNumber));

            var utilityMeter = await _context.UtilityMeters
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MeterNumber == utilityMeterNumber);

            if (utilityMeter == null)
                throw new Exception($"Utility meter '{utilityMeterNumber}' was not found.");

            var wallet = await GetWalletByLandlordId(utilityMeter.LandLordId);
            if (wallet == null)
                throw new Exception($"Wallet not found for landlord linked to meter '{utilityMeterNumber}'.");

            return wallet;
        }

        private async Task<User> GetSupportedWalletOwnerAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.SystemRole)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                throw new Exception("User not found.");

            if (!IsSupportedWalletOwnerRole(user.SystemRoleId))
                throw new Exception("Wallet operations are only supported for landlords and utility payment users.");

            return user;
        }

        private async Task<Wallet> GetOrCreateWalletForSupportedUserAsync(int userId, bool trackChanges)
        {
            var user = await GetSupportedWalletOwnerAsync(userId);

            IQueryable<Wallet> walletQuery = _context.Wallets;
            if (!trackChanges)
            {
                walletQuery = walletQuery.AsNoTracking();
            }

            var wallet = await walletQuery.FirstOrDefaultAsync(w => w.LandlordId == user.Id);
            if (wallet != null)
            {
                return wallet;
            }

            if (!trackChanges)
            {
                wallet = await CreateWallet(user.Id, 0m);
                return wallet;
            }

            wallet = new Wallet
            {
                LandlordId = user.Id,
                Balance = 0m,
            };

            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();
            return wallet;
        }

        private async Task<Wallet> GetRequiredWalletForSupportedUserAsync(int userId)
        {
            var wallet = await GetOrCreateWalletForSupportedUserAsync(userId, trackChanges: true);
            if (wallet == null)
                throw new Exception("Wallet not found.");

            return wallet;
        }

        private static bool IsSupportedWalletOwnerRole(int systemRoleId)
        {
            return systemRoleId == LandlordRoleId || systemRoleId == UtilityPaymentRoleId;
        }
    }
}
