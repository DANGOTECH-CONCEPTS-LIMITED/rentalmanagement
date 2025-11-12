using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces.Accounting
{
    public record AccountStatementQuery(
        string AccountCode,
        DateTime? From = null,
        DateTime? To = null
    );

    public record AccountStatementLineDto(
        DateTime Date,
        string Description,
        decimal Debit,
        decimal Credit,
        decimal RunningBalance
    );

    public record AccountStatementDto(
        string AccountCode,
        string AccountName,
        DateTime From,
        DateTime To,
        decimal OpeningBalance,
        IReadOnlyList<AccountStatementLineDto> Lines,
        decimal ClosingBalance
    );

    public record TrialBalanceRowDto(string AccountCode, string AccountName, decimal Debit, decimal Credit);
    public record TrialBalanceDto(DateTime From, DateTime To, IReadOnlyList<TrialBalanceRowDto> Rows, decimal TotalDebit, decimal TotalCredit);

    public record BalanceSheetSectionRowDto(string AccountCode, string AccountName, decimal Balance);
    public record BalanceSheetDto(
        DateTime AsOf,
        IReadOnlyList<BalanceSheetSectionRowDto> Assets,
        IReadOnlyList<BalanceSheetSectionRowDto> Liabilities,
        IReadOnlyList<BalanceSheetSectionRowDto> Equity,
        decimal TotalAssets,
        decimal TotalLiabilities,
        decimal TotalEquity
    );

    public record ProfitBreakdownRowDto(string AccountCode, string AccountName, string AccountType, decimal Debit, decimal Credit, decimal Net);
    public record ProfitSummaryDto(DateTime From, DateTime To, decimal TotalIncome, decimal TotalExpense, decimal NetProfit, IReadOnlyList<ProfitBreakdownRowDto> Breakdown);

    public interface IAccountingQueryService
    {
        Task<AccountStatementDto> GetAccountStatementAsync(AccountStatementQuery query);
        Task<TrialBalanceDto> GetTrialBalanceAsync(DateTime? from, DateTime? to);
        Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime? asOf);

        Task<ProfitSummaryDto> GetProfitAsync(DateTime? from, DateTime? to);
    }
}