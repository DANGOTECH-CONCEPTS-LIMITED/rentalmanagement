using Application.Interfaces.PaymentService.WalletSvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Payments.Wallet
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Landlord")]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _svc;
        public WalletController(IWalletService svc)
        {
            _svc = svc;
        }

        [HttpGet("/GetBalance/{landlordid}")]
        public async Task<IActionResult> GetBalance(int landlordid)
        {
            try
            {
                //var landlordId = int.Parse(User.FindFirst("UserId")?.Value);
                var balance = await _svc.GetBalanceAsync(landlordid);
                return Ok(balance);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving balance: {ex.Message}");
            }
        }

        [HttpGet("/GetStatement/{landlordid}")]
        public async Task<IActionResult> GetStatement(int landlordid)
        {
            try
            {
                //var landlordId = int.Parse(User.FindFirst("UserId")?.Value);
                var statement = await _svc.GetStatementAsync(landlordid);
                return Ok(statement);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving statement: {ex.Message}");
            }
        }

        [HttpPost("/Withdraw/{landlordid}")]
        public async Task<IActionResult> Withdraw(int landlordid, [FromBody] decimal amount)
        {
            try
            {
                //var landlordId = int.Parse(User.FindFirst("UserId")?.Value);
                await _svc.WithdrawAsync(landlordid, amount);
                return Ok("Withdrawal successful.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error processing withdrawal: {ex.Message}");
            }
        }
    }
}
