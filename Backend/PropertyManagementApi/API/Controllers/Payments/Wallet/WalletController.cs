using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Payments.WalletDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Payments.Wallet
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _svc;
        private readonly IPaymentService _paymentSvc;
        public WalletController(IWalletService svc, IPaymentService paymentSvc)
        {
            _svc = svc;
            _paymentSvc = paymentSvc;
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

        [HttpPost("/Withdraw")]
        public async Task<IActionResult> Withdraw([FromForm] WithdrawDto withdrawDto )
        {
            try
            {
                //var landlordId = int.Parse(User.FindFirst("UserId")?.Value);
                await _svc.WithdrawAsync(withdrawDto);
                return Ok("Withdrawal successful.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error processing withdrawal: {ex.Message}");
            }
        }

        [HttpGet("/GetWalletBalance/{landlordid}")]
        public async Task<IActionResult> GetWalletBalance(int landlordid)
        {
            try
            {
                var balance = await _paymentSvc.GetWalletBalanceAsync(landlordid);
                return Ok(new { balance });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving wallet balance: {ex.Message}");
            }
        }
    }
}
