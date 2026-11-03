using Domain.Dtos.Payments;

namespace Application.Interfaces.PaymentService;

public interface IAdminPayoutReconciliation
{
    Task<AdminPayoutReconciliationPage> GetAsync(string? reference, int page, int pageSize, CancellationToken ct);
    Task<FailAndReversePayoutResponse> FailAndReverseAsync(int id, FailAndReversePayoutRequest request, string actor, CancellationToken ct);
    Task<BillPaymentAdminPage> GetBillPaymentsAsync(string? reference, string? status, int page, int pageSize, DateTime? from = null, DateTime? to = null, CancellationToken ct = default);
    Task UpdateBillPaymentStatusAsync(int id, string status, CancellationToken ct);
    Task<int> UpdateBillPaymentStatusesAsync(IReadOnlyCollection<int> ids, string status, CancellationToken ct);
    Task<int> BackfillBillPaymentsAsync(CancellationToken ct);
    Task<bool> TriggerBillPaymentAsync(string transactionId, CancellationToken ct);
}
