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
    [MaxLength(64)]
    public string? ProviderReferenceNumber { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
}

public class DangoPaymentReferenceAllocation
{
    public DateTime DateUtc { get; set; }
    public long Sequence { get; set; }
}

// Biller values are provisioned by Dango/Stanbic; administrators enter them in System Settings.
public class DangoBillerSetting
{
    public int Id { get; set; } = 1;
    [MaxLength(64)] public string ServiceId { get; set; } = string.Empty;
    [MaxLength(32)] public string Transtype { get; set; } = string.Empty;
    [MaxLength(64)] public string? ProductCode { get; set; }
    [MaxLength(32)] public string? Tin { get; set; }
    [MaxLength(32)] public string? Uedlid { get; set; }
    [MaxLength(32)] public string? ProcessId { get; set; }
    [MaxLength(128)] public string? Location { get; set; }
    [MaxLength(128)] public string? Narrative { get; set; }
    public bool AutoBillPaymentsEnabled { get; set; }
}

public static class BillPaymentInstructionStatus
{
    public const string PendingSubmission = "PENDING_SUBMISSION";
    public const string PendingConfirmation = "PENDING_CONFIRMATION";
    public const string Successful = "SUCCESSFUL";
    public const string PaidUndebited = "PAID_UNDEBITED";
    public const string Failed = "FAILED";
}

// One automatic NWSC bill payment per credited utility collection (idempotent by UtilityPaymentId).
public class BillPaymentInstruction
{
    public int Id { get; set; }
    public int UtilityPaymentId { get; set; }
    [MaxLength(64)] public string? MeterNumber { get; set; }
    [MaxLength(64)] public string NwscAccount { get; set; } = string.Empty;
    public int UtilityOwnerId { get; set; }
    public decimal Amount { get; set; }
    [MaxLength(32)] public string Status { get; set; } = BillPaymentInstructionStatus.PendingSubmission;
    [MaxLength(64)] public string RequestReference { get; set; } = string.Empty;
    [MaxLength(64)] public string? ProviderReference { get; set; }
    public string? Response { get; set; }
    [MaxLength(256)] public string? Reason { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? LastCheckedAtUtc { get; set; }
    public DateTime? ConfirmedAtUtc { get; set; }
    public DateTime? WalletDebitedAtUtc { get; set; }
    public int SubmissionAttempts { get; set; }
}
