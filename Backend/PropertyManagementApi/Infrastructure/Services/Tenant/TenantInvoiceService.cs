using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.SMS;
using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant;
using Domain.Dtos.Tenant.Invoice;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Tenant
{
    public class TenantInvoiceService : ITenantInvoiceService
    {
        private readonly AppDbContext _db;
        private readonly ISmsProcessor _sms;

        public TenantInvoiceService(AppDbContext db, ISmsProcessor sms)
        {
            _db = db;
            _sms = sms;
        }

        public async Task<TenantInvoice> CreateInvoiceAsync(CreateTenantInvoiceDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.TenantId <= 0)
                throw new Exception("Tenant is required.");

            if (dto.PropertyId <= 0)
                throw new Exception("Property is required.");

            if (dto.Amount <= 0)
                throw new Exception("Amount must be greater than zero.");

            if (dto.DueDate == default)
                throw new Exception("Due date is required.");

            if (dto.InvoiceDate == default)
                dto.InvoiceDate = DateTime.UtcNow;

            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == dto.TenantId);
            if (tenant == null)
                throw new Exception("Tenant not found.");

            if (tenant.PropertyId != dto.PropertyId)
                throw new Exception("Tenant is not attached to the selected property.");

            if (dto.PropertyUnitId.HasValue && tenant.PropertyUnitId.HasValue && dto.PropertyUnitId.Value != tenant.PropertyUnitId.Value)
                throw new Exception("Tenant is not attached to the selected unit.");

            var createdByExists = await _db.Users.AsNoTracking().AnyAsync(u => u.Id == dto.CreatedByUserId);
            if (!createdByExists)
                throw new Exception("CreatedBy user not found.");

            if (dto.PropertyUnitId.HasValue)
            {
                var unit = await _db.PropertyUnits.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.PropertyUnitId.Value);
                if (unit == null)
                    throw new Exception("Unit not found.");

                if (unit.PropertyId != dto.PropertyId)
                    throw new Exception("Unit does not belong to the selected property.");
            }

            var invoiceNumber = await GenerateNextInvoiceNumberAsync();

            var invoice = new TenantInvoice
            {
                InvoiceNumber = invoiceNumber,
                Type = string.IsNullOrWhiteSpace(dto.Type) ? "Invoice" : dto.Type.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pending" : dto.Status.Trim(),
                TenantId = dto.TenantId,
                PropertyId = dto.PropertyId,
                PropertyUnitId = dto.PropertyUnitId,
                Amount = dto.Amount,
                InvoiceDate = dto.InvoiceDate,
                DueDate = dto.DueDate,
                Notes = dto.Notes,
                PaymentMethod = dto.PaymentMethod,
                CreatedByUserId = dto.CreatedByUserId,
                CreatedAt = DateTime.UtcNow
            };

            _db.TenantInvoices.Add(invoice);
            await _db.SaveChangesAsync();

            // Notify tenant via SMS
            if (!string.IsNullOrWhiteSpace(tenant.PhoneNumber))
            {
                var msg = $"Dear {tenant.FullName}, a {invoice.Type} invoice of UGX {invoice.Amount:N0} " +
                          $"has been raised and is due on {invoice.DueDate:dd MMM yyyy}. " +
                          $"Invoice: {invoice.InvoiceNumber}. Thank you.";
                await _sms.SendAsync(tenant.PhoneNumber, msg);
            }

            return invoice;
        }

        public async Task<IEnumerable<TenantInvoice>> GetInvoicesByTenantIdAsync(int tenantId)
        {
            return await _db.TenantInvoices
                .AsNoTracking()
                .Where(i => i.TenantId == tenantId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<TenantInvoice>> GetInvoicesByLandlordIdAsync(int landlordId)
        {
            return await _db.TenantInvoices
                .AsNoTracking()
                .Include(i => i.Tenant)
                .Include(i => i.Property)
                .Where(i => i.Property != null && i.Property.OwnerId == landlordId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<TenantInvoice> GetInvoiceByIdAsync(int invoiceId)
        {
            var invoice = await _db.TenantInvoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null)
                throw new Exception("Invoice not found.");

            return invoice;
        }

        public async Task<TenantInvoice> UpdateInvoiceStatusAsync(int invoiceId, UpdateTenantInvoiceStatusDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            var invoice = await _db.TenantInvoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null)
                throw new Exception("Invoice not found.");

            invoice.Status = string.IsNullOrWhiteSpace(dto.Status) ? invoice.Status : dto.Status.Trim();
            invoice.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return invoice;
        }

        public async Task<TenantProfileDto> GetTenantProfileAsync(int tenantId)
        {
            var profile = await _db.Tenants
                .AsNoTracking()
                .Where(t => t.Id == tenantId)
                .Select(t => new TenantProfileDto
                {
                    TenantId = t.Id,
                    UserId = t.UserId,
                    FullName = t.FullName,
                    Email = t.Email,
                    PhoneNumber = t.PhoneNumber,
                    NationalIdNumber = t.NationalIdNumber,
                    Active = t.Active,
                    DateMovedIn = t.DateMovedIn,
                    PropertyId = t.PropertyId,
                    PropertyName = t.Property != null ? t.Property.Name : string.Empty,
                    PropertyType = t.Property != null ? (t.Property.Type ?? string.Empty) : string.Empty,
                    PropertyAddress = t.Property != null ? (t.Property.Address ?? string.Empty) : string.Empty,
                    District = t.Property != null ? (t.Property.District ?? string.Empty) : string.Empty,
                    Region = t.Property != null ? (t.Property.Region ?? string.Empty) : string.Empty,
                    PropertyUnitId = t.PropertyUnitId,
                    UnitNumber = t.Unit != null ? t.Unit.UnitNumber : string.Empty
                })
                .FirstOrDefaultAsync();

            if (profile == null)
                throw new Exception("Tenant not found.");

            return profile;
        }

        private async Task<string> GenerateNextInvoiceNumberAsync()
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"INV-{year}-";

            // Find the latest invoice for the year by InvoiceNumber prefix
            var last = await _db.TenantInvoices
                .AsNoTracking()
                .Where(i => i.InvoiceNumber.StartsWith(prefix))
                .OrderByDescending(i => i.InvoiceNumber)
                .Select(i => i.InvoiceNumber)
                .FirstOrDefaultAsync();

            var nextSeq = 1;
            if (!string.IsNullOrWhiteSpace(last))
            {
                var parts = last.Split('-');
                if (parts.Length == 3 && int.TryParse(parts[2], out var seq))
                    nextSeq = seq + 1;
            }

            return $"{prefix}{nextSeq:D3}";
        }
    }
}
