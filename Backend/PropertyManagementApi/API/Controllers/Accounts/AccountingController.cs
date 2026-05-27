using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers.Accounts
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountingController : ControllerBase
    {
        private readonly IAccountingQueryService _queries;
        private readonly AppDbContext _db;

        public AccountingController(IAccountingQueryService queries, AppDbContext db)
        {
            _queries = queries;
            _db = db;
        }

        // GET: /api/accounting/statement?accountCode=2000&from=2025-04-01&to=2025-04-30
        [HttpGet("statement")]
        public async Task<IActionResult> GetStatement([FromQuery] string accountCode, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            if (string.IsNullOrWhiteSpace(accountCode))
                return BadRequest("accountCode is required.");

            var dto = await _queries.GetAccountStatementAsync(new AccountStatementQuery(accountCode, from, to));
            return Ok(dto);
        }

        // GET: /api/accounting/trial-balance?from=2025-04-01&to=2025-04-30
        [HttpGet("trial-balance")]
        public async Task<IActionResult> GetTrialBalance([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var dto = await _queries.GetTrialBalanceAsync(from, to);
            return Ok(dto);
        }

        // GET: /api/accounting/balance-sheet?asOf=2025-04-30
        [HttpGet("balance-sheet")]
        public async Task<IActionResult> GetBalanceSheet([FromQuery] DateTime? asOf)
        {
            var dto = await _queries.GetBalanceSheetAsync(asOf);
            return Ok(dto);
        }

        [HttpGet("profit")]
        public async Task<IActionResult> GetProfit([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var start = from?.Date ?? DateTime.UtcNow.Date;
            var end = to?.Date ?? start;
            var dto = await _queries.GetProfitAsync(start, end);
            return Ok(dto);
        }

        // GET: /api/accounting/landlord-summary?landlordId=1&from=2026-01-01&to=2026-12-31
        [HttpGet("landlord-summary")]
        [Authorize]
        public async Task<IActionResult> GetLandlordSummary(
            [FromQuery] int landlordId,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {
            if (landlordId <= 0) return BadRequest("landlordId is required.");

            var fromDate = from?.Date ?? new DateTime(DateTime.UtcNow.Year, 1, 1);
            var toDate = to?.Date ?? new DateTime(DateTime.UtcNow.Year, 12, 31);
            var toDateEnd = toDate.AddDays(1).AddTicks(-1);

            // Income: successful tenant payments on properties owned by this landlord
            var payments = await _db.TenantPayments
                .AsNoTracking()
                .Include(p => p.PropertyTenant).ThenInclude(t => t.Property)
                .Where(p => p.PropertyTenant.Property.OwnerId == landlordId
                         && p.PaymentDate >= fromDate && p.PaymentDate <= toDateEnd
                         && p.PaymentStatus.ToLower() != "failed")
                .Select(p => new { p.PaymentDate, p.Amount })
                .ToListAsync();

            // Expenses: property expenses recorded by this landlord
            var expenses = await _db.PropertyExpenses
                .AsNoTracking()
                .Where(e => e.OwnerId == landlordId
                         && e.Date >= fromDate && e.Date <= toDateEnd)
                .Select(e => new { e.Date, e.Amount, e.Category })
                .ToListAsync();

            var totalIncome = (decimal)payments.Sum(p => p.Amount);
            var totalExpenses = (decimal)expenses.Sum(e => e.Amount);
            var netProfit = totalIncome - totalExpenses;

            // Monthly breakdown for the full range
            var paymentsByMonth = payments
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .ToDictionary(g => g.Key, g => (decimal)g.Sum(p => p.Amount));

            var expensesByMonth = expenses
                .GroupBy(e => new { e.Date.Year, e.Date.Month })
                .ToDictionary(g => g.Key, g => (decimal)g.Sum(e => e.Amount));

            var monthlyBreakdown = new List<object>();
            var cursor = new DateTime(fromDate.Year, fromDate.Month, 1);
            var monthEnd = new DateTime(toDate.Year, toDate.Month, 1);
            while (cursor <= monthEnd)
            {
                var key = new { cursor.Year, cursor.Month };
                var inc = paymentsByMonth.TryGetValue(key, out var i) ? i : 0m;
                var exp = expensesByMonth.TryGetValue(key, out var e) ? e : 0m;
                monthlyBreakdown.Add(new { month = cursor.ToString("MMM yyyy"), income = inc, expenses = exp, profit = inc - exp });
                cursor = cursor.AddMonths(1);
            }

            // Expense breakdown by category
            var expenseBreakdown = expenses
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Category) ? "Other" : e.Category)
                .ToDictionary(g => g.Key, g => (decimal)g.Sum(e => e.Amount));

            return Ok(new
            {
                from = fromDate,
                to = toDate,
                totalIncome,
                totalExpenses,
                netProfit,
                monthlyBreakdown,
                expenseBreakdown,
            });
        }
    }
}