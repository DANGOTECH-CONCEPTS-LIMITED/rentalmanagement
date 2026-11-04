using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Property
{
    public interface IMaintenanceService
    {
        Task<IEnumerable<MaintenanceRequest>> GetByLandlordIdAsync(int landlordId, CancellationToken ct = default);
        Task<IEnumerable<MaintenanceRequest>> GetByTenantIdAsync(int tenantId, CancellationToken ct = default);
        Task<MaintenanceRequest> GetByIdAsync(int id, CancellationToken ct = default);
        Task<MaintenanceRequest> CreateAsync(MaintenanceRequestDto dto, CancellationToken ct = default);
        Task<MaintenanceRequest> UpdateAsync(int id, MaintenanceUpdateDto dto, CancellationToken ct = default);
        Task DeleteAsync(int id, CancellationToken ct = default);
    }
}
