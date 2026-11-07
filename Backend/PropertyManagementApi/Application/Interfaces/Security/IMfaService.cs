namespace Application.Interfaces.Security;

public interface ITotpService
{
    /// <summary>Creates a new Base32 secret (160 bits by default).</summary>
    string GenerateSecret();

    /// <summary>Current code for a secret, exposed for enrollment and tests.</summary>
    string ComputeCode(string secret, DateTime utcNow);

    /// <summary>Validates a code allowing one 30 second step of clock skew in either direction.</summary>
    bool Verify(string secret, string code, DateTime utcNow, int allowedSteps = 1);

    /// <summary>otpauth:// URI an authenticator app can scan.</summary>
    string BuildOtpAuthUri(string issuer, string accountName, string secret);
}

public sealed record MfaStatus(bool IsEnrolled, bool IsEnabled, DateTime? EnabledAtUtc);

public sealed record MfaEnrollment(string Secret, string OtpAuthUri);

public sealed record MfaVerification(bool Success, int UserId, string? Error = null);

public interface IMfaService
{
    Task<MfaStatus> GetStatusAsync(int userId, CancellationToken ct = default);

    /// <summary>Generates (or rotates) a pending secret and returns it once for the authenticator app.</summary>
    Task<MfaEnrollment> BeginEnrollmentAsync(int userId, string accountName, CancellationToken ct = default);

    /// <summary>Activates MFA once the user proves the pending secret works.</summary>
    Task EnableAsync(int userId, string code, CancellationToken ct = default);

    Task DisableAsync(int userId, string code, CancellationToken ct = default);

    /// <summary>Creates a challenge after the password check succeeded.</summary>
    Task<string> CreateChallengeAsync(int userId, string? ipAddress, CancellationToken ct = default);

    /// <summary>Consumes a challenge and validates the code. Never throws for a bad code.</summary>
    Task<MfaVerification> VerifyChallengeAsync(string challengeId, string code, CancellationToken ct = default);
}

public interface IJwtTokenFactory
{
    /// <summary>Issues the bearer token that the frontend and USSD flows use.</summary>
    string CreateToken(int userId, string email, string role);
}
