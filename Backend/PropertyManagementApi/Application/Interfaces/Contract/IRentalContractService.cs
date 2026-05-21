using Domain.Dtos.Contract;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Contract
{
    public interface IRentalContractService
    {
        Task<IEnumerable<RentalContract>> GetAllContractsAsync();
        Task<IEnumerable<RentalContract>> GetContractsByOwnerIdAsync(int ownerId);
        Task<IEnumerable<RentalContract>> GetContractsByTenantIdAsync(int tenantId);
        Task<RentalContract> GetContractByIdAsync(int id);
        Task<RentalContract> CreateContractAsync(CreateContractDto dto);
        Task<RentalContract> UpdateContractAsync(UpdateContractDto dto);
        Task<RentalContract> AcknowledgeContractAsync(int id);
        Task DeleteContractAsync(int id);
    }
}
