using Application.Interfaces.Ops;
using Domain.Dtos.Ops;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Ops;

[ApiController]
[Authorize(Roles = "Administrator")]
public sealed class AdminExceptionsController(IExceptionQueueService service) : ControllerBase
{
    /// <summary>
    /// Read-only operations queue: failed/stuck bill payments and collections that were never
    /// credited or never billed, with per-category counts.
    /// </summary>
    [HttpGet("/api/AdminExceptions")]
    [ProducesResponseType(typeof(ExceptionQueueResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct,
        [FromQuery] string? category = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1 || pageSize is < 1 or > 200)
        {
            return BadRequest(new { message = "page must be at least 1 and pageSize between 1 and 200." });
        }

        try
        {
            return Ok(await service.GetAsync(category, page, pageSize, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
