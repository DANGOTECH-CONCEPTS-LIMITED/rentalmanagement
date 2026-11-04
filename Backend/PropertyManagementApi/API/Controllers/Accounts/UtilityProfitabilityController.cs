using Application.Interfaces.Accounting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Accounts
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class UtilityProfitabilityController : ControllerBase
    {
        private readonly IUtilityProfitabilityService _service;

        public UtilityProfitabilityController(IUtilityProfitabilityService service)
        {
            _service = service;
        }

        /// <summary>Utility profitability: commission vs bank, SMS and USSD fees for a period.</summary>
        [HttpGet("/GetUtilityProfitabilityReport")]
        public async Task<IActionResult> Get(CancellationToken ct, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                var start = from?.Date ?? DateTime.UtcNow.AddMonths(-1).Date;
                var end = to?.Date ?? DateTime.UtcNow.Date;
                return Ok(await _service.GetReportAsync(start, end, ct));
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }
    }
}
