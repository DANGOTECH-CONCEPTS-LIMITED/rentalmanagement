namespace Domain.Entities.Security;

/// <summary>
/// A user's TOTP secret. A row with <see cref="IsEnabled"/> = false is an enrollment in progress:
/// the secret has been generated but the user has not yet proved they can produce a code.
/// </summary>
public class UserMfaSetting
{
    public int Id { get; set; }
    public int UserId { get; set; }
    /// <summary>Base32 secret. Never returned to a client after enrollment completes.</summary>
    public string Secret { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? EnabledAtUtc { get; set; }
    public DateTime? LastUsedAtUtc { get; set; }
}

/// <summary>
/// Short-lived, single-use proof that a password check passed. The client exchanges the challenge
/// id plus a TOTP code for a token, so a stolen password alone is no longer enough.
/// </summary>
public class MfaChallenge
{
    public string Id { get; set; } = string.Empty;
    public int UserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? ConsumedAtUtc { get; set; }
    public int Attempts { get; set; }
    public string? IpAddress { get; set; }
}
