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
}
