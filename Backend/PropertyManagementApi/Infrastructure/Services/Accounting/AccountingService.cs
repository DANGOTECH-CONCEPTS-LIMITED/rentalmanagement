using System;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Domain.Entities.Accounting;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Accounting
{
    public class AccountingService : IAccountingService
    {
        private readonly AppDbContext _db;
        public AccountingService(AppDbContext db) => _db = db;

        public async Task<int> PostAsync(JournalPostDto dto)
        {
            if (dto is null) throw new ArgumentNullException(nameof(dto));
            if (string.IsNullOrWhiteSpace(dto.CorrelationId)) throw new ArgumentException("CorrelationId required.", nameof(dto));
            if (dto.Lines is null || !dto.Lines.Any()) throw new ArgumentException("At least one line required.", nameof(dto));

            // Idempotency
            var existing = await _db.Set<JournalEntry>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CorrelationId == dto.CorrelationId);
            if (existing != null) return existing.Id;

            var dr = dto.Lines.Sum(l => l.Debit);
            var cr = dto.Lines.Sum(l => l.Credit);
            if (Math.Round(dr, 2) != Math.Round(cr, 2))
                throw new InvalidOperationException($"Debits ({dr}) != Credits ({cr}).");

            var codes = dto.Lines.Select(l => l.AccountCode).Distinct().ToList();
            var accounts = await _db.Set<Account>()
                .Where(a => codes.Contains(a.Code) && a.IsActive)
                .ToDictionaryAsync(a => a.Code);

            foreach (var code in codes)
                if (!accounts.ContainsKey(code))
                    throw new InvalidOperationException($"Account code {code} not found.");

            using var tx = await _db.Database.BeginTransactionAsync();

            var je = new JournalEntry
            {
                EntryDate = DateTime.UtcNow,
                Description = dto.Description,
                CorrelationId = dto.CorrelationId,
                SourceType = dto.SourceType,
                SourceId = dto.SourceId
            };

            foreach (var l in dto.Lines)
            {
                je.Lines.Add(new JournalLine
                {
                    AccountId = accounts[l.AccountCode].Id,
                    Debit = l.Debit,
                    Credit = l.Credit,
                    WalletId = l.WalletId,
                    LandlordId = l.LandlordId,
                    TenantId = l.TenantId,
                    Memo = l.Memo
                });
            }

            _db.Add(je);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return je.Id;
        }

        public async Task<decimal> GetWalletBalanceAsync(int walletId)
        {
            // Wallet balance is liability (normal credit). Balance = Credits - Debits on 2000 (Wallets Payable)
            const string walletsPayableCode = "2000";
            var query = from jl in _db.Set<JournalLine>()
                        join a in _db.Set<Account>() on jl.AccountId equals a.Id
                        where a.Code == walletsPayableCode && jl.WalletId == walletId
                        select new { jl.Debit, jl.Credit };

            var totals = await query.ToListAsync();
            var credit = totals.Sum(x => x.Credit);
            var debit = totals.Sum(x => x.Debit);
            return credit - debit;
        }
    }
}