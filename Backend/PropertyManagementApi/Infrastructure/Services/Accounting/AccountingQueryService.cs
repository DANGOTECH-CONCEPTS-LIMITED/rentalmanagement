using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Domain.Enums.Accounting;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Accounting
{
    public class AccountingQueryService : IAccountingQueryService
    {
        private readonly AppDbContext _db;
        public AccountingQueryService(AppDbContext db) => _db = db;

        private static bool IsDebitNormal(AccountType t) =>
            t == AccountType.Asset || t == AccountType.Expense;

        private static decimal PeriodNet(AccountType t, decimal debit, decimal credit) =>
            IsDebitNormal(t) ? (debit - credit) : (credit - debit);

        private static decimal SignedBalance(AccountType t, decimal debits, decimal credits) =>
            IsDebitNormal(t) ? (debits - credits) : (credits - debits);

        public async Task<AccountStatementDto> GetAccountStatementAsync(AccountStatementQuery query)
        {
            if (string.IsNullOrWhiteSpace(query.AccountCode))
                throw new ArgumentException("AccountCode is required.", nameof(query));

            var account = await _db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Code == query.AccountCode)
                ?? throw new InvalidOperationException($"Account '{query.AccountCode}' not found.");

            var fromDate = query.From?.ToUniversalTime() ?? DateTime.MinValue;
            var toDate = query.To?.ToUniversalTime() ?? DateTime.MaxValue;

            // Opening balance = sum before 'fromDate'
            var openingAgg = await (from jl in _db.JournalLines
                                    join je in _db.JournalEntries on jl.JournalEntryId equals je.Id
                                    where jl.AccountId == account.Id && je.EntryDate < fromDate
                                    select new { jl.Debit, jl.Credit })
                                   .ToListAsync();

            var openingDeb = openingAgg.Sum(x => x.Debit);
            var openingCr = openingAgg.Sum(x => x.Credit);
            var openingBal = SignedBalance(account.Type, openingDeb, openingCr);

            // Lines within [fromDate, toDate]
            var lines = await (from jl in _db.JournalLines
                               join je in _db.JournalEntries on jl.JournalEntryId equals je.Id
                               where jl.AccountId == account.Id
                                     && je.EntryDate >= fromDate && je.EntryDate <= toDate
                               orderby je.EntryDate, je.Id, jl.Id
                               select new
                               {
                                   je.EntryDate,
                                   je.Description,
                                   jl.Debit,
                                   jl.Credit
                               }).ToListAsync();

            var resultLines = new List<AccountStatementLineDto>(lines.Count);
            var running = openingBal;

            foreach (var l in lines)
            {
                // Running per normal side
                running += IsDebitNormal(account.Type) ? (l.Debit - l.Credit) : (l.Credit - l.Debit);
                resultLines.Add(new AccountStatementLineDto(
                    l.EntryDate, l.Description, l.Debit, l.Credit, running));
            }

            var closing = running;

            return new AccountStatementDto(
                account.Code,
                account.Name,
                fromDate,
                toDate,
                openingBal,
                resultLines,
                closing
            );
        }

        public async Task<TrialBalanceDto> GetTrialBalanceAsync(DateTime? from, DateTime? to)
        {
            var fromDate = from?.ToUniversalTime() ?? DateTime.MinValue;
            var toDate = to?.ToUniversalTime() ?? DateTime.MaxValue;

            var data = await (from jl in _db.JournalLines
                              join je in _db.JournalEntries on jl.JournalEntryId equals je.Id
                              join a in _db.Accounts on jl.AccountId equals a.Id
                              where je.EntryDate >= fromDate && je.EntryDate <= toDate
                              group new { jl, a } by new { a.Id, a.Code, a.Name, a.Type } into g
                              select new
                              {
                                  g.Key.Id,
                                  g.Key.Code,
                                  g.Key.Name,
                                  g.Key.Type,
                                  Debit = g.Sum(x => x.jl.Debit),
                                  Credit = g.Sum(x => x.jl.Credit)
                              }).OrderBy(x => x.Code).ToListAsync();

            var rows = new List<TrialBalanceRowDto>(data.Count);
            decimal totalDr = 0, totalCr = 0;

            foreach (var r in data)
            {
                // Net per account for trial balance: show on one side
                var net = r.Debit - r.Credit;
                decimal dr = 0, cr = 0;

                if (net >= 0)
                    dr = net;
                else
                    cr = Math.Abs(net);

                rows.Add(new TrialBalanceRowDto(r.Code, r.Name, dr, cr));
                totalDr += dr;
                totalCr += cr;
            }

            return new TrialBalanceDto(fromDate, toDate, rows, totalDr, totalCr);
        }

        public async Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime? asOf)
        {
            var cutoff = asOf?.ToUniversalTime() ?? DateTime.MaxValue;

            var agg = await (from jl in _db.JournalLines
                             join je in _db.JournalEntries on jl.JournalEntryId equals je.Id
                             join a in _db.Accounts on jl.AccountId equals a.Id
                             where je.EntryDate <= cutoff
                             group new { jl, a } by new { a.Id, a.Code, a.Name, a.Type } into g
                             select new
                             {
                                 g.Key.Code,
                                 g.Key.Name,
                                 g.Key.Type,
                                 Debit = g.Sum(x => x.jl.Debit),
                                 Credit = g.Sum(x => x.jl.Credit)
                             }).ToListAsync();

            var assets = new List<BalanceSheetSectionRowDto>();
            var liabilities = new List<BalanceSheetSectionRowDto>();
            var equity = new List<BalanceSheetSectionRowDto>();
            decimal totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

            foreach (var r in agg)
            {
                var bal = SignedBalance(r.Type, r.Debit, r.Credit);

                switch (r.Type)
                {
                    case AccountType.Asset:
                        assets.Add(new BalanceSheetSectionRowDto(r.Code, r.Name, bal));
                        totalAssets += bal;
                        break;
                    case AccountType.Liability:
                        liabilities.Add(new BalanceSheetSectionRowDto(r.Code, r.Name, bal));
                        totalLiabilities += bal;
                        break;
                    case AccountType.Equity:
                        equity.Add(new BalanceSheetSectionRowDto(r.Code, r.Name, bal));
                        totalEquity += bal;
                        break;
                    default:
                        // Ignore income/expense here; if you want retained earnings:
                        // include P&L closing to equity, or add an extra step to compute retained earnings.
                        break;
                }
            }

            return new BalanceSheetDto(cutoff, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity);
        }

        public async Task<ProfitSummaryDto> GetProfitAsync(DateTime? from, DateTime? to)
        {
            var fromDate = (from?.Date ?? DateTime.MinValue.Date);
            var toDate = (to?.Date ?? DateTime.MaxValue.Date);

            var data = await (from jl in _db.JournalLines
                              join je in _db.JournalEntries on jl.JournalEntryId equals je.Id
                              join a in _db.Accounts on jl.AccountId equals a.Id
                              where je.EntryDate >= fromDate && je.EntryDate <= toDate
                                    && (a.Type == AccountType.Income || a.Type == AccountType.Expense)
                              group new { jl, a } by new { a.Code, a.Name, a.Type } into g
                              select new
                              {
                                  g.Key.Code,
                                  g.Key.Name,
                                  g.Key.Type,
                                  Debit = g.Sum(x => x.jl.Debit),
                                  Credit = g.Sum(x => x.jl.Credit)
                              })
                              .OrderBy(x => x.Code)
                              .ToListAsync();

            var breakdown = new List<ProfitBreakdownRowDto>(data.Count);
            decimal totalIncome = 0m, totalExpense = 0m;

            foreach (var r in data)
            {
                var net = PeriodNet(r.Type, r.Debit, r.Credit); // Income: Cr-Dr; Expense: Dr-Cr
                breakdown.Add(new ProfitBreakdownRowDto(r.Code, r.Name, r.Type.ToString(), r.Debit, r.Credit, net));

                if (r.Type == AccountType.Income) totalIncome += net;
                else if (r.Type == AccountType.Expense) totalExpense += net;
            }

            var netProfit = totalIncome - totalExpense;

            return new ProfitSummaryDto(fromDate, toDate, totalIncome, totalExpense, netProfit, breakdown);
        }
    }
}