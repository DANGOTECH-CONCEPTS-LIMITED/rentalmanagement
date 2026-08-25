using Domain.Dtos.Property.OtherIncome;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Property
{
    public interface IOtherIncomeService
    {
        Task<PropertyOtherIncome> CreateAsync(CreateOtherIncomeDto dto);
        Task<IEnumerable<PropertyOtherIncome>> GetByOwnerIdAsync(int ownerId);
        Task<PropertyOtherIncome> UpdateAsync(UpdateOtherIncomeDto dto);
        Task DeleteAsync(int id, int ownerId);
    }
}
