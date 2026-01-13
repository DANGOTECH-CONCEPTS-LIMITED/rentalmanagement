using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Payments
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ExternalPaymentsController : ControllerBase
    {
        private readonly IExternalPaymentService _externalPaymentService;

        public ExternalPaymentsController(IExternalPaymentService externalPaymentService)
        {
            _externalPaymentService = externalPaymentService;
        }

        [HttpPost("payin")]
        public async Task<IActionResult> InitiatePayIn([FromBody] PayInRequestDto request)
        {
            try
            {
                var response = await _externalPaymentService.InitiatePayInAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error initiating pay-in: {ex.Message}");
            }
        }

        [HttpGet("payin/{transactionId}/status")]
        public async Task<IActionResult> GetPayInStatus(string transactionId)
        {
            try
            {
                var response = await _externalPaymentService.GetPayInStatusAsync(transactionId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error fetching pay-in status: {ex.Message}");
            }
        }

        [HttpPost("payout")]
        public async Task<IActionResult> InitiatePayout([FromBody] PayoutRequestDto request)
        {
            try
            {
                var response = await _externalPaymentService.InitiatePayoutAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error initiating payout: {ex.Message}");
            }
        }

        [HttpGet("payout/{transactionId}/status")]
        public async Task<IActionResult> GetPayoutStatus(string transactionId)
        {
            try
            {
                var response = await _externalPaymentService.GetPayoutStatusAsync(transactionId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error fetching payout status: {ex.Message}");
            }
        }
    }
}