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

            // Income: paid invoices on properties owned by this landlord
            var paidInvoices = await _db.TenantInvoices
                .AsNoTracking()
                .Join(_db.LandLordProperties.AsNoTracking().Where(p => p.OwnerId == landlordId),
                    i => i.PropertyId, p => p.Id, (i, p) => i)
                .Where(i => i.Status.ToLower() == "paid"
                         && i.InvoiceDate >= fromDate && i.InvoiceDate <= toDateEnd)
                .Select(i => new { Date = i.InvoiceDate, i.Amount })
                .ToListAsync();

            // Income: successful cash payments (MakeTenantPayment records) — captures rent paid without a matching paid invoice
            var successfulPayments = await _db.TenantPayments
                .AsNoTracking()
                .Where(p => p.PropertyTenant.Property != null
                         && p.PropertyTenant.Property.OwnerId == landlordId
                         && p.PaymentDate >= fromDate && p.PaymentDate <= toDateEnd)
                .Select(p => new { Date = p.PaymentDate, p.Amount, p.PaymentStatus })
                .ToListAsync();

            var countedPayments = successfulPayments
                .Where(p => ShouldCountDashboardPayment(p.PaymentStatus))
                .ToList();

            // Expenses: property expenses recorded by this landlord
            var expenses = await _db.PropertyExpenses
                .AsNoTracking()
                .Where(e => e.OwnerId == landlordId
                         && e.Date >= fromDate && e.Date <= toDateEnd)
                .Select(e => new { e.Date, e.Amount, e.Category })
                .ToListAsync();

            var totalIncome = (decimal)paidInvoices.Sum(i => i.Amount)
                            + (decimal)countedPayments.Sum(p => p.Amount);
            var totalExpenses = (decimal)expenses.Sum(e => e.Amount);
            var netProfit = totalIncome - totalExpenses;

            // Monthly breakdown — combine paid invoices and cash payments
            var allIncomeEntries = paidInvoices.Select(i => (i.Date, i.Amount))
                .Concat(countedPayments.Select(p => (p.Date, p.Amount)))
                .ToList();

            var paymentsByMonth = allIncomeEntries
                .GroupBy(x => new { x.Date.Year, x.Date.Month })
                .ToDictionary(g => g.Key, g => (decimal)g.Sum(x => x.Amount));

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

        // GET: /api/accounting/dashboard-kpis/1?fromDate=2026-01-01&toDate=2026-01-31&propertyId=3
        [HttpGet("dashboard-kpis/{landlordId:int}")]
        [Authorize]
        public async Task<IActionResult> GetDashboardKpis(
            int landlordId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int? propertyId)
        {
            if (landlordId <= 0) return BadRequest("landlordId is required.");

            var now = DateTime.UtcNow;
            var periodStart = fromDate.HasValue
                ? DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc)
                : new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var periodEnd = toDate.HasValue
                ? DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc)
                : new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1).AddTicks(-1);

            var activeContracts = await _db.RentalContracts
                .AsNoTracking()
                .Where(c => c.OwnerId == landlordId && c.Status.ToLower() == "active"
                         && (!propertyId.HasValue || c.PropertyId == propertyId.Value))
                .Select(c => new
                {
                    c.TenantId,
                    c.PropertyId,
                    c.UnitId,
                    c.RentAmount,
                    c.SecurityDeposit
                })
                .ToListAsync();

            var invoiceQuery = _db.TenantInvoices
                .AsNoTracking()
                .Join(_db.LandLordProperties.AsNoTracking().Where(p => p.OwnerId == landlordId),
                    i => i.PropertyId, p => p.Id, (i, p) => i)
                .Where(i => i.InvoiceDate >= periodStart && i.InvoiceDate <= periodEnd);

            if (propertyId.HasValue)
                invoiceQuery = invoiceQuery.Where(i => i.PropertyId == propertyId.Value);

            var invoices = await invoiceQuery
                .Select(i => new
                {
                    i.TenantId,
                    i.PropertyId,
                    i.PropertyUnitId,
                    i.Amount,
                    i.OriginalAmount,
                    i.PaidAmount,
                    i.Status,
                    i.Type
                })
                .ToListAsync();

            var paymentQuery = _db.TenantPayments
                .AsNoTracking()
                .Where(p => p.PropertyTenant.Property != null
                         && p.PropertyTenant.Property.OwnerId == landlordId
                         && p.PaymentDate >= periodStart && p.PaymentDate <= periodEnd);

            if (propertyId.HasValue)
                paymentQuery = paymentQuery.Where(p => p.PropertyTenant.Property!.Id == propertyId.Value);

            var payments = await paymentQuery
                .Select(p => new
                {
                    p.Amount,
                    p.PaymentStatus,
                    p.PaymentType,
                    p.Description
                })
                .ToListAsync();

            var countedPayments = payments
                .Where(p => ShouldCountDashboardPayment(p.PaymentStatus))
                .ToList();

            var collectedPayments = countedPayments.Sum(p => (decimal)p.Amount);
            var collectedInvoices = invoices
                .Where(i => ShouldCountDashboardPayment(i.Status))
                .Sum(i => (decimal)(i.PaidAmount > 0
                    ? i.PaidAmount
                    : i.OriginalAmount > 0 ? i.OriginalAmount : i.Amount));

            var collected = collectedPayments + collectedInvoices;

            // Revenue Expected = all invoices raised in the period, excluding cancelled/void
            var revenueExpected = invoices
                .Where(i => !string.Equals(i.Status, "Cancelled", StringComparison.OrdinalIgnoreCase)
                         && !string.Equals(i.Status, "Void", StringComparison.OrdinalIgnoreCase))
                .Sum(i => (decimal)i.Amount);

            // Security deposits are one-time events — query all time, not just the selected period
            var secDepInvoiceQuery = _db.TenantInvoices
                .AsNoTracking()
                .Join(_db.LandLordProperties.AsNoTracking().Where(p => p.OwnerId == landlordId),
                    i => i.PropertyId, p => p.Id, (i, p) => i)
                .Where(i => (i.Type != null && (i.Type.ToLower().Contains("security") || i.Type.ToLower().Contains("deposit")))
                         || (i.Notes != null && (i.Notes.ToLower().Contains("security deposit") || i.Notes.ToLower().Contains("security"))));

            if (propertyId.HasValue)
                secDepInvoiceQuery = secDepInvoiceQuery.Where(i => i.PropertyId == propertyId.Value);

            var allTimeSecDepositInvoices = await secDepInvoiceQuery
                .Select(i => new
                {
                    i.TenantId,
                    i.PropertyId,
                    i.PropertyUnitId,
                    i.Amount,
                    i.OriginalAmount,
                    i.PaidAmount,
                })
                .ToListAsync();

            var secDepPaymentQuery = _db.TenantPayments
                .AsNoTracking()
                .Where(p => p.PropertyTenant.Property != null
                         && p.PropertyTenant.Property.OwnerId == landlordId);

            if (propertyId.HasValue)
                secDepPaymentQuery = secDepPaymentQuery.Where(p => p.PropertyTenant.Property!.Id == propertyId.Value);

            var allTimeSecDepositPayments = await secDepPaymentQuery
                .Select(p => new { p.Amount, p.PaymentStatus, p.PaymentType, p.Description })
                .ToListAsync();

            var securityDepositPayments = allTimeSecDepositPayments
                .Where(p => ShouldCountDashboardPayment(p.PaymentStatus)
                         && IsSecurityDepositPayment(p.PaymentType, p.Description))
                .Sum(p => (decimal)p.Amount);

            var securityDepositInvoices = allTimeSecDepositInvoices
                .Sum(invoice => (decimal)(invoice.PaidAmount > 0
                    ? invoice.PaidAmount
                    : invoice.OriginalAmount > 0 ? invoice.OriginalAmount : invoice.Amount));

            var contractSecurityDeposits = activeContracts.Sum(contract => (decimal)contract.SecurityDeposit);
            var manualSecurityDeposits = allTimeSecDepositInvoices
                .Where(invoice => !activeContracts.Any(contract =>
                    (contract.TenantId.HasValue && contract.TenantId.Value == invoice.TenantId)
                    || (contract.PropertyId.HasValue
                        && contract.PropertyId.Value == invoice.PropertyId
                        && contract.UnitId == invoice.PropertyUnitId)))
                .Sum(invoice => (decimal)invoice.Amount);

            // Priority: contracts are most reliable (set at contract creation); fall back to invoices, then payments
            var contractTotal = contractSecurityDeposits + manualSecurityDeposits;
            var securityDeposits = contractTotal > 0
                ? contractTotal
                : securityDepositInvoices > 0
                    ? securityDepositInvoices
                    : securityDepositPayments;

            var uncollected = revenueExpected > collected ? revenueExpected - collected : 0m;

            return Ok(new { revenueExpected, collected, uncollected, securityDeposits });
        }

        private static bool ShouldCountDashboardPayment(string? status)
        {
            var normalizedStatus = (status ?? string.Empty).Trim().ToUpperInvariant();

            return normalizedStatus == "PAID"
                || normalizedStatus == "SUCCESSFUL"
                || normalizedStatus == "SUCCESS"
                || normalizedStatus == "COMPLETED"
                || normalizedStatus == "COMPLETE";
        }

        private static bool IsSecurityDepositPayment(string? paymentType, string? description)
        {
            return ContainsDepositText(paymentType) || ContainsDepositText(description);
        }

        private static bool ContainsDepositText(string? value)
        {
            return !string.IsNullOrWhiteSpace(value)
                && value.Contains("deposit", StringComparison.OrdinalIgnoreCase);
        }
    }
}