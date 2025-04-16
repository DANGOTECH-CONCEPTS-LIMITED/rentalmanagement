using Domain.Dtos.Tenant;
using Domain.Entities;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.Tenant
{
    public interface ITenantService
    {
        Task CreateTenantAsync(IFormFile passportphoto, IFormFile idfront, IFormFile idback, TenantDto tenantDto);
        Task UpdateTenantAsync(IFormFile passportphoto,IFormFile idfront,IFormFile idback, PropertyTenant tenant);
        Task DeleteTenantAsync(int id);
        Task<PropertyTenant> GetTenantByIdAsync(int id);
        Task<IEnumerable<PropertyTenant>> GetAllTenantsAsync();
        Task<IEnumerable<PropertyTenant>> GetTenantsByPropertyIdAsync(int propertyId);
    }
}
