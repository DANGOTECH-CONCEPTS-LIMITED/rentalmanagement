using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.Property;
using Application.Interfaces.Tenant;
using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Property
{
    public class PropertyUnitService : IPropertyUnitService
    {
        private readonly AppDbContext _db;
        private readonly ITenantInvoiceService _tenantInvoiceService;

        public PropertyUnitService(AppDbContext db, ITenantInvoiceService tenantInvoiceService)
        {
            _db = db;
            _tenantInvoiceService = tenantInvoiceService;
        }

        public async Task<PropertyUnit> AddUnitAsync(PropertyUnitDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.PropertyId <= 0)
                throw new Exception("Property is required.");

            if (string.IsNullOrWhiteSpace(dto.UnitNumber))
                throw new Exception("Unit number is required.");

            var propertyExists = await _db.LandLordProperties.AsNoTracking().AnyAsync(p => p.Id == dto.PropertyId);
            if (!propertyExists)
                throw new Exception("Property not found.");

            var unitNumber = dto.UnitNumber.Trim();
            var exists = await _db.PropertyUnits
                .AsNoTracking()
                .AnyAsync(u => u.PropertyId == dto.PropertyId && u.UnitNumber == unitNumber);

            if (exists)
                throw new Exception("A unit with the same unit number already exists for this property.");

            var unit = new PropertyUnit
            {
                PropertyId = dto.PropertyId,
                UnitNumber = unitNumber,
                SecurityDeposit = dto.SecurityDeposit,
                MonthlyAmount = dto.MonthlyAmount,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Available" : dto.Status.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.PropertyUnits.Add(unit);
            await _db.SaveChangesAsync();
            return unit;
        }

        public async Task<IEnumerable<PropertyUnit>> GetUnitsByPropertyIdAsync(int propertyId)
        {
            return await _db.PropertyUnits
                .AsNoTracking()
                .Where(u => u.PropertyId == propertyId)
                .OrderBy(u => u.UnitNumber)
                .ToListAsync();
        }

        public async Task<IEnumerable<PropertyUnit>> GetUnitsByLandlordIdAsync(int landlordId)
        {
            return await _db.PropertyUnits
                .AsNoTracking()
                .Join(_db.LandLordProperties.AsNoTracking().Where(p => p.OwnerId == landlordId),
                    u => u.PropertyId,
                    p => p.Id,
                    (u, p) => u)
                .OrderBy(u => u.PropertyId)
                .ThenBy(u => u.UnitNumber)
                .ToListAsync();
        }

        public async Task<IEnumerable<PropertyUnit>> GetUnitsByCaretakerIdAsync(int caretakerId)
        {
            await EnsureCaretakerExistsAsync(caretakerId);

            return await _db.PropertyUnits
                .AsNoTracking()
                .Include(u => u.Property)
                .Where(u => _db.CaretakerPropertyAssignments
                    .Any(a => a.CaretakerId == caretakerId && a.PropertyId == u.PropertyId))
                .OrderBy(u => u.PropertyId)
                .ThenBy(u => u.UnitNumber)
                .ToListAsync();
        }

        public async Task<IEnumerable<PropertyUnit>> GetUnitsByCaretakerIdAndPropertyIdAsync(int caretakerId, int propertyId)
        {
            await EnsureCaretakerAssignedToPropertyAsync(caretakerId, propertyId);

            return await _db.PropertyUnits
                .AsNoTracking()
                .Include(u => u.Property)
                .Where(u => u.PropertyId == propertyId)
                .OrderBy(u => u.UnitNumber)
                .ToListAsync();
        }

        public async Task<PropertyUnit> GetUnitByIdAsync(int unitId)
        {
            var unit = await _db.PropertyUnits
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == unitId);

            if (unit == null)
                throw new Exception("Unit not found.");

            return unit;
        }

        public async Task<PropertyUnit> UpdateUnitAsync(int unitId, PropertyUnitDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == unitId);
            if (unit == null)
                throw new Exception("Unit not found.");

            var unitNumber = string.IsNullOrWhiteSpace(dto.UnitNumber) ? unit.UnitNumber : dto.UnitNumber.Trim();

            if (unit.PropertyId != dto.PropertyId && dto.PropertyId > 0)
            {
                var propertyExists = await _db.LandLordProperties.AsNoTracking().AnyAsync(p => p.Id == dto.PropertyId);
                if (!propertyExists)
                    throw new Exception("Property not found.");

                unit.PropertyId = dto.PropertyId;
            }

            if (!string.Equals(unit.UnitNumber, unitNumber, StringComparison.Ordinal))
            {
                var exists = await _db.PropertyUnits
                    .AsNoTracking()
                    .AnyAsync(u => u.PropertyId == unit.PropertyId && u.UnitNumber == unitNumber && u.Id != unit.Id);

                if (exists)
                    throw new Exception("A unit with the same unit number already exists for this property.");

                unit.UnitNumber = unitNumber;
            }

            unit.SecurityDeposit = dto.SecurityDeposit;
            unit.MonthlyAmount = dto.MonthlyAmount;
            unit.Status = string.IsNullOrWhiteSpace(dto.Status) ? unit.Status : dto.Status.Trim();
            unit.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return unit;
        }

        public async Task DeleteUnitAsync(int unitId)
        {
            var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == unitId);
            if (unit == null)
                throw new Exception("Unit not found.");

            _db.PropertyUnits.Remove(unit);
            await _db.SaveChangesAsync();
        }

        public async Task<PropertyTenant> AssignTenantToUnitAsync(AssignTenantToUnitDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            await using var transaction = await _db.Database.BeginTransactionAsync();

            var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == dto.TenantId);
            if (tenant == null)
                throw new Exception("Tenant not found.");

            var unit = await _db.PropertyUnits
                .Include(u => u.Property)
                .FirstOrDefaultAsync(u => u.Id == dto.UnitId);
            if (unit == null)
                throw new Exception("Unit not found.");

            if (unit.Property == null)
                throw new Exception("Unit property not found.");

            PropertyUnit? previousUnit = null;
            if (tenant.PropertyUnitId.HasValue && tenant.PropertyUnitId.Value != unit.Id)
            {
                previousUnit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == tenant.PropertyUnitId.Value);
            }

            // Keep PropertyId consistent with the unit's property
            tenant.PropertyId = unit.PropertyId;
            tenant.PropertyUnitId = unit.Id;
            unit.Status = "Occupied";
            unit.UpdatedAt = DateTime.UtcNow;

            if (previousUnit != null)
            {
                previousUnit.Status = "Available";
                previousUnit.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            if (unit.SecurityDeposit > 0)
            {
                await _tenantInvoiceService.CreateSecurityDepositInvoiceAsync(
                    tenant.Id,
                    unit.PropertyId,
                    unit.Id,
                    unit.SecurityDeposit,
                    unit.Property.OwnerId,
                    $"Security deposit for unit {unit.UnitNumber}.");
            }

            await transaction.CommitAsync();
            return tenant;
        }

        public async Task<PropertyTenant> RemoveTenantFromUnitAsync(int tenantId, RemoveTenantFromUnitDto? dto = null)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync();

            var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant == null)
                throw new Exception("Tenant not found.");

            PropertyUnit? unit = null;
            if (tenant.PropertyUnitId.HasValue)
            {
                unit = await _db.PropertyUnits
                    .Include(u => u.Property)
                    .FirstOrDefaultAsync(u => u.Id == tenant.PropertyUnitId.Value);
            }

            if (unit?.Property == null && unit != null)
                throw new Exception("Unit property not found.");

            if (unit != null && dto != null && (dto.RefundAmount > 0 || dto.DeductionAmount > 0))
            {
                var processedByUserId = dto.ProcessedByUserId.GetValueOrDefault() > 0
                    ? dto.ProcessedByUserId.Value
                    : unit.Property!.OwnerId;

                await _tenantInvoiceService.SettleSecurityDepositAsync(
                    tenant.Id,
                    unit.PropertyId,
                    unit.Id,
                    dto.DeductionAmount,
                    dto.RefundAmount,
                    processedByUserId,
                    dto.Notes);
            }

            tenant.PropertyUnitId = null;

            if (unit != null)
            {
                unit.Status = "Available";
                unit.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return tenant;
        }

        private async Task EnsureCaretakerExistsAsync(int caretakerId)
        {
            var caretakerRoleId = await _db.SystemRoles
                .AsNoTracking()
                .Where(r => r.Name == "Caretaker")
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (caretakerRoleId == 0)
                throw new Exception("Caretaker role not found.");

            var caretakerExists = await _db.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == caretakerId && u.SystemRoleId == caretakerRoleId);

            if (!caretakerExists)
                throw new Exception("Caretaker not found.");
        }

        private async Task EnsureCaretakerAssignedToPropertyAsync(int caretakerId, int propertyId)
        {
            await EnsureCaretakerExistsAsync(caretakerId);

            var assignmentExists = await _db.CaretakerPropertyAssignments
                .AsNoTracking()
                .AnyAsync(a => a.CaretakerId == caretakerId && a.PropertyId == propertyId);

            if (!assignmentExists)
                throw new Exception("Property is not assigned to this caretaker.");
        }
    }
}
