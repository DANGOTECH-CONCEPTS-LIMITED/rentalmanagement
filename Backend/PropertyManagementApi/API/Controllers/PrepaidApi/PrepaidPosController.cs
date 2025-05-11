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
        public PrepaidPosController(IPrepaidApiClient prepaidApiClient) => _prepaidApiClient = prepaidApiClient;

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

        [HttpPost("/purchase")]
        public async Task<IActionResult> Purchase([FromBody] PurchasePreviewDto purchaseDto)
        {
            try
            {
                var result = await _prepaidApiClient.PurchaseAsync(purchaseDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while processing the purchase.", error = ex.Message });
            }
        }
    }
}
