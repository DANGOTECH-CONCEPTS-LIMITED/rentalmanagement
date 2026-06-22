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

            // Income: paid invoices on properties owned by this landlord (same join as GetInvoicesByLandlordId)
            var paidInvoices = await _db.TenantInvoices
                .AsNoTracking()
                .Join(_db.LandLordProperties.AsNoTracking().Where(p => p.OwnerId == landlordId),
                    i => i.PropertyId, p => p.Id, (i, p) => i)
                .Where(i => i.Status.ToLower() == "paid"
                         && i.InvoiceDate >= fromDate && i.InvoiceDate <= toDateEnd)
                .Select(i => new { i.InvoiceDate, i.Amount })
                .ToListAsync();

            // Expenses: property expenses recorded by this landlord
            var expenses = await _db.PropertyExpenses
                .AsNoTracking()
                .Where(e => e.OwnerId == landlordId
                         && e.Date >= fromDate && e.Date <= toDateEnd)
                .Select(e => new { e.Date, e.Amount, e.Category })
                .ToListAsync();

            var totalIncome = (decimal)paidInvoices.Sum(i => i.Amount);
            var totalExpenses = (decimal)expenses.Sum(e => e.Amount);
            var netProfit = totalIncome - totalExpenses;

            // Monthly breakdown for the full range
            var paymentsByMonth = paidInvoices
                .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
                .ToDictionary(g => g.Key, g => (decimal)g.Sum(i => i.Amount));

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

        // GET: /api/accounting/dashboard-kpis/1
        [HttpGet("dashboard-kpis/{landlordId:int}")]
        [Authorize]
        public async Task<IActionResult> GetDashboardKpis(int landlordId)
        {
            if (landlordId <= 0) return BadRequest("landlordId is required.");

            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
            var successfulPaymentStatuses = new[] { "SUCCESSFUL", "PAID", "COMPLETED" };

            var activeContracts = await _db.RentalContracts
                .AsNoTracking()
                .Where(c => c.OwnerId == landlordId && string.Equals(c.Status, "active", StringComparison.OrdinalIgnoreCase))
                .Select(c => new
                {
                    c.TenantId,
                    c.PropertyId,
                    c.UnitId,
                    c.RentAmount,
                    c.SecurityDeposit
                })
                .ToListAsync();

            var invoices = await _db.TenantInvoices
                .AsNoTracking()
                .Join(_db.LandLordProperties.AsNoTracking().Where(p => p.OwnerId == landlordId),
                    i => i.PropertyId, p => p.Id, (i, p) => i)
                .Where(i => i.InvoiceDate >= monthStart && i.InvoiceDate <= monthEnd)
                .Select(i => new
                {
                    i.TenantId,
                    i.PropertyId,
                    i.PropertyUnitId,
                    i.Amount,
                    i.Status,
                    i.Type
                })
                .ToListAsync();

            var collected = await _db.TenantPayments
                .AsNoTracking()
                .Where(p => p.PropertyTenant.Property != null
                         && p.PropertyTenant.Property.OwnerId == landlordId
                         && p.PaymentDate >= monthStart && p.PaymentDate <= monthEnd
                         && successfulPaymentStatuses.Contains((p.PaymentStatus ?? string.Empty).ToUpper()))
                .SumAsync(p => (decimal)p.Amount);

            var outstandingInvoiceBalances = invoices
                .Where(i => !string.Equals(i.Status, "Cancelled", StringComparison.OrdinalIgnoreCase)
                         && !string.Equals(i.Status, "Void", StringComparison.OrdinalIgnoreCase))
                .Sum(i => (decimal)i.Amount);

            var missingContractRent = activeContracts
                .Where(contract => !invoices.Any(invoice =>
                    string.Equals(invoice.Type, "Rent", StringComparison.OrdinalIgnoreCase)
                    && (
                        (contract.TenantId.HasValue && invoice.TenantId == contract.TenantId.Value)
                        || (contract.PropertyId.HasValue
                            && invoice.PropertyId == contract.PropertyId.Value
                            && invoice.PropertyUnitId == contract.UnitId)
                    )))
                .Sum(contract => (decimal)contract.RentAmount);

            var currentMonthSecurityDepositInvoices = invoices
                .Where(i => !string.IsNullOrWhiteSpace(i.Type)
                         && i.Type.Contains("security", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var contractSecurityDeposits = activeContracts.Sum(contract => (decimal)contract.SecurityDeposit);
            var manualSecurityDeposits = currentMonthSecurityDepositInvoices
                .Where(invoice => !activeContracts.Any(contract =>
                    (contract.TenantId.HasValue && contract.TenantId.Value == invoice.TenantId)
                    || (contract.PropertyId.HasValue
                        && contract.PropertyId.Value == invoice.PropertyId
                        && contract.UnitId == invoice.PropertyUnitId)))
                .Sum(invoice => (decimal)invoice.Amount);

            var revenueExpected = collected + outstandingInvoiceBalances + missingContractRent;
            var securityDeposits = contractSecurityDeposits + manualSecurityDeposits;

            var uncollected = revenueExpected > collected ? revenueExpected - collected : 0m;

            return Ok(new { revenueExpected, collected, uncollected, securityDeposits });
        }
    }
}