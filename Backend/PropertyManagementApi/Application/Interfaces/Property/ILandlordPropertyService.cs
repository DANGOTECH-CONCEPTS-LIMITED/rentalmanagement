using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Dtos.Property;
using Domain.Entities;
using Microsoft.AspNetCore.Http;


namespace Application.Interfaces.Property
{
    public interface ILandlordPropertyService
    {
        Task<IEnumerable<LandLordProperty>> GetAllPropertiesAsync();
        Task<LandLordProperty> GetPropertyByIdAsync(int id);
        Task<IEnumerable<LandLordProperty>> GetPropertiesByLandLordIdAsync(int landlordId);
        Task AddPropertyAsync(IFormFile image,PropertyDto property);
        Task UpdatePropertyAsync(IFormFile image,LandLordProperty property);
        Task DeletePropertyAsync(int id);
    }
}
