using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities;
using Domain.Entities.PropertyMgt;
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

        public async Task MakeTenantPaymentAsync(TenantPaymentDto tenantPaymentDto)
        {
            if (tenantPaymentDto == null)
                throw new ArgumentNullException(nameof(tenantPaymentDto));

            // 1) Load tenant (including its Property)
            var tenant = await _context.Tenants
                .Include(pt => pt.Property)
                .FirstOrDefaultAsync(pt => pt.Id == tenantPaymentDto.PropertyTenantId);

            if (tenant == null)
                throw new Exception("Tenant not found.");

            // 2) Prevent duplicate transaction IDs
            if (await _context.TenantPayments
                    .AnyAsync(tp => tp.TransactionId == tenantPaymentDto.TransactionId))
                throw new Exception("Payment with this transaction ID already exists.");

            // 3) Accrue missed months into Arrears
            AccrueArrearsIfNeeded(tenant);

            //check if transaction ID is supplied
            if (string.IsNullOrEmpty(tenantPaymentDto.TransactionId))
            {
                //generate a random transaction ID
                tenantPaymentDto.TransactionId = Guid.NewGuid().ToString();

                //check if transaction ID is unique
                while (await _context.TenantPayments
                        .AnyAsync(tp => tp.TransactionId == tenantPaymentDto.TransactionId))
                {
                    tenantPaymentDto.TransactionId = Guid.NewGuid().ToString();
                }
            }
            else
            {
                //check if transaction ID is unique
                if (await _context.TenantPayments
                        .AnyAsync(tp => tp.TransactionId == tenantPaymentDto.TransactionId))
                    throw new Exception("Payment with this transaction ID already exists.");
            }

            // 4) Record the payment
            var payment = new TenantPayment
            {
                Amount = tenantPaymentDto.Amount,
                PaymentDate = tenantPaymentDto.PaymentDate,
                PaymentMethod = tenantPaymentDto.PaymentMethod,
                Vendor = tenantPaymentDto.Vendor,
                PaymentType = tenantPaymentDto.PaymentType,
                PaymentStatus = "PENDING",
                TransactionId = tenantPaymentDto.TransactionId,
                PropertyTenantId = tenantPaymentDto.PropertyTenantId,
                PropertyTenant = tenant,
                Description = tenantPaymentDto.Description
            };
            await _context.TenantPayments.AddAsync(payment);

            // 5) Apply funds: first to Arrears, then to this period
            double rent = tenant.Property!.Price;
            double remaining = tenantPaymentDto.Amount;

            // 5a) Arrears
            if (tenant.Arrears > 0 && remaining > 0)
            {
                if (remaining >= tenant.Arrears)
                {
                    remaining -= tenant.Arrears;
                    tenant.Arrears = 0;
                }
                else
                {
                    tenant.Arrears -= remaining;
                    remaining = 0;
                }
            }

            // 5b) If nothing remains, save & exit
            if (remaining == 0)
            {
                await _context.SaveChangesAsync();
                return;
            }

            // 5c) Current period balance
            double owedThisPeriod = tenant.BalanceDue > 0
                                   ? tenant.BalanceDue
                                   : rent;

            if (remaining < owedThisPeriod)
            {
                // Partial pay this month
                tenant.BalanceDue = owedThisPeriod - remaining;
            }
            else
            {
                // Full coverage + maybe extras
                double extra = remaining - owedThisPeriod;
                int fullMonths = 1 + (int)(extra / rent);

                // Advance the due date
                tenant.NextPaymentDate = tenant.NextPaymentDate.AddMonths(fullMonths);

                // Leftover for next period
                double leftover = extra % rent;
                tenant.BalanceDue = rent - leftover;
            }

            // 6) Credit the landlord’s wallet with the raw payment amount
            //var landlordId = tenant.Property.OwnerId;
            //var wallet = await _context.Wallets
            //    .FirstOrDefaultAsync(w => w.LandlordId == landlordId);

            //if (wallet == null)
            //{
            //    wallet = new Wallet
            //    {
            //        LandlordId = landlordId,
            //        Balance = 0m
            //    };
            //    _context.Wallets.Add(wallet);
            //    await _context.SaveChangesAsync(); // ensure wallet.Id is set
            //}

            //// add positive transaction
            //var walletTxn = new WalletTransaction
            //{
            //    WalletId = wallet.Id,
            //    Amount = (decimal)tenantPaymentDto.Amount,
            //    Description = tenantPaymentDto.Description,
            //    TransactionDate = tenantPaymentDto.PaymentDate,
            //    TransactionId = tenantPaymentDto.TransactionId
            //};
            //_context.WalletTransactions.Add(walletTxn);

            //// bump balance
            //wallet.Balance += (decimal)tenantPaymentDto.Amount;

            // 7) Persist everything in one go
            await _context.SaveChangesAsync();
        }

        private void AccrueArrearsIfNeeded(PropertyTenant tenant)
        {
            var today = DateTime.UtcNow.Date;
            if (tenant.NextPaymentDate.Date >= today)
                return;

            int monthsMissed = ((today.Year - tenant.NextPaymentDate.Year) * 12
                                + today.Month - tenant.NextPaymentDate.Month);
            if (monthsMissed <= 0)
                return;

            double rent = tenant.Property!.Price;

            tenant.Arrears += monthsMissed * rent;
            tenant.NextPaymentDate = tenant.NextPaymentDate.AddMonths(monthsMissed);
            tenant.BalanceDue = rent;
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

        public async Task UpdatePaymentStatus(string status, string transactionid, string vendorreason, string vendortranref, string TranType)
        {

            if (string.IsNullOrEmpty(TranType))
                throw new ArgumentNullException(nameof(status));

            //check if trantype is a utility payment and if not update the other payment
            if (TranType == "UTILITY")
            {
                var payment = await _context.UtilityPayments
               .FirstOrDefaultAsync(tp => tp.TransactionID == transactionid);

                if (payment == null)
                    throw new Exception("Payment not found.");
                payment.Status = status;
                payment.ReasonAtTelecom = vendorreason;
                payment.VendorTranId = vendortranref;
                _context.UtilityPayments.Update(payment);
                await _context.SaveChangesAsync();
            }
            else
            {
                var payment = await _context.TenantPayments
                .FirstOrDefaultAsync(tp => tp.TransactionId == transactionid);
                if (payment == null)
                    throw new Exception("Payment not found.");
                payment.PaymentStatus = status;
                payment.ReasonAtTelecom = vendorreason;
                payment.VendorTransactionId = vendortranref;
                _context.TenantPayments.Update(payment);
                await _context.SaveChangesAsync();
            }

        }

        public async Task MakeUtilityPayment(UtilityPaymentDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            const double MinAmount = 1000;
            if (dto.Amount < MinAmount)
                throw new ArgumentOutOfRangeException(nameof(dto.Amount), $"Amount cannot be less than {MinAmount}");

            if (string.IsNullOrWhiteSpace(dto.MeterNumber))
                throw new ArgumentException("Meter number is not valid", nameof(dto.MeterNumber));

            var formattedPhone = NormalizePhoneNumber(dto.PhoneNumber);
            if (formattedPhone.Length != 12 || !formattedPhone.StartsWith("256"))
                throw new ArgumentException("Phone number is not valid", nameof(dto.PhoneNumber));

            const double ChargeRate = 0.1;
            var charges = dto.Amount * ChargeRate;

            var payment = new UtilityPayment
            {
                UtilityType = "PREPAID WATER",
                Description = "Water Payment",
                TransactionID = Guid.NewGuid().ToString(),
                PaymentMethod = "MOMO",
                Status = "PENDING",
                Amount = dto.Amount,
                Charges = charges,
                MeterNumber = dto.MeterNumber,
                PhoneNumber = formattedPhone
            };

            await _context.UtilityPayments.AddAsync(payment);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<UtilityPayment>> GetUtilityPaymentByStatus(string status)
        {
            var payments = await _context.UtilityPayments
                .Where(tp => tp.Status == status)
                .ToListAsync();
            return payments;
        }

        private static string NormalizePhoneNumber(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return string.Empty;

            // Keep only digit characters
            var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());

            // Replace leading '0' with country code
            if (digits.StartsWith("0"))
                digits = "256" + digits.Substring(1);
            else if (!digits.StartsWith("256"))
                digits = "256" + digits;

            return digits;
        }

        public async Task<IEnumerable<UtilityPayment>> GetUtilityPaymentByDateRange(DateTime startDate, DateTime endDate)
        {

            //format dates to be date only
            startDate = startDate.Date;
            endDate = endDate.Date;

            //query the database for payments within the date range
            if (startDate > endDate)
                throw new ArgumentException("Start date cannot be greater than end date");

            if (startDate == endDate)
                endDate = startDate.AddDays(1);

            var payments = await _context.UtilityPayments
                .Where(tp => DateOnly.FromDateTime(tp.CreatedAt) >= DateOnly.FromDateTime(startDate) && DateOnly.FromDateTime(tp.CreatedAt) <= DateOnly.FromDateTime(endDate))
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<UtilityPayment>> GetUtilityPaymentByMeterNumber(string meternumber)
        {
            var payments = await _context.UtilityPayments
                .Where(tp => tp.MeterNumber == meternumber)
                .ToListAsync();
            return payments;
        }

        public async Task<IEnumerable<UtilityPayment>> GetUtilityPymtsPendingTokenGeneration()
        {
            var payments = await _context.UtilityPayments
                .Where(tp => tp.Status == "SUCCESSFUL" && tp.Token == null && tp.IsTokenGenerated == false)
                .ToListAsync();
            return payments;
        }

        public async Task UpdateUtilityPayment(UtilityPayment utilityPayment)
        {
            if (utilityPayment == null)
                throw new ArgumentNullException(nameof(utilityPayment));
            //check if payment exists
            var existingPayment = await _context.UtilityPayments
                .FirstOrDefaultAsync(tp => tp.TransactionID == utilityPayment.TransactionID);
            if (existingPayment == null)
                throw new Exception("Payment not found.");
            //map dto to entity
            existingPayment.Token = utilityPayment.Token;
            existingPayment.Units = utilityPayment.Units;

            _context.UtilityPayments.Update(existingPayment);
            await _context.SaveChangesAsync();
        }
    }
}
