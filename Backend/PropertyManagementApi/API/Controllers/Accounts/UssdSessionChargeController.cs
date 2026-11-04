using Application.Interfaces.Accounting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Accounts
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class UssdSessionChargeController : ControllerBase
    {
        private readonly IUssdSessionChargeService _service;

        public UssdSessionChargeController(IUssdSessionChargeService service)
        {
            _service = service;
        }

        /// <summary>Uploads a CSV of USSD session charges (columns: sessionId, phoneNumber, durationSeconds, charge, outcome, billingDate).</summary>
        [HttpPost("/ImportUssdSessionCharges")]
        public async Task<IActionResult> Import(IFormFile file, [FromForm] DateTime? billingDate, CancellationToken ct)
        {
            try
            {
                var imported = await _service.ImportAsync(file, billingDate, ct);
                return Ok(new { imported });
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetUssdSessionCharges")]
        public async Task<IActionResult> Get(CancellationToken ct, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                return Ok(await _service.GetAsync(from, to, ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        private IActionResult HandleError(Exception ex) => ex switch
        {
            ArgumentException or ArgumentNullException => BadRequest(new { message = ex.Message }),
            KeyNotFoundException => NotFound(new { message = ex.Message }),
            InvalidOperationException => BadRequest(new { message = ex.Message }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." })
        };
    }
}
