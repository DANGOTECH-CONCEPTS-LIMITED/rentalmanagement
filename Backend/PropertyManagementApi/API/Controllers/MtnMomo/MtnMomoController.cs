using Application.Interfaces.Collecto;
using Domain.Dtos.MtnMomo;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.MtnMomo
{
    [ApiController]
    [Route("api/[controller]")]
    public class MtnMomoController : ControllerBase
    {
        private readonly IMtnMomoApiClient _mtnMomoApi;

        public MtnMomoController(IMtnMomoApiClient mtnMomoApi)
        {
            _mtnMomoApi = mtnMomoApi;
        }

        [HttpPost("requesttopay")]
        public async Task<IActionResult> RequestToPay([FromBody] RequestToPayRequestDto request)
        {
            try
            {
                var result = await _mtnMomoApi.RequestToPayAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("requesttopay/{transactionId}")]
        public async Task<IActionResult> GetRequestToPayStatus(string transactionId)
        {
            try
            {
                var request = new RequestToPayStatusRequestDto { TransactionId = transactionId };
                var result = await _mtnMomoApi.GetRequestToPayStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer([FromBody] TransferRequestDto request)
        {
            try
            {
                var result = await _mtnMomoApi.TransferAsync(request);
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
                var request = new TransferStatusRequestDto { TransactionId = transactionId };
                var result = await _mtnMomoApi.GetTransferStatusAsync(request);
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
                var token = await _mtnMomoApi.GetAccessTokenAsync();
                return Ok(new { access_token = token });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}