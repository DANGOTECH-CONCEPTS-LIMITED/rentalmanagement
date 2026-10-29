using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/PaymentProviderSettings")]
[Authorize(Roles = "Administrator")]
public sealed class PaymentProviderSettingsController(PaymentProviderSettingsService settings) : ControllerBase
{
    public sealed record UpdateRequest(string? Provider, List<MobileNetworkRoute>? MobileNetworks = null);

    [HttpGet]
    public async Task<ActionResult<PaymentProviderSettingsResponse>> Get(CancellationToken ct)
        => Ok(await settings.GetAsync(ct));

    [HttpPut]
    public async Task<ActionResult<PaymentProviderSettingsResponse>> Put([FromBody] UpdateRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await settings.SetAsync(request.Provider, ct, request.MobileNetworks));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Gets the provisioned NWSC biller values used for automatic bill payments.</summary>
    [HttpGet("biller")]
    public async Task<ActionResult<DangoBillerSettingsResponse>> GetBiller(CancellationToken ct)
        => Ok(await settings.GetBillerAsync(ct));

    /// <summary>Saves NWSC biller values. Automatic bill payments require the explicit enable switch.</summary>
    [HttpPut("biller")]
    public async Task<ActionResult<DangoBillerSettingsResponse>> PutBiller([FromBody] DangoBillerSettingsRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await settings.SetBillerAsync(request, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
