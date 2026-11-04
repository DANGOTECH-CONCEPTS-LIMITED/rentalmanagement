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

        /// <summary>Uploads a CSV of USSD session charges; the file is queued and processed in the background.</summary>
        [HttpPost("/ImportUssdSessionCharges")]
        public async Task<IActionResult> Import(IFormFile file, [FromForm] DateTime? billingDate, CancellationToken ct)
        {
            try
            {
                var batch = await _service.QueueAsync(file, billingDate, ct);
                return Accepted(new { batchId = batch.Id, status = batch.Status, message = "File queued for background processing." });
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetUssdImportBatches")]
        public async Task<IActionResult> GetBatches(CancellationToken ct)
        {
            try
            {
                return Ok(await _service.GetBatchesAsync(ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetUssdSessionCharges")]
        public async Task<IActionResult> Get(CancellationToken ct,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
            [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
            [FromQuery] string? outcome = null)
        {
            try
            {
                return Ok(await _service.GetAsync(page, pageSize, from, to, outcome, ct));
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
