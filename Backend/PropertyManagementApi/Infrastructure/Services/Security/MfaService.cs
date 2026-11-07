using Application.Interfaces.Security;
using Domain.Entities.Security;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Security;

/// <summary>
/// Enrollment, challenge and verification for TOTP second factors. Challenges are single use,
/// expire after five minutes and give up after five wrong codes.
/// </summary>
public sealed class MfaService(AppDbContext db, ITotpService totp) : IMfaService
{
    private static readonly TimeSpan ChallengeLifetime = TimeSpan.FromMinutes(5);
    private const int MaxAttempts = 5;
    private const string Issuer = "Nyumba Yo";

    public async Task<MfaStatus> GetStatusAsync(int userId, CancellationToken ct = default)
    {
        var setting = await db.UserMfaSettings.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId, ct);
        if (setting == null) return new MfaStatus(false, false, null);
        return new MfaStatus(!string.IsNullOrWhiteSpace(setting.Secret), setting.IsEnabled, setting.EnabledAtUtc);
    }

    public async Task<MfaEnrollment> BeginEnrollmentAsync(int userId, string accountName, CancellationToken ct = default)
    {
        var setting = await db.UserMfaSettings.FirstOrDefaultAsync(x => x.UserId == userId, ct);
        if (setting is { IsEnabled: true })
            throw new InvalidOperationException("MFA is already enabled. Disable it before enrolling again.");

        if (setting == null)
        {
            setting = new UserMfaSetting { UserId = userId, CreatedAtUtc = DateTime.UtcNow };
            db.UserMfaSettings.Add(setting);
        }

        // Always rotate the secret on a new enrollment so a previously leaked QR cannot be reused.
        setting.Secret = totp.GenerateSecret();
        setting.IsEnabled = false;
        setting.EnabledAtUtc = null;
        setting.CreatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return new MfaEnrollment(setting.Secret, totp.BuildOtpAuthUri(Issuer, accountName, setting.Secret));
    }

    public async Task EnableAsync(int userId, string code, CancellationToken ct = default)
    {
        var setting = await db.UserMfaSettings.FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("Start the MFA enrollment first.");

        if (setting.IsEnabled)
            throw new InvalidOperationException("MFA is already enabled.");

        if (!totp.Verify(setting.Secret, code, DateTime.UtcNow))
            throw new UnauthorizedAccessException("That code is not valid. Check the authenticator app and try again.");

        setting.IsEnabled = true;
        setting.EnabledAtUtc = DateTime.UtcNow;
        setting.LastUsedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task DisableAsync(int userId, string code, CancellationToken ct = default)
    {
        var setting = await db.UserMfaSettings.FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("MFA is not enabled for this account.");

        if (setting.IsEnabled && !totp.Verify(setting.Secret, code, DateTime.UtcNow))
            throw new UnauthorizedAccessException("That code is not valid.");

        // Clearing the secret means a later enrollment starts from scratch.
        setting.IsEnabled = false;
        setting.Secret = string.Empty;
        setting.EnabledAtUtc = null;
        await db.SaveChangesAsync(ct);
    }

    public async Task<string> CreateChallengeAsync(int userId, string? ipAddress, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        db.MfaChallenges.Add(new MfaChallenge
        {
            Id = id,
            UserId = userId,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.Add(ChallengeLifetime),
            IpAddress = ipAddress
        });
        await db.SaveChangesAsync(ct);
        return id;
    }

    public async Task<MfaVerification> VerifyChallengeAsync(string challengeId, string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(challengeId) || string.IsNullOrWhiteSpace(code))
            return new MfaVerification(false, 0, "A challenge and a code are required.");

        var challenge = await db.MfaChallenges.FirstOrDefaultAsync(x => x.Id == challengeId, ct);
        if (challenge == null)
            return new MfaVerification(false, 0, "This sign-in attempt is no longer valid. Sign in again.");

        if (challenge.ConsumedAtUtc != null)
            return new MfaVerification(false, 0, "This code has already been used. Sign in again.");

        if (challenge.ExpiresAtUtc < DateTime.UtcNow)
            return new MfaVerification(false, 0, "The sign-in attempt expired. Sign in again.");

        if (challenge.Attempts >= MaxAttempts)
            return new MfaVerification(false, 0, "Too many incorrect codes. Sign in again.");

        var setting = await db.UserMfaSettings.FirstOrDefaultAsync(x => x.UserId == challenge.UserId, ct);
        if (setting is not { IsEnabled: true } || string.IsNullOrWhiteSpace(setting.Secret))
            return new MfaVerification(false, 0, "MFA is not enabled for this account.");

        if (!totp.Verify(setting.Secret, code, DateTime.UtcNow))
        {
            challenge.Attempts++;
            await db.SaveChangesAsync(ct);
            var remaining = Math.Max(0, MaxAttempts - challenge.Attempts);
            return new MfaVerification(false, challenge.UserId, $"That code is not valid. {remaining} attempts left.");
        }

        challenge.ConsumedAtUtc = DateTime.UtcNow;
        setting.LastUsedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new MfaVerification(true, challenge.UserId);
    }
}
