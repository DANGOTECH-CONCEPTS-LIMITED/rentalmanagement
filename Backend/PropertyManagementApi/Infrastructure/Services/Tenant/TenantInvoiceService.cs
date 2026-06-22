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
                OriginalAmount = dto.Amount,
                PaidAmount = 0,
                RefundedAmount = 0,
                DeductedAmount = 0,
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

        public async Task<TenantInvoice> CreateSecurityDepositInvoiceAsync(int tenantId, int propertyId, int? propertyUnitId, double amount, int createdByUserId, string? notes = null)
        {
            if (amount <= 0)
                throw new Exception("Security deposit amount must be greater than zero.");

            var existingInvoice = await _db.TenantInvoices
                .AsNoTracking()
                .Where(i => i.TenantId == tenantId
                         && i.PropertyId == propertyId
                         && i.PropertyUnitId == propertyUnitId
                         && string.Equals(i.Type, "Security Deposit", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingInvoice != null && (existingInvoice.Amount > 0 || GetHeldDepositBalance(existingInvoice) > 0))
                throw new Exception("An active security deposit invoice already exists for this tenant and unit.");

            var invoiceDate = DateTime.UtcNow;
            return await CreateInvoiceAsync(new CreateTenantInvoiceDto
            {
                Type = "Security Deposit",
                Status = "Pending",
                TenantId = tenantId,
                PropertyId = propertyId,
                PropertyUnitId = propertyUnitId,
                Amount = amount,
                InvoiceDate = invoiceDate,
                DueDate = invoiceDate,
                Notes = string.IsNullOrWhiteSpace(notes) ? "Security deposit due upon unit assignment." : notes.Trim(),
                CreatedByUserId = createdByUserId,
                CreatedByName = "System"
            });
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

        public async Task<TenantInvoice> ApplyPaymentToInvoiceAsync(int invoiceId, double paymentAmount)
        {
            var invoice = await _db.TenantInvoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null)
                throw new Exception("Invoice not found.");

            if (paymentAmount <= 0)
                throw new Exception("Payment amount must be greater than zero.");

            if (invoice.OriginalAmount <= 0 && invoice.Amount > 0)
                invoice.OriginalAmount = invoice.Amount + invoice.PaidAmount;

            var outstandingBalance = Math.Max(0, invoice.OriginalAmount - invoice.PaidAmount);
            if (outstandingBalance <= 0)
                throw new Exception("Invoice is already fully paid.");

            var appliedAmount = Math.Min(paymentAmount, outstandingBalance);
            invoice.PaidAmount += appliedAmount;
            invoice.Amount = Math.Max(0, invoice.OriginalAmount - invoice.PaidAmount);

            if (invoice.Amount <= 0)
            {
                invoice.Status = "Paid";
            }
            else if (!string.Equals(invoice.Status, "Overdue", StringComparison.OrdinalIgnoreCase))
            {
                invoice.Status = "Partially Paid";
            }

            invoice.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return invoice;
        }

        public async Task<TenantInvoice> SettleSecurityDepositAsync(int tenantId, int propertyId, int? propertyUnitId, double deductionAmount, double refundAmount, int processedByUserId, string? notes = null)
        {
            if (deductionAmount < 0)
                throw new Exception("Deduction amount cannot be negative.");

            if (refundAmount < 0)
                throw new Exception("Refund amount cannot be negative.");

            var invoice = await _db.TenantInvoices
                .Where(i => i.TenantId == tenantId
                         && i.PropertyId == propertyId
                         && i.PropertyUnitId == propertyUnitId
                         && string.Equals(i.Type, "Security Deposit", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (invoice == null)
                throw new Exception("Security deposit invoice not found for this tenancy.");

            if (processedByUserId <= 0)
                throw new Exception("ProcessedBy user is required for move-out settlement.");

            if (invoice.OriginalAmount <= 0 && invoice.Amount > 0)
                invoice.OriginalAmount = invoice.Amount + invoice.PaidAmount;

            var totalSettlement = deductionAmount + refundAmount;
            if (totalSettlement <= 0)
                return invoice;

            var availableDeposit = GetHeldDepositBalance(invoice);
            if (totalSettlement > availableDeposit)
                throw new Exception("Refund plus deduction cannot exceed the deposit amount already paid.");

            invoice.DeductedAmount += deductionAmount;
            invoice.RefundedAmount += refundAmount;
            invoice.Notes = AppendMoveOutSettlementNote(invoice.Notes, deductionAmount, refundAmount, notes);
            invoice.Status = GetHeldDepositBalance(invoice) > 0 ? "Deposit Partially Settled" : "Deposit Settled";
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

        private static double GetHeldDepositBalance(TenantInvoice invoice)
        {
            return Math.Max(0, invoice.PaidAmount - invoice.RefundedAmount - invoice.DeductedAmount);
        }

        private static string AppendMoveOutSettlementNote(string? existingNotes, double deductionAmount, double refundAmount, string? notes)
        {
            var settlementNote = $"Move-out settlement on {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC: deducted UGX {deductionAmount:N0}, refunded UGX {refundAmount:N0}.";
            if (!string.IsNullOrWhiteSpace(notes))
                settlementNote = $"{settlementNote} {notes.Trim()}";

            return string.IsNullOrWhiteSpace(existingNotes)
                ? settlementNote
                : $"{existingNotes.Trim()} {settlementNote}";
        }
    }
}
