using System.ComponentModel.DataAnnotations;

namespace Domain.Entities.PropertyMgt;

public class PaymentProviderSetting
{
    public int Id { get; set; } = 1;
    [MaxLength(32)]
    public string Provider { get; set; } = "Collecto";
    public const string DefaultMobileNetworks = "[{\"name\":\"MTN\",\"prefixes\":[\"25676\",\"25677\",\"25678\"],\"networkCode\":\"\"},{\"name\":\"Airtel\",\"prefixes\":[\"25670\",\"25674\",\"25675\"],\"networkCode\":\"\"}]";
    public string MobileNetworksJson { get; set; } = DefaultMobileNetworks;
}

public class PaymentGatewaySubmission
{
    [MaxLength(200)]
    public string Id { get; set; } = string.Empty;
    [MaxLength(32)]
    public string Provider { get; set; } = "Collecto";
    [MaxLength(128)]
    public string Reference { get; set; } = string.Empty;
    [MaxLength(32)]
    public string Operation { get; set; } = string.Empty;
    [MaxLength(64)]
    public string RequestHash { get; set; } = string.Empty;
    public string? Response { get; set; }
    [MaxLength(128)]
    public string? ProviderTransactionId { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
}
