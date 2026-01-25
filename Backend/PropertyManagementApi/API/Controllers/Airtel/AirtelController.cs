using Application.Interfaces.Collecto;
using Domain.Dtos.Airtel;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Airtel
{
    [ApiController]
    [Route("api/[controller]")]
    public class AirtelController : ControllerBase
    {
        private readonly IAirtelApiClient _airtelApi;

        public AirtelController(IAirtelApiClient airtelApi)
        {
            _airtelApi = airtelApi;
        }

        [HttpPost("collect")]
        public async Task<IActionResult> Collect([FromBody] CollectRequestDto request)
        {
            try
            {
                var result = await _airtelApi.CollectAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("collect/{transactionId}")]
        public async Task<IActionResult> GetCollectStatus(string transactionId)
        {
            try
            {
                var request = new CollectStatusRequestDto { TransactionId = transactionId };
                var result = await _airtelApi.GetCollectStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("disburse")]
        public async Task<IActionResult> Disburse([FromBody] DisburseRequestDto request)
        {
            try
            {
                var result = await _airtelApi.DisburseAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("disburse/{transactionId}")]
        public async Task<IActionResult> GetDisburseStatus(string transactionId)
        {
            try
            {
                var request = new DisburseStatusRequestDto { TransactionId = transactionId };
                var result = await _airtelApi.GetDisburseStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("token")]
        public async Task<IActionResult> GetAccessToken()
        {
            try
            {
                var token = await _airtelApi.GetAccessTokenAsync();
                return Ok(new { access_token = token });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}