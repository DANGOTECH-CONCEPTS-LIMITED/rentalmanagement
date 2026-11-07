using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers.UserControllers;

/// <summary>
/// TOTP second factor for privileged accounts: enrollment, activation, disabling, and the
/// challenge exchange that a password login turns into a token.
/// </summary>
public partial class UserController
{
    public sealed record MfaCodeRequest(string Code);
    public sealed record MfaVerifyRequest(string ChallengeId, string Code);

    [HttpGet("/Mfa/status")]
    [Authorize]
    public async Task<IActionResult> GetMfaStatus(CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        var status = await _mfaService.GetStatusAsync(userId.Value, ct);
        return Ok(new { isEnrolled = status.IsEnrolled, isEnabled = status.IsEnabled, enabledAtUtc = status.EnabledAtUtc });
    }

    /// <summary>Generates a secret and returns the otpauth URI to show as a QR code / manual key.</summary>
    [HttpPost("/Mfa/enroll")]
    [Authorize]
    public async Task<IActionResult> BeginMfaEnrollment(CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        try
        {
            var user = await _db.Users.AsNoTracking().FirstAsync(x => x.Id == userId.Value, ct);
            var enrollment = await _mfaService.BeginEnrollmentAsync(userId.Value, user.Email, ct);
            return Ok(new { secret = enrollment.Secret, otpAuthUri = enrollment.OtpAuthUri });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("/Mfa/enable")]
    [Authorize]
    public async Task<IActionResult> EnableMfa([FromBody] MfaCodeRequest request, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        try
        {
            await _mfaService.EnableAsync(userId.Value, request.Code ?? string.Empty, ct);
            return Ok(new { message = "Multi-factor authentication is now enabled for this account." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("/Mfa/disable")]
    [Authorize]
    public async Task<IActionResult> DisableMfa([FromBody] MfaCodeRequest request, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(ct);
        if (userId == null) return Unauthorized();

        try
        {
            await _mfaService.DisableAsync(userId.Value, request.Code ?? string.Empty, ct);
            return Ok(new { message = "Multi-factor authentication has been disabled." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Exchanges the challenge from /AuthenticateUser plus a TOTP code for a bearer token.
    /// Rate limited with the same policy as the password endpoint.
    /// </summary>
    [HttpPost("/VerifyMfa")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyMfa([FromBody] MfaVerifyRequest request, CancellationToken ct)
    {
        var verification = await _mfaService.VerifyChallengeAsync(
            request.ChallengeId ?? string.Empty, request.Code ?? string.Empty, ct);
        if (!verification.Success)
            return BadRequest(new { message = verification.Error ?? "Verification failed." });

        var user = await _db.Users.AsNoTracking()
            .Include(u => u.SystemRole)
            .FirstOrDefaultAsync(u => u.Id == verification.UserId, ct);
        if (user == null)
            return BadRequest(new { message = "The account no longer exists." });

        user.Token = _tokens.CreateToken(user.Id, user.Email, user.SystemRole?.Name ?? "User");
        return Ok(user);
    }

    private async Task<int?> ResolveUserIdAsync(CancellationToken ct)
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(value, out var id)) return id;

        // Tokens issued before the id claim existed fall back to the email claim.
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirst("email")?.Value;
        if (string.IsNullOrWhiteSpace(email)) return null;
        return await _db.Users.AsNoTracking()
            .Where(x => x.Email == email)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(ct);
    }
}
