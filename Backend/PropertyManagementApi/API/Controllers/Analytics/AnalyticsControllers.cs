using Application.Interfaces.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Analytics;

[ApiController]
[Authorize(Roles = "Administrator")]
public sealed class PaymentHistoryController(IPaymentStatusHistory history) : ControllerBase
{
    /// <summary>
    /// Append-only status trail for bill payments, rent invoices and other payment subjects.
    /// Filter by subject, by business reference, or leave both empty for the global feed.
    /// </summary>
    [HttpGet("/api/PaymentHistory")]
    [ProducesResponseType(typeof(PaymentStatusHistoryPage), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct,
        [FromQuery] string? subjectType = null, [FromQuery] int? subjectId = null,
        [FromQuery] string? reference = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1 || pageSize is < 1 or > 200)
            return BadRequest(new { message = "page must be at least 1 and pageSize between 1 and 200." });

        return Ok(await history.GetAsync(subjectType, subjectId, reference, page, pageSize, ct));
    }
}

[ApiController]
[Authorize(Roles = "Administrator")]
public sealed class AnalyticsController(IArrearsAnalyticsService analytics) : ControllerBase
{
    /// <summary>Arrears aging buckets (not yet due, 1-30, 31-60, 61-90, 90+ days).</summary>
    [HttpGet("/api/Analytics/arrears")]
    [ProducesResponseType(typeof(ArrearsAgingReport), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetArrears(CancellationToken ct)
        => Ok(await analytics.GetAgingAsync(DateTime.Now.Date, ct));

    /// <summary>Monthly billed vs collected totals and the resulting collection rate.</summary>
    [HttpGet("/api/Analytics/collections")]
    [ProducesResponseType(typeof(IReadOnlyList<CollectionsMonth>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCollections(CancellationToken ct, [FromQuery] int months = 6)
        => Ok(await analytics.GetCollectionsAsync(months, DateTime.Now.Date, ct));

    /// <summary>Tenants with the largest outstanding balances, worst first.</summary>
    [HttpGet("/api/Analytics/debtors")]
    [ProducesResponseType(typeof(ArrearsDebtorList), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDebtors(CancellationToken ct, [FromQuery] int limit = 10)
        => Ok(await analytics.GetTopDebtorsAsync(limit, DateTime.Now.Date, ct));
}
