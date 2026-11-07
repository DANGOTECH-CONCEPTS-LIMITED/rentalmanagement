namespace Application.Interfaces.Analytics;

public sealed record PaymentStatusEventDto(
    long Id,
    string SubjectType,
    int SubjectId,
    string? Reference,
    string? FromStatus,
    string? ToStatus,
    string? Reason,
    string? Actor,
    decimal? Amount,
    DateTime OccurredAtUtc);

public sealed record PaymentStatusHistoryPage(IReadOnlyList<PaymentStatusEventDto> Items, int Page, int PageSize, int Total);

/// <summary>Writes and reads the append-only status history.</summary>
public interface IPaymentStatusHistory
{
    /// <summary>
    /// Appends one transition. Never throws: a history row is bookkeeping and must not fail the
    /// payment that produced it.
    /// </summary>
    Task RecordAsync(
        string subjectType,
        int subjectId,
        string? fromStatus,
        string toStatus,
        string? reason = null,
        string? actor = null,
        string? reference = null,
        decimal? amount = null,
        CancellationToken ct = default);

    Task<PaymentStatusHistoryPage> GetAsync(
        string? subjectType, int? subjectId, string? reference, int page, int pageSize, CancellationToken ct = default);
}

public sealed record ArrearsBucket(string Label, int? FromDaysLate, int? ToDaysLate, int Count, decimal Amount);

public sealed record ArrearsAgingReport(
    DateTime GeneratedAtUtc,
    decimal TotalOutstanding,
    decimal OverdueAmount,
    IReadOnlyList<ArrearsBucket> Buckets);

public sealed record CollectionsMonth(string Month, decimal Billed, decimal Collected, int Invoices, int PaidInvoices)
{
    public decimal CollectionRate => Billed <= 0m ? 0m : Math.Round(Collected / Billed * 100m, 1);
}

public sealed record DebtorRow(
    int TenantId,
    string TenantName,
    string? PhoneNumber,
    int Invoices,
    decimal Outstanding,
    int OldestDaysLate);

public sealed record ArrearsDebtorList(IReadOnlyList<DebtorRow> Items, int Total);

/// <summary>Arrears aging, collection performance and the worst debtors — all derived from rent invoices.</summary>
public interface IArrearsAnalyticsService
{
    Task<ArrearsAgingReport> GetAgingAsync(DateTime today, CancellationToken ct = default);
    Task<IReadOnlyList<CollectionsMonth>> GetCollectionsAsync(int months, DateTime today, CancellationToken ct = default);
    Task<ArrearsDebtorList> GetTopDebtorsAsync(int limit, DateTime today, CancellationToken ct = default);
}
