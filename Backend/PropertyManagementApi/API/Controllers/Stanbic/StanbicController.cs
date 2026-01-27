using Application.Interfaces.Collecto;
using Domain.Dtos.Stanbic;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Stanbic
{
    [ApiController]
    [Route("api/[controller]")]
    public class StanbicController : ControllerBase
    {
        private readonly IStanbicApiClient _stanbicApi;

        public StanbicController(IStanbicApiClient stanbicApi)
        {
            _stanbicApi = stanbicApi;
        }

        [HttpPost("collect")]
        public async Task<IActionResult> Collect([FromBody] StanbicCollectRequestDto request)
        {
            try
            {
                var result = await _stanbicApi.CollectAsync(request);
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
                var request = new StanbicCollectStatusRequestDto { TransactionId = transactionId };
                var result = await _stanbicApi.GetCollectStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer([FromBody] StanbicTransferRequestDto request)
        {
            try
            {
                var result = await _stanbicApi.TransferAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("transfer/{transactionId}")]
        public async Task<IActionResult> GetTransferStatus(string transactionId)
        {
            try
            {
                var request = new StanbicTransferStatusRequestDto { TransactionId = transactionId };
                var result = await _stanbicApi.GetTransferStatusAsync(request);
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
                var token = await _stanbicApi.GetAccessTokenAsync();
                return Ok(new { access_token = token });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}