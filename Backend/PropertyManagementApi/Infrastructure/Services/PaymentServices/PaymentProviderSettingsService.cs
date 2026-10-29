using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace Infrastructure.Services.PaymentServices;

public sealed record MobileNetworkRoute(string Name, string[] Prefixes, string NetworkCode);
public sealed record PaymentProviderSettingsResponse(string Provider, bool DangoConfigured, IReadOnlyList<MobileNetworkRoute> MobileNetworks);
public sealed record DangoBillerSettingsResponse(string ServiceId, string Transtype, string? ProductCode, string? Tin,
    string? Uedlid, string? ProcessId, string? Location, string? Narrative, bool AutoBillPaymentsEnabled, bool Configured);
public sealed record DangoBillerSettingsRequest(string? ServiceId, string? Transtype, string? ProductCode, string? Tin,
    string? Uedlid, string? ProcessId, string? Location, string? Narrative, bool AutoBillPaymentsEnabled);

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

    public async Task<DangoBillerSettingsResponse> GetBillerAsync(CancellationToken ct = default)
    {
        var biller = await db.Set<DangoBillerSetting>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, ct);
        return ToResponse(biller);
    }

    public async Task<DangoBillerSettingsResponse> SetBillerAsync(DangoBillerSettingsRequest request, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var serviceId = request.ServiceId?.Trim() ?? string.Empty;
        var transtype = request.Transtype?.Trim() ?? string.Empty;
        if (serviceId.Length is < 1 or > 64)
            throw new ArgumentException("Dango biller ServiceId is required and must not exceed 64 characters.");
        if (transtype.Length is < 1 or > 32)
            throw new ArgumentException("Dango biller Transtype is required and must not exceed 32 characters.");
        foreach (var (name, value, max) in new[]
        {
            ("ProductCode", request.ProductCode, 64), ("Tin", request.Tin, 32), ("Uedlid", request.Uedlid, 32),
            ("ProcessId", request.ProcessId, 32), ("Location", request.Location, 128), ("Narrative", request.Narrative, 128)
        })
        {
            if (value is { Length: > 0 } && value.Trim().Length > max)
                throw new ArgumentException($"Dango biller {name} must not exceed {max} characters.");
        }
        var setting = await db.Set<DangoBillerSetting>().SingleOrDefaultAsync(x => x.Id == 1, ct);
        if (setting == null)
            throw new InvalidOperationException("Dango biller settings are not initialized. Apply the Dango bill payment migration.");
        setting.ServiceId = serviceId;
        setting.Transtype = transtype;
        setting.ProductCode = Trim(request.ProductCode);
        setting.Tin = Trim(request.Tin);
        setting.Uedlid = Trim(request.Uedlid);
        setting.ProcessId = Trim(request.ProcessId);
        setting.Location = Trim(request.Location);
        setting.Narrative = Trim(request.Narrative);
        setting.AutoBillPaymentsEnabled = request.AutoBillPaymentsEnabled;
        await db.SaveChangesAsync(ct);
        return ToResponse(setting);
    }

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static bool BillerConfigured(DangoBillerSetting? biller)
        => biller != null && !string.IsNullOrWhiteSpace(biller.ServiceId) && !string.IsNullOrWhiteSpace(biller.Transtype);
    private static DangoBillerSettingsResponse ToResponse(DangoBillerSetting? biller)
        => new(biller?.ServiceId ?? string.Empty, biller?.Transtype ?? string.Empty, biller?.ProductCode, biller?.Tin,
            biller?.Uedlid, biller?.ProcessId, biller?.Location, biller?.Narrative,
            biller?.AutoBillPaymentsEnabled ?? false, BillerConfigured(biller));

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
