using Domain.Dtos.Meters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.UserControllers;

public partial class UserController
{
    [Authorize]
    [HttpGet("/GetMeterLien/{meterId:int}")]
    [HttpGet("GetMeterLien/{meterId:int}")]
    public Task<IActionResult> GetMeterLien(int meterId) =>
        ExecuteLienRequestAsync(email => _meterLienService.GetAsync(meterId, email));

    [Authorize]
    [HttpPost("/AddMeterLien/{meterId:int}")]
    [HttpPost("AddMeterLien/{meterId:int}")]
    public Task<IActionResult> AddMeterLien(int meterId, [FromBody] AddMeterLienDto request) =>
        ExecuteLienRequestAsync(email => _meterLienService.AddAsync(meterId, request, email));

    [Authorize]
    [HttpPut("/SetMeterLienPolicy/{meterId:int}")]
    [HttpPut("SetMeterLienPolicy/{meterId:int}")]
    public Task<IActionResult> SetMeterLienPolicy(int meterId, [FromBody] SetMeterLienPolicyDto request) =>
        ExecuteLienRequestAsync(email => _meterLienService.SetPolicyAsync(meterId, request, email));

    private async Task<IActionResult> ExecuteLienRequestAsync(Func<string, Task<MeterLienSummaryDto>> operation)
    {
        var email = GetRequesterEmail();
        if (string.IsNullOrWhiteSpace(email)) return Forbid();
        try { return Ok(await operation(email)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Meter lien request failed");
            return StatusCode(500, "An error occurred while processing the meter lien request.");
        }
    }
}
