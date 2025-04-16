using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.PaymentServices
{
    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _context;
        public PaymentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task CreatePaymentAsync(TenantPaymentDto tenantPaymentDto)
        {
            if (tenantPaymentDto == null)
                throw new Exception("Tenant payment data is required.");
            //map dto to entity
            var tenantPayment = new TenantPayment
            {
                Amount = tenantPaymentDto.Amount,
                PaymentDate = tenantPaymentDto.PaymentDate,
                PaymentMethod = tenantPaymentDto.PaymentMethod,
                Vendor = tenantPaymentDto.Vendor,
                PaymentType = tenantPaymentDto.PaymentType,
                PaymentStatus = "SUCCESSFULL",
                TransactionId = tenantPaymentDto.TransactionId,
                PropertyTenantId = tenantPaymentDto.PropertyTenantId
            };
            //save to database
            await _context.TenantPayments.AddAsync(tenantPayment);
            await _context.SaveChangesAsync();
        }

        public async Task DeletePaymentAsync(int id)
        {
            var payment = await _context.TenantPayments.FindAsync(id);
            if (payment == null)
                throw new Exception("Payment not found.");
            _context.TenantPayments.Remove(payment);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<TenantPayment>> GetAllPaymentsAsync()
        {
            return await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .ToListAsync();
        }

        public async Task<TenantPayment> GetPaymentByIdAsync(int id)
        {
            var payment = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .FirstOrDefaultAsync(tp => tp.Id == id);
            if (payment == null)
                throw new Exception("Payment not found.");
            return payment;
        }

        public async Task UpdatePaymentAsync(TenantPayment tenantPaymentDto)
        {
            if (tenantPaymentDto == null)
                throw new Exception("Tenant payment data is required.");
            //check if payment exists
            var existingPayment = await _context.TenantPayments
                .FirstOrDefaultAsync(tp => tp.Id == tenantPaymentDto.Id);
            if (existingPayment == null)
                throw new Exception("Payment not found.");
            //map dto to entity
            existingPayment.Amount = tenantPaymentDto.Amount;
            existingPayment.PaymentDate = tenantPaymentDto.PaymentDate;
            existingPayment.PaymentMethod = tenantPaymentDto.PaymentMethod;
            existingPayment.Vendor = tenantPaymentDto.Vendor;
            existingPayment.PaymentType = tenantPaymentDto.PaymentType;
            existingPayment.TransactionId = tenantPaymentDto.TransactionId;
            _context.TenantPayments.Update(existingPayment);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByTenantIdAsync(int tenantId)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenantId == tenantId)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByPropertyIdAsync(int propertyId)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId)
                .ToListAsync();
            return payments;

        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByOwnerIdAsync(int ownerId)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.Property.OwnerId == ownerId)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByVendorAsync(string vendor)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.Vendor == vendor)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PaymentDate >= startDate && tp.PaymentDate <= endDate)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByStatusAsync(string status)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PaymentStatus == status)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByMethodAsync(string method)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PaymentMethod == method)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByTypeAsync(string type)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PaymentType == type)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetPaymentsByTransactionIdAsync(string transactionId)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.TransactionId == transactionId)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndDateRangeAsync(int propertyId, DateTime startDate, DateTime endDate)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.PaymentDate >= startDate && tp.PaymentDate <= endDate)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndStatusAsync(int propertyId, string status)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.PaymentStatus == status)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndMethodAsync(int propertyId, string method)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.PaymentMethod == method)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndVendorAsync(int propertyId, string vendor)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.Vendor == vendor)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndTypeAsync(int propertyId, string type)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.PaymentType == type)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndTransactionIdAsync(int propertyId, string transactionId)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.TransactionId == transactionId)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAndTenantIdAsync(int propertyId, int tenantId)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId && tp.PropertyTenant.Id == tenantId)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAsync(int landlordid)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.Property.OwnerId == landlordid)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAndDateRangeAsync(int landlordid, DateTime startDate, DateTime endDate)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.Property.OwnerId == landlordid && tp.PaymentDate >= startDate && tp.PaymentDate <= endDate)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAndStatusAsync(int landlordid, string status)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.Property.OwnerId == landlordid && tp.PaymentStatus == status)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByPropertyIdAsync(int propertyId)
        {
            var tenantpayment = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.PropertyId == propertyId)
                .ToListAsync();

            return tenantpayment;
        }

        public async Task<IEnumerable<TenantPayment>> GetTenantPaymentsByLandLordIdAndMethodAsync(int landlordid, string method)
        {
            var payments = await _context.TenantPayments
                .Include(tp => tp.PropertyTenant)
                    .ThenInclude(pt => pt.Property)
                        .ThenInclude(p => p.Owner)
                .Where(tp => tp.PropertyTenant.Property.OwnerId == landlordid && tp.PaymentMethod == method)
                .ToListAsync();
            return payments;
        }
    }
}
