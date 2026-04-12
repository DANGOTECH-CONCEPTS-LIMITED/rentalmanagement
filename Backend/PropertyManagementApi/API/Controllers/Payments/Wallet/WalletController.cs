using Application.Interfaces.PaymentService;
using Application.Interfaces.PaymentService.WalletSvc;
using Domain.Dtos.Payments.WalletDto;
using System.Security.Claims;
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

        [HttpPost("/AdminDebitWallet")]
        public async Task<IActionResult> AdminDebitWallet([FromForm] AdminWalletDebitDto debitDto)
        {
            try
            {
                EnsureAdministrator();
                await _svc.AdminDebitAsync(debitDto);
                return Ok("Wallet debit successful.");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error processing wallet debit: {ex.Message}");
            }
        }

        [HttpPost("/AdminTransferWallet")]
        public async Task<IActionResult> AdminTransferWallet([FromForm] WalletTransferDto transferDto)
        {
            try
            {
                EnsureAdministrator();
                await _svc.TransferAsync(transferDto);
                return Ok("Wallet transfer successful.");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error processing wallet transfer: {ex.Message}");
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

        private void EnsureAdministrator()
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole == null || !userRole.Equals("Administrator"))
                throw new UnauthorizedAccessException("Only administrators can perform this wallet action.");
        }
    }
}
