namespace Application.Interfaces.Deposits;

public sealed record DepositDeductionDto(
    int Id,
    string Category,
    decimal Amount,
    string? Description,
    DateTime CreatedAtUtc,
    string? CreatedBy);

/// <summary>Everything needed to decide what a tenant gets back at move-out.</summary>
public sealed record MoveOutStatementDto(
    int RentalContractId,
    int DepositId,
    string Status,
    decimal AmountHeld,
    decimal OutstandingArrears,
    int UnpaidInvoices,
    IReadOnlyList<DepositDeductionDto> Deductions,
    decimal TotalDeductions,
    decimal Refundable,
    decimal Shortfall,
    DateTime? ContractEndDate,
    DateTime? SettledAtUtc,
    string? Notes);

public sealed record SettleDepositResult(
    int DepositId,
    string Status,
    decimal AppliedToArrears,
    decimal AppliedToDeductions,
    decimal Refund,
    decimal Shortfall,
    int InvoicesSettled);

public sealed record DepositRowDto(
    int Id,
    int RentalContractId,
    int TenantId,
    string? TenantName,
    string? PropertyName,
    decimal AmountHeld,
    decimal DeductedAmount,
    decimal RefundAmount,
    string Status,
    DateTime? ContractEndDate,
    DateTime? SettledAtUtc);

public sealed record DepositPage(IReadOnlyList<DepositRowDto> Items, int Page, int PageSize, int Total);

/// <summary>Holds deposits, records deductions and settles the tenancy at move-out.</summary>
public interface IDepositService
{
    /// <summary>Creates the deposit row for a contract when it does not exist yet, then returns it.</summary>
    Task<MoveOutStatementDto> GetStatementAsync(int rentalContractId, CancellationToken ct = default);

    Task<DepositDeductionDto> AddDeductionAsync(int rentalContractId, string category, decimal amount, string? description, string? actor, CancellationToken ct = default);

    Task RemoveDeductionAsync(int deductionId, string? actor, CancellationToken ct = default);

    /// <summary>
    /// Finalizes the tenancy: arrears are cleared oldest-first from the deposit, deductions are taken
    /// next, and the remainder becomes the refund. The contract is terminated.
    /// </summary>
    Task<SettleDepositResult> SettleAsync(int rentalContractId, string? actor, string? notes, CancellationToken ct = default);

    Task<DepositPage> GetDepositsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
}
