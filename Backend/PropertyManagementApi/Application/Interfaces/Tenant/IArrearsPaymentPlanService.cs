using Domain.Dtos.Tenant;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Tenant
{
    public interface IArrearsPaymentPlanService
    {
        Task<IEnumerable<ArrearsPaymentPlan>> GetByTenantIdAsync(int tenantId, CancellationToken ct = default);
        Task<IEnumerable<ArrearsPaymentPlan>> GetByLandlordIdAsync(int landlordId, CancellationToken ct = default);
        Task<ArrearsPaymentPlan> CreateAsync(ArrearsPaymentPlanDto dto, CancellationToken ct = default);
        Task<ArrearsPaymentPlan> CancelAsync(int id, CancellationToken ct = default);
    }
}
