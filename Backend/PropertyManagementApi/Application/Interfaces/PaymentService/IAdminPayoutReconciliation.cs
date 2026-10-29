using Domain.Dtos.Payments;

namespace Application.Interfaces.PaymentService;

public interface IAdminPayoutReconciliation
{
    Task<AdminPayoutReconciliationPage> GetAsync(string? reference, int page, int pageSize, CancellationToken ct);
    Task<FailAndReversePayoutResponse> FailAndReverseAsync(int id, FailAndReversePayoutRequest request, string actor, CancellationToken ct);
    Task<BillPaymentAdminPage> GetBillPaymentsAsync(string? reference, string? status, int page, int pageSize, CancellationToken ct);
}
