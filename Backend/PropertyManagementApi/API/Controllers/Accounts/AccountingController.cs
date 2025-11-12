using System;
using System.Threading.Tasks;
using Application.Interfaces.Accounting;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Accounts
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountingController : ControllerBase
    {
        private readonly IAccountingQueryService _queries;

        public AccountingController(IAccountingQueryService queries)
        {
            _queries = queries;
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
        public async Task<IActionResult> GetProfit([FromQuery] DateTime? date, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var start = date?.Date ?? from?.Date ?? DateTime.UtcNow.Date;
            var end = date?.Date ?? to?.Date ?? start;
            var dto = await _queries.GetProfitAsync(start, end);
            return Ok(dto);
        }
    }
}