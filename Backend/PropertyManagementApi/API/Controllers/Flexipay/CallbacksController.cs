using Application.Interfaces.Flexipay;
using Domain.Dtos.Flexipay;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace API.Controllers.Flexipay
{
    [Route("api/[controller]")]
    [ApiController]
    public class CallbacksController : ControllerBase
    {
        private readonly IFlexiPayService _flexiPayService;

        public CallbacksController(IFlexiPayService flexiPayService)
        {
            _flexiPayService = flexiPayService;
        }

        [HttpPost("merchant-payment-callback")]
        public IActionResult MerchantPaymentCallback([FromBody] CallbackRequestDto callback, [FromHeader(Name = "x-signature")] string signature)
        {
            var payload = JsonSerializer.Serialize(callback);
            payload = Regex.Replace(payload, "\\s+", "");

            var isValid = _flexiPayService.VerifySignature(payload, signature);

            if (!isValid)
                return Unauthorized(new CallbackResponseDto { StatusCode = "401", StatusDescription = "Invalid signature" });

            // Process the callback here (e.g., update transaction status)

            return Ok(new CallbackResponseDto { StatusCode = "00", StatusDescription = "Successfully processed" });
        }
    }
}
