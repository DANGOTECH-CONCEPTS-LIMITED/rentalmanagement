using Application.Interfaces.Settings;
using Application.Interfaces.Tenant;
using Application.Interfaces.UserServices;
using Domain.Dtos.Tenant;
using Domain.Entities;
using Domain.Entities.PropertyMgt;
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

            //check if property exists
            var property = await _context.LandLordProperties
                .Include(p => p.Owner)
                .FirstOrDefaultAsync(p => p.Id == tenantDto.PropertyId);
            if (property == null)
                throw new Exception("Property not found.");

            PropertyUnit? unit = null;
            if (tenantDto.PropertyUnitId.HasValue)
            {
                unit = await _context.PropertyUnits
                    .FirstOrDefaultAsync(currentUnit => currentUnit.Id == tenantDto.PropertyUnitId.Value);
                if (unit == null)
                    throw new Exception("Property unit not found.");
                if (unit.PropertyId != tenantDto.PropertyId)
                    throw new Exception("Property unit does not belong to the selected property.");
                if (!string.Equals(unit.Status, "Available", StringComparison.OrdinalIgnoreCase))
                    throw new Exception("Property unit is already occupied.");
            }

            //map dto to entity
            var tenant = new PropertyTenant
            {
                FullName = tenantDto.FullName,
                Email = tenantDto.Email,
                PhoneNumber = tenantDto.PhoneNumber,
                Active = true,
                PassportPhoto = passportPhotoPath,
                IdFront = idFrontPath,
                IdBack = idBackPath,
                NationalIdNumber = tenantDto.NationalIdNumber,
                PropertyId = tenantDto.PropertyId,
                PropertyUnitId = tenantDto.PropertyUnitId,
                DateMovedIn = tenantDto.DateMovedIn,
                Property = property,
                WaterMeterNo = tenantDto.WaterMeterNo ?? string.Empty,
                ElectricityMeterNo = tenantDto.ElectricityMeterNo ?? string.Empty,
                Occupation = tenantDto.Occupation ?? string.Empty,
                NextOfKinName = tenantDto.NextOfKinName ?? string.Empty,
                NextOfKinPhone = tenantDto.NextOfKinPhone ?? string.Empty,
                NextOfKinRelationship = tenantDto.NextOfKinRelationship ?? string.Empty,
                NextOfKinIdNumber = tenantDto.NextOfKinIdNumber ?? string.Empty,
                NextOfKinWorkplace = tenantDto.NextOfKinWorkplace ?? string.Empty,
            };
            //get tenant system role
            var systemRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Name == "Tenant");

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
            var createduser = await _userService.RegisterUserMinusFiles(user);

            tenant.UserId = createduser.Id;
            //add to db
            await _context.Tenants.AddAsync(tenant);

            if (unit != null)
            {
                unit.Status = "Occupied";
                unit.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            
        }

        public async Task<IEnumerable<PropertyTenant>> GetAllTenantsAsync()
        {
            var tenants = await _context.Tenants
                .Include(t => t.Property)
                  .ThenInclude(p => p.Owner)
                .Include(t => t.Unit)
                .ToListAsync();
            return tenants;
        }

        public async Task<PropertyTenant> GetTenantByIdAsync(int id)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Property)
                  .ThenInclude(p => p.Owner)
                .Include(t => t.Unit)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null)
                throw new Exception("Tenant not found.");
            return tenant;
        }

        public async Task UpdateTenantAsync(IFormFile? passportphoto, IFormFile? idfront, IFormFile? idback, TenantDto tenant, int tenantid)
        {
            if (tenant == null)
                throw new Exception("Tenant data is required.");

            //check if tenant exists
            var existingTenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Id == tenantid);

            if (existingTenant == null)
                throw new Exception("Tenant not found.");

            var property = await _context.LandLordProperties
                .Include(currentProperty => currentProperty.Owner)
                .FirstOrDefaultAsync(currentProperty => currentProperty.Id == tenant.PropertyId);
            if (property == null)
                throw new Exception("Property not found.");

            var previousUnitId = existingTenant.PropertyUnitId;
            var tenantIsActive = tenant.Active ?? false;
            var requestedUnitId = tenantIsActive ? tenant.PropertyUnitId : null;
            PropertyUnit? requestedUnit = null;
            if (requestedUnitId.HasValue)
            {
                requestedUnit = await _context.PropertyUnits
                    .FirstOrDefaultAsync(currentUnit => currentUnit.Id == requestedUnitId.Value);
                if (requestedUnit == null)
                    throw new Exception("Property unit not found.");
                if (requestedUnit.PropertyId != tenant.PropertyId)
                    throw new Exception("Property unit does not belong to the selected property.");

                var isCurrentUnit = previousUnitId == requestedUnit.Id;
                var unitAssignedToAnotherTenant = await _context.Tenants
                    .AsNoTracking()
                    .AnyAsync(currentTenant => currentTenant.Id != existingTenant.Id &&
                                               currentTenant.PropertyUnitId == requestedUnit.Id);
                if (!isCurrentUnit &&
                    (!string.Equals(requestedUnit.Status, "Available", StringComparison.OrdinalIgnoreCase) ||
                     unitAssignedToAnotherTenant))
                    throw new Exception("Property unit is already occupied.");
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            if (passportphoto != null)
            {
                var passportPhotoPath = await _settings.SaveFileAndReturnPathAsync(passportphoto);
                existingTenant.PassportPhoto = passportPhotoPath;
            }
            if (idfront != null)
            {
                var idFrontPath = await _settings.SaveFileAndReturnPathAsync(idfront);
                existingTenant.IdFront = idFrontPath;
            }
            if (idback != null)
            {
                var idBackPath = await _settings.SaveFileAndReturnPathAsync(idback);
                existingTenant.IdBack = idBackPath;
            }

            //update tenant properties
            existingTenant.FullName = tenant.FullName;
            existingTenant.Email = tenant.Email;
            existingTenant.PhoneNumber = tenant.PhoneNumber;
            existingTenant.Active = tenantIsActive;
            existingTenant.NationalIdNumber = tenant.NationalIdNumber;
            existingTenant.PropertyId = tenant.PropertyId;
            existingTenant.PropertyUnitId = requestedUnitId;
            existingTenant.WaterMeterNo = tenant.WaterMeterNo ?? string.Empty;
            existingTenant.ElectricityMeterNo = tenant.ElectricityMeterNo ?? string.Empty;
            existingTenant.Occupation = tenant.Occupation ?? string.Empty;
            existingTenant.NextOfKinName = tenant.NextOfKinName ?? string.Empty;
            existingTenant.NextOfKinPhone = tenant.NextOfKinPhone ?? string.Empty;
            existingTenant.NextOfKinRelationship = tenant.NextOfKinRelationship ?? string.Empty;
            existingTenant.NextOfKinIdNumber = tenant.NextOfKinIdNumber ?? string.Empty;
            existingTenant.NextOfKinWorkplace = tenant.NextOfKinWorkplace ?? string.Empty;
            existingTenant.Property = property;

            if (previousUnitId != requestedUnitId)
            {
                if (previousUnitId.HasValue)
                {
                    var previousUnit = await _context.PropertyUnits
                        .FirstOrDefaultAsync(currentUnit => currentUnit.Id == previousUnitId.Value);
                    if (previousUnit != null)
                    {
                        previousUnit.Status = "Available";
                        previousUnit.UpdatedAt = DateTime.UtcNow;
                    }
                }

                if (requestedUnit != null)
                {
                    requestedUnit.Status = "Occupied";
                    requestedUnit.UpdatedAt = DateTime.UtcNow;
                }
            }
            else if (requestedUnit != null)
            {
                requestedUnit.Status = "Occupied";
                requestedUnit.UpdatedAt = DateTime.UtcNow;
            }

            _context.Tenants.Update(existingTenant);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
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

        public async Task DeleteTenantAndAllDataAsync(int id)
        {
            var tenant = await _context.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null)
                throw new Exception("Tenant not found.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            await _context.JournalLines
                .Where(line => line.TenantId == id)
                .ExecuteDeleteAsync();
            await _context.TenantPayments
                .Where(payment => payment.PropertyTenantId == id)
                .ExecuteDeleteAsync();
            await _context.TenantInvoices
                .Where(invoice => invoice.TenantId == id)
                .ExecuteDeleteAsync();
            await _context.RentalContracts
                .Where(contract => contract.TenantId == id)
                .ExecuteDeleteAsync();
            await _context.ViewingRequests
                .Where(request => request.TenantId == id)
                .ExecuteDeleteAsync();

            var hasEmail = !string.IsNullOrWhiteSpace(tenant.Email);
            var hasPhoneNumber = !string.IsNullOrWhiteSpace(tenant.PhoneNumber);
            if (hasEmail || hasPhoneNumber)
            {
                await _context.SmsLogs
                    .Where(log => (hasEmail && log.SentByEmail == tenant.Email) ||
                                  (hasPhoneNumber && log.Phone == tenant.PhoneNumber))
                    .ExecuteDeleteAsync();
            }

            if (tenant.UserId.HasValue)
            {
                var userId = tenant.UserId.Value;

                await _context.AuditTrailEntries
                    .Where(entry => entry.UserId == userId.ToString())
                    .ExecuteDeleteAsync();
            }

            if (tenant.PropertyUnitId.HasValue)
            {
                await _context.PropertyUnits
                    .Where(unit => unit.Id == tenant.PropertyUnitId.Value)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(unit => unit.Status, "Available")
                        .SetProperty(unit => unit.UpdatedAt, DateTime.UtcNow));
            }

            await _context.Tenants
                .Where(currentTenant => currentTenant.Id == id)
                .ExecuteDeleteAsync();

            if (tenant.UserId.HasValue)
            {
                await _context.Users
                    .Where(user => user.Id == tenant.UserId.Value)
                    .ExecuteDeleteAsync();
            }

            await transaction.CommitAsync();
        }

        public async Task<IEnumerable<PropertyTenant>> GetTenantsByPropertyIdAsync(int propertyId)
        {
            var tenants = await _context.Tenants
                .Where(t => t.PropertyId == propertyId)
                .Include(t => t.Property)
                  .ThenInclude(p => p.Owner)
                .Include(t => t.Unit)
                .ToListAsync();

            if (tenants == null)
                throw new Exception("No tenants found for this property.");
            return tenants;
        }

        public async Task<IEnumerable<PropertyTenant>> GetTenantsByCaretakerIdAsync(int caretakerId)
        {
            await EnsureCaretakerExistsAsync(caretakerId);

            return await _context.Tenants
                .Where(t => _context.CaretakerPropertyAssignments
                    .Any(a => a.CaretakerId == caretakerId && a.PropertyId == t.PropertyId))
                .Include(t => t.Property)
                    .ThenInclude(p => p.Owner)
                .Include(t => t.Unit)
                .ToListAsync();
        }

        public async Task<IEnumerable<PropertyTenant>> GetTenantsByCaretakerIdAndPropertyIdAsync(int caretakerId, int propertyId)
        {
            await EnsureCaretakerAssignedToPropertyAsync(caretakerId, propertyId);

            return await _context.Tenants
                .Where(t => t.PropertyId == propertyId)
                .Include(t => t.Property)
                    .ThenInclude(p => p.Owner)
                .Include(t => t.Unit)
                .ToListAsync();
        }

        public async Task UpdateTenantInvoiceDayAsync(int tenantId, int? invoiceGenerationDay)
        {
            if (invoiceGenerationDay.HasValue && (invoiceGenerationDay < 1 || invoiceGenerationDay > 28))
                throw new Exception("Invoice generation day must be between 1 and 28.");

            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null)
                throw new Exception("Tenant not found.");

            tenant.InvoiceGenerationDay = invoiceGenerationDay;
            await _context.SaveChangesAsync();
        }

        private async Task EnsureCaretakerExistsAsync(int caretakerId)
        {
            var caretakerRoleId = await _context.SystemRoles
                .AsNoTracking()
                .Where(r => r.Name == "Caretaker")
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (caretakerRoleId == 0)
                throw new Exception("Caretaker role not found.");

            var caretakerExists = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == caretakerId && u.SystemRoleId == caretakerRoleId);

            if (!caretakerExists)
                throw new Exception("Caretaker not found.");
        }

        private async Task EnsureCaretakerAssignedToPropertyAsync(int caretakerId, int propertyId)
        {
            await EnsureCaretakerExistsAsync(caretakerId);

            var assignmentExists = await _context.CaretakerPropertyAssignments
                .AsNoTracking()
                .AnyAsync(a => a.CaretakerId == caretakerId && a.PropertyId == propertyId);

            if (!assignmentExists)
                throw new Exception("Property is not assigned to this caretaker.");
        }

    }
}
