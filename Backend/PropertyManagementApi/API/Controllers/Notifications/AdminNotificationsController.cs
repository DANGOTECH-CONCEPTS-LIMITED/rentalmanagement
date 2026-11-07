using Application.Interfaces.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Notifications;

[ApiController]
[Authorize(Roles = "Administrator")]
public sealed class AdminNotificationsController(INotificationSettingsService settings) : ControllerBase
{
    /// <summary>The notification matrix: every event × channel with its current enablement and recipients.</summary>
    [HttpGet("/api/AdminNotifications")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationMatrixRow>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMatrix(CancellationToken ct) => Ok(await settings.GetMatrixAsync(ct));

    /// <summary>Upserts the matrix cells supplied. Rows omitted keep their current configuration.</summary>
    [HttpPut("/api/AdminNotifications")]
    public async Task<IActionResult> Save([FromBody] List<NotificationMatrixRow> rows, CancellationToken ct)
    {
        if (rows == null || rows.Count == 0)
            return BadRequest(new { message = "No notification settings were supplied." });

        try
        {
            var actor = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(ClaimTypes.Email);
            await settings.SaveAsync(rows, actor, ct);
            return Ok(await settings.GetMatrixAsync(ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Delivery log: proof that each alert was attempted, with failures included.</summary>
    [HttpGet("/api/AdminNotificationDeliveries")]
    [ProducesResponseType(typeof(NotificationDeliveryPage), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDeliveries(CancellationToken ct,
        [FromQuery] string? eventType = null, [FromQuery] string? status = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1 || pageSize is < 1 or > 200)
            return BadRequest(new { message = "page must be at least 1 and pageSize between 1 and 200." });

        return Ok(await settings.GetDeliveriesAsync(eventType, status, page, pageSize, ct));
    }
}
