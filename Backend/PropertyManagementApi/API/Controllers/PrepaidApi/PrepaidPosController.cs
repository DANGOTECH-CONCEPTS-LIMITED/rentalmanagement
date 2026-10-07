using Application.Interfaces.Meter;
using Application.Interfaces.PrepaidApi;
using Domain.Dtos.PrepaidApi;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.PrepaidApi
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrepaidPosController : ControllerBase
    {
        private readonly IPrepaidApiClient _prepaidApiClient;
        private readonly IMeterFeeService _meterFeeService;
        public PrepaidPosController(IPrepaidApiClient prepaidApiClient, IMeterFeeService meterFeeService)
        {
            _prepaidApiClient = prepaidApiClient;
            _meterFeeService = meterFeeService;
        }

        [HttpGet("/GetMeterOutstandingFee/{meterNumber}")]
        public async Task<IActionResult> GetMeterOutstandingFee(string meterNumber)
        {
            try
            {
                var outstanding = await _meterFeeService.GetOutstandingForMeterAsync(meterNumber);
                return Ok(new { hasFee = outstanding != null, outstanding = outstanding ?? 0d });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving the meter fee.", error = ex.Message });
            }
        }

        [HttpPost("/ValidateMeter")]
        public async Task<IActionResult> ValidateMeter([FromBody] CustomerSearchDto searchDto)
        {
            try
            {
                var result = await _prepaidApiClient.SearchCustomerAsync(searchDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while searching for the customer.", error = ex.Message });
            }
            
        }

        [HttpPost("/preview")]
        public async Task<IActionResult> Preview([FromBody] PurchasePreviewDto previewDto)
        {
            try
            {
                var result = await _prepaidApiClient.PreviewAsync(previewDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while previewing the purchase.", error = ex.Message });
            }
            
        }

        //[HttpPost("/purchase")]
        //public async Task<IActionResult> Purchase([FromBody] PurchasePreviewDto purchaseDto)
        //{
        //    try
        //    {
        //        var result = await _prepaidApiClient.PurchaseAsync(purchaseDto);
        //        return Ok(result);
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(new { message = "An error occurred while processing the purchase.", error = ex.Message });
        //    }
        //}
    }
}
