using Application.Interfaces.Accounting;
using Application.Interfaces.Ussd;
using Domain.Dtos.Ussd;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace API.Controllers.Ussd
{
    [Route("api/[controller]")]
    [ApiController]
    public class UssdController : ControllerBase
    {
        private readonly IUssdService _ussdService;
        private readonly IUssdSessionChargeService _sessionCharges;
        private readonly IConfiguration _configuration;

        public UssdController(IUssdService ussdService, IUssdSessionChargeService sessionCharges, IConfiguration configuration)
        {
            _ussdService = ussdService;
            _sessionCharges = sessionCharges;
            _configuration = configuration;
        }

        /// <summary>Africa's Talking end-of-session USSD notification callback (form-urlencoded).</summary>
        [HttpPost("/ussd/notification")]
        [AllowAnonymous]
        [Consumes("application/x-www-form-urlencoded")]
        public async Task<IActionResult> SessionNotification([FromForm] UssdSessionNotificationDto notification, CancellationToken ct)
        {
            // Optional anti-spoof guard: only accept the configured service code.
            var expectedCode = _configuration["Ussd:ServiceCode"];
            if (!string.IsNullOrWhiteSpace(expectedCode) &&
                !string.Equals(notification?.ServiceCode, expectedCode, StringComparison.OrdinalIgnoreCase))
                return Ok(); // ignore silently so AT does not retry

            try
            {
                await _sessionCharges.IngestNotificationAsync(notification!, ct);
            }
            catch
            {
                // Always acknowledge so the operator does not retry and flood the endpoint.
            }
            return Ok();
        }
    }
}
