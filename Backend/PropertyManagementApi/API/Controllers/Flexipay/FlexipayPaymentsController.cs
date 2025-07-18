using Application.Interfaces.Flexipay;
using Domain.Dtos.Flexipay;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Flexipay
{
    [Route("api/[controller]")]
    [ApiController]
    public class FlexipayPaymentsController : ControllerBase
    {
        private readonly IFlexiPayService _flexiPayService;

        public FlexipayPaymentsController(IFlexiPayService flexiPayService)
        {
            _flexiPayService = flexiPayService;
        }

        [HttpPost("/merchant-payment")]
        public async Task<IActionResult> MerchantPayment([FromBody] MerchantPaymentRequestDto request)
        {
            try
            {
                var result = await _flexiPayService.InitiateMerchantPaymentAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating payment: {ex.Message}");
            }
        }

        [HttpPost("/transaction-status")]
        public async Task<IActionResult> GetTransactionStatus([FromBody] TransactionStatusRequestDto request)
        {
            try
            {
                var result = await _flexiPayService.GetTransactionStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating payment: {ex.Message}");
            }
        }

        [HttpPost("/bill-payment")]
        public async Task<IActionResult> BillPayment([FromBody] BillPaymentRequestDto request)
        {
            try
            {
                var result = await _flexiPayService.InitiateBillPaymentAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating bill payment: {ex.Message}");
            }
        }
    }
}
