using Application.Interfaces.Stanbic;
using Domain.Dtos.Stanbic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Flexipay
{
    [Route("api/[controller]")]
    [ApiController]
    public class FlexipayPaymentsController : ControllerBase
    {
        private readonly IStanbicApiClient _stanbicApi;

        public FlexipayPaymentsController(IStanbicApiClient stanbicApi)
        {
            _stanbicApi = stanbicApi;
        }

        [HttpPost("/merchant-payment")]
        public async Task<IActionResult> MerchantPayment([FromBody] StanbicCollectRequestDto request)
        {
            try
            {
                var result = await _stanbicApi.CollectAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating payment: {ex.Message}");
            }
        }

        [HttpPost("/transaction-status")]
        public async Task<IActionResult> GetTransactionStatus([FromBody] StanbicCollectStatusRequestDto request)
        {
            try
            {
                var result = await _stanbicApi.GetCollectStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error getting transaction status: {ex.Message}");
            }
        }

        [HttpPost("/bill-payment")]
        public async Task<IActionResult> BillPayment([FromBody] StanbicTransferRequestDto request)
        {
            try
            {
                var result = await _stanbicApi.TransferAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating bill payment: {ex.Message}");
            }
        }
    }
}
