namespace Application.Interfaces.Billing;

public sealed record RentInvoiceDto(
    int Id,
    string InvoiceNumber,
    string Period,
    int RentalContractId,
    int TenantId,
    string? TenantName,
    string? TenantEmail,
    string? TenantPhone,
    string? PropertyName,
    decimal Amount,
    decimal AmountPaid,
    decimal Balance,
    string Status,
    DateTime DueDate,
    int DunningLevel,
    DateTime? LastDunningAtUtc);

public sealed record RentInvoicePage(IReadOnlyList<RentInvoiceDto> Items, int Page, int PageSize, int Total);

public sealed record RentPaymentResult(int InvoiceId, decimal Applied, string Status, decimal Balance);

public sealed record RentInvoiceSummary(
    decimal TotalBilled,
    decimal TotalPaid,
    decimal Outstanding,
    decimal Overdue,
    int OpenCount,
    int PartiallyPaidCount,
    int PaidCount,
    int OverdueCount);

/// <summary>Issues monthly rent invoices from active contracts and escalates them when unpaid.</summary>
public interface IRentInvoicingService
{
    /// <summary>Creates any missing invoice for active contracts up to the current month. Returns how many were created.</summary>
    Task<int> GenerateDueInvoicesAsync(DateTime today, CancellationToken ct = default);

    /// <summary>Escalates overdue invoices one dunning step at a time and notifies the tenant.</summary>
    Task<int> RunDunningAsync(DateTime today, CancellationToken ct = default);

    Task<RentInvoicePage> GetInvoicesAsync(string? status, int? tenantId, int page, int pageSize, CancellationToken ct = default);

    /// <summary>Applies a payment to one invoice. Overpayment beyond the balance is not accepted.</summary>
    Task<RentPaymentResult> ApplyPaymentAsync(int invoiceId, decimal amount, string? actor, CancellationToken ct = default);

    Task<RentInvoiceSummary> GetSummaryAsync(CancellationToken ct = default);
}
