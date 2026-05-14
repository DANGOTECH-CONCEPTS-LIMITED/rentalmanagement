using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Property
{
    public interface IPropertyUnitService
    {
        Task<PropertyUnit> AddUnitAsync(PropertyUnitDto dto);
        Task<IEnumerable<PropertyUnit>> GetUnitsByPropertyIdAsync(int propertyId);
        Task<IEnumerable<PropertyUnit>> GetUnitsByLandlordIdAsync(int landlordId);
        Task<PropertyUnit> GetUnitByIdAsync(int unitId);
        Task<PropertyUnit> UpdateUnitAsync(int unitId, PropertyUnitDto dto);
        Task DeleteUnitAsync(int unitId);

        Task<PropertyTenant> AssignTenantToUnitAsync(AssignTenantToUnitDto dto);
        Task<PropertyTenant> RemoveTenantFromUnitAsync(int tenantId);
    }
}
