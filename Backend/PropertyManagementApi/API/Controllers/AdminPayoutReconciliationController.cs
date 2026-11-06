using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[ApiController]
[Authorize(Roles = "Administrator")]
[Route("api/AdminPayoutReconciliation")]
public sealed class AdminPayoutReconciliationController(IAdminPayoutReconciliation service, BillPaymentProcessingService billPayments) : ControllerBase
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

    /// <summary>Lists automatic NWSC bill payments, filtered by reference/account/meter or status.</summary>
    [HttpGet("/api/AdminBillPayments")]
    [ProducesResponseType(typeof(BillPaymentAdminPage), StatusCodes.Status200OK)]
    public async Task<ActionResult<BillPaymentAdminPage>> GetBillPayments(CancellationToken ct,
        [FromQuery] string? reference = null, [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try { return Ok(await service.GetBillPaymentsAsync(reference, status, page, pageSize, from, to, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Manually runs one bill payment cycle (submits pending bills and confirms submitted ones).</summary>
    [HttpPost("/api/AdminBillPayments/process")]
    public async Task<IActionResult> ProcessBillPayments(CancellationToken ct)
    {
        try
        {
            var processed = await billPayments.ProcessAsync(ct);
            return Ok(new { processed });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public sealed class UpdateBillPaymentStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>Manually updates a bill payment instruction's status.</summary>
    [HttpPut("/api/AdminBillPayments/{id:int}/status")]
    public async Task<IActionResult> UpdateBillPaymentStatus(int id, [FromBody] UpdateBillPaymentStatusRequest request, CancellationToken ct)
    {
        try
        {
            await service.UpdateBillPaymentStatusAsync(id, request.Status, ct);
            return Ok(new { id, status = (request.Status ?? string.Empty).Trim().ToUpperInvariant() });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    public sealed class UpdateBillPaymentStatusesRequest
    {
        public List<int> Ids { get; set; } = [];
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>Updates the status of many bill payment instructions at once.</summary>
    [HttpPut("/api/AdminBillPayments/status")]
    public async Task<IActionResult> UpdateBillPaymentStatuses([FromBody] UpdateBillPaymentStatusesRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateBillPaymentStatusesAsync(request.Ids ?? [], request.Status, ct);
            return Ok(new { updated });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Creates bill payment instructions for credited utility payments that predate the feature.</summary>
    [HttpPost("/api/AdminBillPayments/backfill")]
    public async Task<IActionResult> BackfillBillPayments(CancellationToken ct)
    {
        try
        {
            var created = await service.BackfillBillPaymentsAsync(ct);
            return Ok(new { created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public sealed class TriggerBillPaymentRequest
    {
        public string TransactionId { get; set; } = string.Empty;
    }

    /// <summary>Creates a bill payment instruction for a credited utility collection; replaces a provider-rejected attempt with a new reference.</summary>
    [HttpPost("/api/AdminBillPayments/trigger")]
    public async Task<IActionResult> TriggerBillPayment([FromBody] TriggerBillPaymentRequest request, CancellationToken ct)
    {
        var actor = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(actor)) return Unauthorized();
        try
        {
            return Ok(await service.TriggerBillPaymentAsync(request.TransactionId, actor, ct));
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

    public sealed class ResubmitBillPaymentRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    /// <summary>Requeues a bill payment the provider was never asked about. Rows with a recorded submission attempt are refused.</summary>
    [HttpPost("/api/AdminBillPayments/{id:int}/resubmit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ResubmitBillPayment(int id, [FromBody] ResubmitBillPaymentRequest request, CancellationToken ct)
    {
        var actor = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(actor)) return Unauthorized();
        try
        {
            var reference = await service.ResubmitBillPaymentAsync(id, request.Reason, actor, ct);
            return Ok(new { id, reference, status = BillPaymentInstructionStatus.PendingSubmission });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
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
