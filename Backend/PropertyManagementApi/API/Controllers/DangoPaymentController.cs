using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace API.Controllers
{
    [ApiController]
    [Route("api/DangoPayment")]
    [Authorize(Roles = "Administrator")]
    public sealed class DangoPaymentController(DangoPaymentClient dango, AppDbContext db) : ControllerBase
    {
        [HttpGet("wallet-balance")]
        public async Task<IActionResult> GetWalletBalance(CancellationToken ct)
        {
            try
            {
                var reference = await DangoReferenceNumberAllocator.AllocateAsync(db, "B", DateTime.UtcNow);
                var result = await dango.GetWalletBalanceAsync(reference, ct);
                return Ok(new { balance = result.Balance, statusDescription = result.StatusDescription });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("reconciliation")]
        public async Task<IActionResult> GetReconciliation(CancellationToken ct)
        {
            try
            {
                var reference = await DangoReferenceNumberAllocator.AllocateAsync(db, "B", DateTime.UtcNow);
                var result = await dango.GetWalletBalanceAsync(reference, ct);
                var internalBalance = await db.Wallets.AsNoTracking().SumAsync(x => x.Balance, ct);
                var dangoBalance = decimal.TryParse(result.Balance, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
                    ? parsed : (decimal?)null;
                return Ok(new
                {
                    dangoBalance = result.Balance,
                    internalBalance,
                    difference = dangoBalance.HasValue ? dangoBalance.Value - internalBalance : (decimal?)null,
                    statusDescription = result.StatusDescription
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
