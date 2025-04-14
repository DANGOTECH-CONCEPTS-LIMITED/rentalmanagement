using Application.Interfaces.Settings;
using Application.Interfaces.Tenant;
using Application.Interfaces.UserServices;
using Domain.Dtos.Tenant;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.Tenant
{
    public class TenantService : ITenantService
    {
        private readonly AppDbContext _context;
        private readonly ISettings _settings;
        private readonly IUserService _userService;

        public TenantService(AppDbContext context, ISettings settings, IUserService userService)
        {
            _context = context;
            _settings = settings;
            _userService = userService;
        }

        public async Task CreateTenantAsync(IFormFile passportphoto, IFormFile idfront, IFormFile idback, TenantDto tenantDto)
        {
            if (passportphoto == null)
                throw new Exception("Passport photo is required.");

            if (idfront == null)
                throw new Exception("ID front is required.");
            if (idback == null)
                throw new Exception("ID back is required.");

            if (tenantDto == null)
                throw new Exception("Tenant data is required.");

            //save files
            var passportPhotoPath = await _settings.SaveFileAndReturnPathAsync(passportphoto);
            var idFrontPath = await _settings.SaveFileAndReturnPathAsync(idfront);
            var idBackPath = await _settings.SaveFileAndReturnPathAsync(idback);

            //map dto to entity
            var tenant = new PropertyTenant
            {
                Name = tenantDto.Name,
                FullName = tenantDto.FullName,
                Email = tenantDto.Email,
                PhoneNumber = tenantDto.PhoneNumber,
                Password = tenantDto.Password,
                Active = tenantDto.Active,
                PassportPhoto = passportPhotoPath,
                IdFront = idFrontPath,
                IdBack = idBackPath,
                NationalIdNumber = tenantDto.NationalIdNumber,
                PropertyId = tenantDto.PropertyId,
                DateMovedIn = tenantDto.DateMovedIn
            };

            //get tenant system role
            var systemRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Name == "Tenant");

            //add to db
            await _context.Tenants.AddAsync(tenant);
            await _context.SaveChangesAsync();

            //register tenant as the user
            var user = new User 
            {
                FullName = tenantDto.FullName,
                Email = tenantDto.Email,
                PhoneNumber = tenantDto.PhoneNumber,
                PassportPhoto = passportPhotoPath,
                IdFront = idFrontPath,
                IdBack = idBackPath,
                NationalIdNumber = tenantDto.NationalIdNumber,
                SystemRoleId = systemRole.Id,
            };
            await _userService.RegisterUserMinusFiles(user);
        }

        public async Task<IEnumerable<PropertyTenant>> GetAllTenantsAsync()
        {
            var tenants = await _context.Tenants
                .Include(t => t.Property)
                  .ThenInclude(p => p.Owner)
                .ToListAsync();
            return tenants;
        }

        public async Task<PropertyTenant> GetTenantByIdAsync(int id)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Property)
                  .ThenInclude(p => p.Owner)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null)
                throw new Exception("Tenant not found.");
            return tenant;
        }

        public async Task UpdateTenantAsync(IFormFile passportphoto, IFormFile idfront, IFormFile idback, PropertyTenant tenant)
        {
            if (tenant == null)
                throw new Exception("Tenant data is required.");

            //check if tenant exists
            var existingTenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Id == tenant.Id);

            if (existingTenant == null)
                throw new Exception("Tenant not found.");

            if (passportphoto != null)
            {
                var passportPhotoPath = await _settings.SaveFileAndReturnPathAsync(passportphoto);
                tenant.PassportPhoto = passportPhotoPath;
            }
            if (idfront != null)
            {
                var idFrontPath = await _settings.SaveFileAndReturnPathAsync(idfront);
                tenant.IdFront = idFrontPath;
            }
            if (idback != null)
            {
                var idBackPath = await _settings.SaveFileAndReturnPathAsync(idback);
                tenant.IdBack = idBackPath;
            }
            _context.Tenants.Update(tenant);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteTenantAsync(int id)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null)
                throw new Exception("Tenant not found.");
            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<PropertyTenant>> GetTenantsByPropertyIdAsync(int propertyId)
        {
            var tenants = await _context.Tenants
                .Where(t => t.PropertyId == propertyId)
                .Include(t => t.Property)
                  .ThenInclude(p => p.Owner)
                .ToListAsync();

            if (tenants == null)
                throw new Exception("No tenants found for this property.");
            return tenants;
        }
    } 
}
