using Application.Interfaces.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Billing;

[ApiController]
[Route("api/RentInvoices")]
public sealed class RentInvoicesController(IRentInvoicingService invoices) : ControllerBase
{
    private string? Actor => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(ClaimTypes.Email);

    /// <summary>Paged rent invoices, optionally filtered by status or tenant.</summary>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(RentInvoicePage), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct,
        [FromQuery] string? status = null, [FromQuery] int? tenantId = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1 || pageSize is < 1 or > 200)
            return BadRequest(new { message = "page must be at least 1 and pageSize between 1 and 200." });

        return Ok(await invoices.GetInvoicesAsync(status, tenantId, page, pageSize, ct));
    }

    [HttpGet("summary")]
    [Authorize]
    [ProducesResponseType(typeof(RentInvoiceSummary), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken ct) => Ok(await invoices.GetSummaryAsync(ct));

    /// <summary>Issues any missing invoice for active contracts up to the current month.</summary>
    [HttpPost("generate")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> Generate(CancellationToken ct)
    {
        var created = await invoices.GenerateDueInvoicesAsync(DateTime.Now.Date, ct);
        return Ok(new { created, message = created == 0 ? "All invoices for the current period already exist." : $"{created} invoice(s) generated." });
    }

    /// <summary>Runs the dunning ladder now instead of waiting for the daily cycle.</summary>
    [HttpPost("dunning/run")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> RunDunning(CancellationToken ct)
    {
        var escalated = await invoices.RunDunningAsync(DateTime.Now.Date, ct);
        return Ok(new { escalated, message = escalated == 0 ? "Nothing due for escalation." : $"{escalated} invoice(s) escalated." });
    }

    /// <summary>Records a payment against an invoice. The balance is the upper bound.</summary>
    [HttpPost("{id:int}/pay")]
    [Authorize(Roles = "Administrator")]
    [ProducesResponseType(typeof(RentPaymentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Pay(int id, [FromBody] RentPaymentRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await invoices.ApplyPaymentAsync(id, request.Amount, Actor, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

public sealed record RentPaymentRequest(decimal Amount);
