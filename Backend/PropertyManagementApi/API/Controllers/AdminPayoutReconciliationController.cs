using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = "Administrator")]
[Route("api/AdminPayoutReconciliation")]
public sealed class AdminPayoutReconciliationController(IAdminPayoutReconciliation service) : ControllerBase
{
    /// <summary>Lists submitted pending Dango withdrawals for manual reconciliation.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(AdminPayoutReconciliationPage), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminPayoutReconciliationPage>> Get(CancellationToken ct,
        [FromQuery] string? reference = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try { return Ok(await service.GetAsync(reference, page, pageSize, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Manually fails and refunds an independently verified unpaid, transaction-not-found Dango payout exactly once.</summary>
    [HttpPost("{id:int}/fail-and-reverse")]
    [ProducesResponseType(typeof(FailAndReversePayoutResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FailAndReversePayoutResponse>> FailAndReverse(int id,
        [FromBody] FailAndReversePayoutRequest request, CancellationToken ct)
    {
        var actor = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(actor)) return Unauthorized();
        try { return Ok(await service.FailAndReverseAsync(id, request, actor, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }
}
