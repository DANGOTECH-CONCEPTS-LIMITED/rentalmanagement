using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    }
}
