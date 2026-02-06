using Application.Interfaces.Stanbic;
using Domain.Dtos.Stanbic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace API.Controllers.Stanbic
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StanbicController : ControllerBase
    {
        private readonly IStanbicApiClient _stanbicApi;
        private readonly ILogger<StanbicController> _logger;

        public StanbicController(IStanbicApiClient stanbicApi, ILogger<StanbicController> logger)
        {
            _stanbicApi = stanbicApi;
            _logger = logger;
        }

        [HttpPost("collect")]
        public async Task<IActionResult> Collect([FromBody] StanbicCollectRequestDto request)
        {
            if (request == null)
                return BadRequest("Invalid request data.");

            try
            {
                var result = await _stanbicApi.CollectAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Collect for request: {@Request}", request);
                return BadRequest("An error occurred while processing the collection request.");
            }
        }

        [HttpGet("collect/{transactionId}")]
        public async Task<IActionResult> GetCollectStatus(string transactionId)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
                return BadRequest("Transaction ID is required.");

            try
            {
                var request = new StanbicCollectStatusRequestDto { TransactionId = transactionId };
                var result = await _stanbicApi.GetCollectStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCollectStatus for TransactionId: {TransactionId}", transactionId);
                return BadRequest("An error occurred while retrieving collection status.");
            }
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer([FromBody] StanbicTransferRequestDto request)
        {
            if (request == null)
                return BadRequest("Invalid request data.");

            try
            {
                var result = await _stanbicApi.TransferAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Transfer for request: {@Request}", request);
                return BadRequest("An error occurred while processing the transfer request.");
            }
        }

        [HttpGet("transfer/{transactionId}")]
        public async Task<IActionResult> GetTransferStatus(string transactionId)
        {
            if (string.IsNullOrWhiteSpace(transactionId))
                return BadRequest("Transaction ID is required.");

            try
            {
                var request = new StanbicTransferStatusRequestDto { TransactionId = transactionId };
                var result = await _stanbicApi.GetTransferStatusAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetTransferStatus for TransactionId: {TransactionId}", transactionId);
                return BadRequest("An error occurred while retrieving transfer status.");
            }
        }

        [HttpGet("account/{accountNumber}")]
        public async Task<IActionResult> AccountInquiry(string accountNumber)
        {
            if (string.IsNullOrWhiteSpace(accountNumber))
                return BadRequest("Account number is required.");

            try
            {
                var request = new StanbicAccountInquiryRequestDto { AccountNumber = accountNumber };
                var result = await _stanbicApi.AccountInquiryAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AccountInquiry for AccountNumber: {AccountNumber}", accountNumber);
                return BadRequest("An error occurred while processing account inquiry.");
            }
        }

        [HttpGet("balance/{accountNumber}")]
        public async Task<IActionResult> GetBalance(string accountNumber)
        {
            if (string.IsNullOrWhiteSpace(accountNumber))
                return BadRequest("Account number is required.");

            try
            {
                var request = new StanbicBalanceRequestDto { AccountNumber = accountNumber };
                var result = await _stanbicApi.GetBalanceAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetBalance for AccountNumber: {AccountNumber}", accountNumber);
                return BadRequest("An error occurred while retrieving balance.");
            }
        }

        [HttpPost("reverse")]
        public async Task<IActionResult> ReverseTransaction([FromBody] StanbicReverseRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.TransactionId))
                return BadRequest("Invalid request data or Transaction ID is required.");

            try
            {
                var result = await _stanbicApi.ReverseTransactionAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReverseTransaction for request: {@Request}", request);
                return BadRequest("An error occurred while processing transaction reversal.");
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
                _logger.LogError(ex, "Error in GetAccessToken");
                return BadRequest("An error occurred while retrieving access token.");
            }
        }
    }
}