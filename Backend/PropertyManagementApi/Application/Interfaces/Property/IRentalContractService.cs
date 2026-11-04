using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Property
{
    public interface IRentalContractService
    {
        Task<IEnumerable<RentalContract>> GetByLandlordIdAsync(int landlordId, CancellationToken ct = default);
        Task<RentalContract> GetByIdAsync(int id, CancellationToken ct = default);
        Task<RentalContract> CreateAsync(RentalContractDto dto, CancellationToken ct = default);
        Task<RentalContract> RenewAsync(int id, DateTime newEndDate, CancellationToken ct = default);
        Task<RentalContract> TerminateAsync(int id, string reason, CancellationToken ct = default);
        Task DeleteAsync(int id, CancellationToken ct = default);
    }
}
