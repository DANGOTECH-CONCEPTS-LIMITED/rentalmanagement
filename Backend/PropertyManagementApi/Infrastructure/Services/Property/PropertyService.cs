using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces.Property;
using Application.Interfaces.Settings;
using Domain.Dtos.Property;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Property
{
    public class PropertyService : ILandlordPropertyService
    {
        public readonly AppDbContext _context;
        public readonly ISettings _fileService;

        public PropertyService(AppDbContext context, ISettings settings)
        {
            _context = context;
            _fileService = settings;
        }

        public async Task AddPropertyAsync(IFormFile image, PropertyDto property)
        {
            if (property == null)
                throw new Exception(nameof(property));

            // Get the role for "Landlord"
            var landlordRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Name == "Landlord");

            if (landlordRole == null)
                throw new Exception("Landlord role not found.");

            // Check if the owner exists and holds the Landlord role
            var existingOwner = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == property.OwnerId && u.SystemRoleId == landlordRole.Id);

            if (existingOwner == null)
                throw new Exception("Owner with Landlord role not found.");

            // Check if the image is not null
            if (image == null)
                throw new Exception("Image is required.");

            // Save the image to the server and get the URL
            var imageUrl = await _fileService.SaveFileAndReturnPathAsync(image);

            // Create the new property record
            var newProperty = new LandLordProperty
            {
                Name = property.Name,
                Type = property.Type,
                Address = property.Address,
                District = property.District,
                Region = property.Region,
                Zipcode = property.Zipcode,
                Description = property.Description,
                Price = property.Price,
                NumberOfRooms = property.NumberOfRooms,
                ImageUrl = imageUrl,
                OwnerId = property.OwnerId
            };
            // Add the new property to the database context and save changes
            await _context.LandLordProperties.AddAsync(newProperty);
            await _context.SaveChangesAsync();
        }

        public async Task<LandLordProperty> GetPropertyByIdAsync(int id)
        {
            var property = await _context.LandLordProperties
                .Include(p => p.Owner)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (property == null)
                throw new Exception("Property not found.");
            return property;
        }

        public async Task<IEnumerable<LandLordProperty>> GetPropertiesByLandLordIdAsync(int landlordId)
        {
            var properties = await _context.LandLordProperties
                .Where(p => p.OwnerId == landlordId)
                .Include(p => p.Owner)
                .ToListAsync();

            if (!properties.Any())
                throw new Exception("No properties found for this landlord.");

            return properties;
        }

        public async Task<IEnumerable<LandLordProperty>> GetAllPropertiesAsync()
        {
            var properties = await _context.LandLordProperties
                .Include(p => p.Owner)
                .ToListAsync();
            if (!properties.Any())
                throw new Exception("No properties found.");
            return properties;
        }

        public async Task DeletePropertyAsync(int id)
        {
            var property = await _context.LandLordProperties
                .FirstOrDefaultAsync(p => p.Id == id);
            if (property == null)
                throw new Exception("Property not found.");
            _context.LandLordProperties.Remove(property);
            await _context.SaveChangesAsync();
        }

        public async Task UpdatePropertyAsync(IFormFile image, LandLordProperty property)
        {
            if (property == null)
                throw new Exception(nameof(property));

            // Get the role for "Landlord"
            var landlordRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Name == "Landlord");
            if (landlordRole == null)
                throw new Exception("Landlord role not found.");

            // Check if the owner exists and holds the Landlord role
            var existingOwner = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == property.OwnerId && u.SystemRoleId == landlordRole.Id);
            if (existingOwner == null)
                throw new Exception("Owner with Landlord role not found.");
            // Check if the property exists
            var existingProperty = await _context.LandLordProperties
                .FirstOrDefaultAsync(p => p.Id == property.Id);
            if (existingProperty == null)
                throw new Exception("Property not found.");

            //check if the image is not null
            if (image != null)
            {
                // Save the image to the server and get the URL
                var imageUrl = await _fileService.SaveFileAndReturnPathAsync(image);
                existingProperty.ImageUrl = imageUrl;
            }
            existingProperty.Name = property.Name;
            existingProperty.Type = property.Type;
            existingProperty.Address = property.Address;
            existingProperty.Region = property.Region;
            existingProperty.District = property.District;
            existingProperty.Zipcode = property.Zipcode;
            existingProperty.Description = property.Description;
            existingProperty.Price = property.Price;
            existingProperty.NumberOfRooms = property.NumberOfRooms;
            await _context.SaveChangesAsync();
        } 
    }
   
}
