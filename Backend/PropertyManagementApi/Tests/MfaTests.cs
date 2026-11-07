using Application.Interfaces.Security;
using Domain.Dtos.User;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.Security;
using Infrastructure.Services.UserServices;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Tests;

public class MfaTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=mfa-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private readonly TotpService _totp = new();
    private AppDbContext _db = null!;
    private MfaService _service = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        // SystemRoles are seeded by the model; role 1 is the administrator role.
        _db.Users.Add(new User
        {
            Id = 101, FullName = "Admin", Email = "admin@test", PhoneNumber = "256770000001",
            SystemRoleId = 1, Password = "x"
        });
        await _db.SaveChangesAsync();
        _service = new MfaService(_db, _totp);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private string CurrentCode(string secret) => _totp.ComputeCode(secret, DateTime.UtcNow);

    [Fact]
    public void TotpMatchesTheRfc6238Sha1Vector()
    {
        // RFC 6238 test key "12345678901234567890" in Base32.
        const string secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

        Assert.Equal("287082", _totp.ComputeCode(secret, DateTime.UnixEpoch.AddSeconds(59)));
        Assert.Equal("081804", _totp.ComputeCode(secret, DateTime.UnixEpoch.AddSeconds(1111111109)));
        Assert.Equal("050471", _totp.ComputeCode(secret, DateTime.UnixEpoch.AddSeconds(1111111111)));
    }

    [Fact]
    public void TotpAcceptsOneStepOfClockSkew()
    {
        var secret = _totp.GenerateSecret();
        var now = new DateTime(2026, 11, 7, 12, 0, 0, DateTimeKind.Utc);
        var previousStepCode = _totp.ComputeCode(secret, now.AddSeconds(-30));

        Assert.True(_totp.Verify(secret, previousStepCode, now));
        Assert.False(_totp.Verify(secret, previousStepCode, now, allowedSteps: 0));
        Assert.False(_totp.Verify(secret, "000000", now));
        Assert.False(_totp.Verify(secret, "abc", now));
    }

    [Fact]
    public async Task EnrollmentRequiresAValidCodeBeforeItActivates()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");

        var pending = await _service.GetStatusAsync(101);
        Assert.True(pending.IsEnrolled);
        Assert.False(pending.IsEnabled);
        Assert.Contains("otpauth://totp/", enrollment.OtpAuthUri);
        Assert.Contains(enrollment.Secret, enrollment.OtpAuthUri);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.EnableAsync(101, "000000"));

        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));

        var active = await _service.GetStatusAsync(101);
        Assert.True(active.IsEnabled);
        Assert.NotNull(active.EnabledAtUtc);
    }

    [Fact]
    public async Task ChallengeExchangesOnceAndNeverReusesACode()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");
        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));

        var challengeId = await _service.CreateChallengeAsync(101, "127.0.0.1");
        var first = await _service.VerifyChallengeAsync(challengeId, CurrentCode(enrollment.Secret));

        Assert.True(first.Success);
        Assert.Equal(101, first.UserId);

        var replay = await _service.VerifyChallengeAsync(challengeId, CurrentCode(enrollment.Secret));
        Assert.False(replay.Success);
        Assert.Contains("already been used", replay.Error);
    }

    [Fact]
    public async Task WrongCodesAreCountedAndLockedAfterFiveAttempts()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");
        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));
        var challengeId = await _service.CreateChallengeAsync(101, null);

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            var result = await _service.VerifyChallengeAsync(challengeId, "000000");
            Assert.False(result.Success);
        }

        // Even the correct code is refused once the challenge is burned.
        var locked = await _service.VerifyChallengeAsync(challengeId, CurrentCode(enrollment.Secret));
        Assert.False(locked.Success);
        Assert.Contains("Too many", locked.Error);
    }

    [Fact]
    public async Task ExpiredChallengeIsRejected()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");
        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));
        var challengeId = await _service.CreateChallengeAsync(101, null);

        var challenge = await _db.MfaChallenges.SingleAsync(x => x.Id == challengeId);
        challenge.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await _db.SaveChangesAsync();

        var result = await _service.VerifyChallengeAsync(challengeId, CurrentCode(enrollment.Secret));
        Assert.False(result.Success);
        Assert.Contains("expired", result.Error);
    }

    [Fact]
    public async Task DisablingClearsTheSecretSoReEnrollmentStartsFresh()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");
        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));

        await _service.DisableAsync(101, CurrentCode(enrollment.Secret));

        var status = await _service.GetStatusAsync(101);
        Assert.False(status.IsEnabled);
        Assert.False(status.IsEnrolled);

        var again = await _service.BeginEnrollmentAsync(101, "admin@test");
        Assert.NotEqual(enrollment.Secret, again.Secret);
    }

    [Fact]
    public async Task ChallengeForAnAccountWithoutMfaFails()
    {
        var challengeId = await _service.CreateChallengeAsync(101, null);

        var result = await _service.VerifyChallengeAsync(challengeId, "123456");

        Assert.False(result.Success);
        Assert.Contains("not enabled", result.Error);
    }

    [Fact]
    public async Task PasswordLoginForAnEnrolledAccountReturnsAChallengeInsteadOfAToken()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");
        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));
        var hasher = await SetPasswordAsync("Secret123!");

        var login = await LoginService(hasher).AuthenticateUser(new AuthenticateDto { UserName = "admin@test", Password = "Secret123!" });

        Assert.True(login.RequiresMfa);
        Assert.False(string.IsNullOrWhiteSpace(login.MfaChallengeId));
        Assert.True(string.IsNullOrEmpty(login.Token));

        // The challenge is what turns the password step into a real session.
        var verified = await _service.VerifyChallengeAsync(login.MfaChallengeId!, CurrentCode(enrollment.Secret));
        Assert.True(verified.Success);
    }

    [Fact]
    public async Task PasswordLoginWithoutMfaStillGetsAToken()
    {
        var hasher = await SetPasswordAsync("Secret123!");

        var login = await LoginService(hasher).AuthenticateUser(new AuthenticateDto { UserName = "admin@test", Password = "Secret123!" });

        Assert.False(login.RequiresMfa);
        Assert.False(string.IsNullOrEmpty(login.Token));
    }

    [Fact]
    public async Task WrongPasswordNeverReachesTheSecondFactor()
    {
        var enrollment = await _service.BeginEnrollmentAsync(101, "admin@test");
        await _service.EnableAsync(101, CurrentCode(enrollment.Secret));
        var hasher = await SetPasswordAsync("Secret123!");

        await Assert.ThrowsAsync<Exception>(() =>
            LoginService(hasher).AuthenticateUser(new AuthenticateDto { UserName = "admin@test", Password = "wrong" }));

        Assert.Empty(await _db.MfaChallenges.ToListAsync());
    }

    private async Task<Microsoft.AspNetCore.Identity.IPasswordHasher<User>> SetPasswordAsync(string password)
    {
        var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<User>();
        var user = await _db.Users.SingleAsync(x => x.Id == 101);
        user.Password = hasher.HashPassword(user, password);
        await _db.SaveChangesAsync();
        return hasher;
    }

    // EmailService and ISettings are not touched on the authentication path.
    private UserService LoginService(Microsoft.AspNetCore.Identity.IPasswordHasher<User> hasher)
    {
        var configuration = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = new string('k', 64),
                ["JwtSettings:Issuer"] = "test-issuer",
                ["JwtSettings:Audience"] = "test-audience",
                ["JwtSettings:ExpiryMinutes"] = "60"
            }).Build();

        return new UserService(_db, hasher, null!, null!, configuration,
            new JwtTokenFactory(configuration), _service);
    }
}
