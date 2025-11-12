using System;
using System.Threading;
using System.Threading.Tasks;
using Infrastructure.Services.Accounting;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Accounts
{
    [ApiController]
    [Route("api/accounting/maintenance")]
    public class AccountingMaintenanceController : ControllerBase
    {
        private readonly WalletAccountingNotifier _notifier;

        public AccountingMaintenanceController(WalletAccountingNotifier notifier)
        {
            _notifier = notifier;
        }

        // POST /api/accounting/maintenance/notify-wallet?from=2025-04-01&to=2025-04-30
        [HttpPost("notify-wallet")]
        public async Task<IActionResult> NotifyWallet([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        {
            var result = await _notifier.NotifyAsync(from, to, ct);
            return Ok(result);
        }
    }
}