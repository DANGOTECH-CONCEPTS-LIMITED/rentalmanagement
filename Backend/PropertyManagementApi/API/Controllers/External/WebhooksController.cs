using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces.PaymentService;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace API.Controllers.External
{
    /// <summary>
    /// Inbound payment-provider settlement webhooks. The provider must sign the raw
    /// JSON body with HMAC-SHA256 using the shared secret configured at Webhooks:Secret
    /// and send the digest in the X-Webhook-Signature header.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    [Route("api/webhooks")]
    public class WebhooksController : ControllerBase
    {
        private readonly IPaymentService _payments;
        private readonly IConfiguration _configuration;

        public WebhooksController(IPaymentService payments, IConfiguration configuration)
        {
            _payments = payments;
            _configuration = configuration;
        }

        public sealed class SettlementPayload
        {
            public string TransactionId { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
            public string? VendorReference { get; set; }
            public string? Reason { get; set; }
            public string? TranType { get; set; }
        }

        [HttpPost("payment-settlement")]
        public async Task<IActionResult> PaymentSettlement()
        {
            var secret = _configuration["Webhooks:Secret"];
            if (string.IsNullOrWhiteSpace(secret))
                return NotFound(new { message = "Webhooks are not configured." });

            if (!Request.Headers.TryGetValue("X-Webhook-Signature", out var signature))
                return Unauthorized(new { message = "Missing signature." });

            Request.EnableBuffering();
            string raw;
            using (var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true))
            {
                raw = await reader.ReadToEndAsync();
            }
            Request.Body.Position = 0;

            var expected = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(raw)));
            if (!FixedTimeEquals(expected, signature.ToString()))
                return Unauthorized(new { message = "Invalid signature." });

            SettlementPayload payload;
            try
            {
                payload = System.Text.Json.JsonSerializer.Deserialize<SettlementPayload>(raw) ?? new SettlementPayload();
            }
            catch
            {
                return BadRequest(new { message = "Invalid payload." });
            }

            if (string.IsNullOrWhiteSpace(payload.TransactionId) || string.IsNullOrWhiteSpace(payload.Status))
                return BadRequest(new { message = "transactionId and status are required." });

            var tranType = string.IsNullOrWhiteSpace(payload.TranType) ? "RENT" : payload.TranType.ToUpperInvariant();
            await _payments.UpdatePaymentStatus(
                payload.Status.ToUpperInvariant(),
                payload.TransactionId,
                payload.Reason ?? string.Empty,
                payload.VendorReference ?? string.Empty,
                tranType);

            return Ok(new { acknowledged = true });
        }

        private static bool FixedTimeEquals(string left, string right)
        {
            if (left.Length != right.Length) return false;
            var result = 0;
            for (var i = 0; i < left.Length; i++)
                result |= left[i] ^ right[i];
            return result == 0;
        }
    }
}
