using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace Infrastructure.Services.PaymentServices;

public sealed record MobileNetworkRoute(string Name, string[] Prefixes, string NetworkCode);
public sealed record PaymentProviderSettingsResponse(string Provider, bool DangoConfigured, IReadOnlyList<MobileNetworkRoute> MobileNetworks);

public sealed class PaymentProviderSettingsService(AppDbContext db, IConfiguration configuration)
{
    public const string Collecto = "Collecto";
    public const string DangoPayment = "DangoPayment";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static List<MobileNetworkRoute> ReadNetworks(string json)
        => JsonSerializer.Deserialize<List<MobileNetworkRoute>>(json, JsonOptions) ?? [];

    private static bool RoutesConfigured(IReadOnlyList<MobileNetworkRoute> networks)
        => networks.Count > 0 && networks.All(x => !string.IsNullOrWhiteSpace(x.NetworkCode));

    public async Task<PaymentProviderSettingsResponse> GetAsync(CancellationToken ct = default)
    {
        var setting = await db.Set<PaymentProviderSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        var networks = ReadNetworks(setting?.MobileNetworksJson ?? PaymentProviderSetting.DefaultMobileNetworks);
        return new(setting?.Provider ?? Collecto, DangoPaymentClient.IsConfigured(configuration) && RoutesConfigured(networks), networks);
    }

    public async Task<PaymentProviderSettingsResponse> SetAsync(string? provider, CancellationToken ct = default,
        IReadOnlyList<MobileNetworkRoute>? mobileNetworks = null)
    {
        if (provider != Collecto && provider != DangoPayment)
            throw new ArgumentException("Provider must be Collecto or DangoPayment.");
        var setting = await db.Set<PaymentProviderSetting>().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (setting == null)
            throw new InvalidOperationException("Payment provider settings are not initialized. Apply the payment provider migration.");
        var networks = mobileNetworks ?? ReadNetworks(setting.MobileNetworksJson);
        ValidateNetworks(networks);
        var configured = DangoPaymentClient.IsConfigured(configuration) && RoutesConfigured(networks);
        if (provider == DangoPayment && !configured)
            throw new ArgumentException("Configure the Dango server settings and all mobile-network codes before enabling Dango Payment API.");
        setting.Provider = provider;
        setting.MobileNetworksJson = JsonSerializer.Serialize(networks, JsonOptions);
        await db.SaveChangesAsync(ct);
        return new(provider, configured, networks);
    }

    private static void ValidateNetworks(IReadOnlyList<MobileNetworkRoute> networks)
    {
        if (networks.Count is < 1 or > 20)
            throw new ArgumentException("Configure between 1 and 20 mobile networks.");
        var prefixes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var route in networks)
        {
            if (route == null || string.IsNullOrWhiteSpace(route.Name) || route.Name.Length > 50 ||
                route.NetworkCode == null || route.NetworkCode.Length > 50 || route.Prefixes == null || route.Prefixes.Length is < 1 or > 30)
                throw new ArgumentException("Each network needs a name, prefixes and a network code of at most 50 characters.");
            foreach (var prefix in route.Prefixes)
            {
                if (string.IsNullOrWhiteSpace(prefix) || prefix.Length is < 4 or > 11 || !prefix.StartsWith("2567", StringComparison.Ordinal) ||
                    !prefix.All(char.IsAsciiDigit) || !prefixes.Add(prefix))
                    throw new ArgumentException("Use unique international mobile prefixes such as 25677; prefixes must start with 2567.");
            }
        }
        var ordered = prefixes.OrderBy(x => x, StringComparer.Ordinal).ToArray();
        for (var i = 1; i < ordered.Length; i++)
            if (ordered[i].StartsWith(ordered[i - 1], StringComparison.Ordinal))
                throw new ArgumentException("Mobile-network prefixes must not overlap.");
    }

    public async Task<string> ResolveMobileNetworkAsync(string phone)
    {
        var digits = (phone ?? "").Trim().Replace(" ", "").Replace("-", "").TrimStart('+');
        if (digits.StartsWith("0", StringComparison.Ordinal)) digits = "256" + digits[1..];
        if (digits.Length == 9 && digits.StartsWith("7", StringComparison.Ordinal)) digits = "256" + digits;
        if (digits.Length != 12 || !digits.All(char.IsAsciiDigit) || !digits.StartsWith("2567", StringComparison.Ordinal))
            throw new ArgumentException("A valid Ugandan mobile number is required.");
        var networks = (await GetAsync()).MobileNetworks;
        ValidateNetworks(networks);
        var route = networks.SingleOrDefault(x => x.Prefixes.Any(prefix => digits.StartsWith(prefix, StringComparison.Ordinal)));
        if (route == null || string.IsNullOrWhiteSpace(route.NetworkCode))
            throw new ArgumentException("No configured mobile network matches this phone number. Ask an administrator to update the prefix rules.");
        return route.NetworkCode;
    }
}
