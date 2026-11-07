using System.Security.Cryptography;
using System.Text;
using Application.Interfaces.Security;

namespace Infrastructure.Services.Security;

/// <summary>
/// RFC 6238 TOTP (SHA-1, 6 digits, 30 second steps) with RFC 4648 Base32 secrets, implemented
/// locally so the API needs no extra dependency to support authenticator apps.
/// </summary>
public sealed class TotpService : ITotpService
{
    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private const int StepSeconds = 30;
    private const int Digits = 6;

    public string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(20);
        return ToBase32(bytes);
    }

    public string ComputeCode(string secret, DateTime utcNow)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException("A secret is required.", nameof(secret));

        var counter = (long)(utcNow.ToUniversalTime() - DateTime.UnixEpoch).TotalSeconds / StepSeconds;
        return ComputeCodeForCounter(DecodeBase32(secret), counter);
    }

    public bool Verify(string secret, string code, DateTime utcNow, int allowedSteps = 1)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(code)) return false;

        var normalised = code.Replace(" ", string.Empty, StringComparison.Ordinal);
        if (normalised.Length != Digits || !normalised.All(char.IsDigit)) return false;

        var key = DecodeBase32(secret);
        var counter = (long)(utcNow.ToUniversalTime() - DateTime.UnixEpoch).TotalSeconds / StepSeconds;

        for (var offset = -allowedSteps; offset <= allowedSteps; offset++)
        {
            var candidate = ComputeCodeForCounter(key, counter + offset);
            if (CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(candidate), Encoding.ASCII.GetBytes(normalised)))
            {
                return true;
            }
        }

        return false;
    }

    public string BuildOtpAuthUri(string issuer, string accountName, string secret)
    {
        var label = Uri.EscapeDataString($"{issuer}:{accountName}");
        var parameters = $"secret={secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits={Digits}&period={StepSeconds}";
        return $"otpauth://totp/{label}?{parameters}";
    }

    private static string ComputeCodeForCounter(byte[] key, long counter)
    {
        Span<byte> counterBytes = stackalloc byte[8];
        for (var i = 7; i >= 0; i--)
        {
            counterBytes[i] = (byte)(counter & 0xFF);
            counter >>= 8;
        }

        Span<byte> hash = stackalloc byte[20];
        HMACSHA1.HashData(key, counterBytes, hash);

        var offset = hash[19] & 0x0F;
        var binary = ((hash[offset] & 0x7F) << 24)
                     | ((hash[offset + 1] & 0xFF) << 16)
                     | ((hash[offset + 2] & 0xFF) << 8)
                     | (hash[offset + 3] & 0xFF);

        return (binary % (int)Math.Pow(10, Digits)).ToString(new string('0', Digits));
    }

    private static string ToBase32(byte[] data)
    {
        var output = new StringBuilder((data.Length * 8 + 4) / 5);
        int buffer = 0, bitsLeft = 0;
        foreach (var value in data)
        {
            buffer = (buffer << 8) | value;
            bitsLeft += 8;
            while (bitsLeft >= 5)
            {
                output.Append(Base32Alphabet[(buffer >> (bitsLeft - 5)) & 0x1F]);
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0)
            output.Append(Base32Alphabet[(buffer << (5 - bitsLeft)) & 0x1F]);
        return output.ToString();
    }

    private static byte[] DecodeBase32(string secret)
    {
        var cleaned = secret.Replace("=", string.Empty, StringComparison.Ordinal)
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .ToUpperInvariant();

        var output = new List<byte>(cleaned.Length * 5 / 8);
        int buffer = 0, bitsLeft = 0;
        foreach (var character in cleaned)
        {
            var index = Base32Alphabet.IndexOf(character);
            if (index < 0) throw new FormatException("The TOTP secret is not valid Base32.");
            buffer = (buffer << 5) | index;
            bitsLeft += 5;
            if (bitsLeft >= 8)
            {
                output.Add((byte)((buffer >> (bitsLeft - 8)) & 0xFF));
                bitsLeft -= 8;
            }
        }
        return output.ToArray();
    }
}
