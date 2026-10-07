using Application.Interfaces.Meter;
using Domain.Dtos.Meters;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Services.Meter
{
    public class MeterFeeService : IMeterFeeService
    {
        // Serialises settlement/charging so concurrent payments cannot over-apply the same charge.
        private static readonly SemaphoreSlim Gate = new(1, 1);

        private readonly AppDbContext _context;

        public MeterFeeService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<MeterFeeSummaryDto> SetMonthlyFeeAsync(int ownerId, double monthlyFee, string requesterEmail, bool isAdmin)
        {
            if (monthlyFee < 0 || double.IsNaN(monthlyFee) || double.IsInfinity(monthlyFee))
                throw new ArgumentException("Monthly fee must be zero or greater.");

            var owner = await GetAuthorizedOwnerAsync(ownerId, requesterEmail, isAdmin);

            monthlyFee = Math.Round(monthlyFee, 2);
            if (monthlyFee > 0 && (owner.MonthlyMeterFee <= 0 || owner.MonthlyMeterFeeEffectiveFrom == null))
                owner.MonthlyMeterFeeEffectiveFrom = DateTime.Now;
            else if (monthlyFee == 0)
                owner.MonthlyMeterFeeEffectiveFrom = null;

            owner.MonthlyMeterFee = monthlyFee;
            await _context.SaveChangesAsync();

            return await BuildSummaryAsync(owner);
        }

        public async Task<MeterFeeSummaryDto> GetFeeSummaryAsync(int ownerId, string requesterEmail, bool isAdmin)
        {
            var owner = await GetAuthorizedOwnerAsync(ownerId, requesterEmail, isAdmin);
            return await BuildSummaryAsync(owner);
        }

        public async Task<int> ApplyDueMonthlyFeesAsync(DateTime now)
        {
            await Gate.WaitAsync();
            try
            {
                var owners = await _context.Users
                    .Where(u => u.MonthlyMeterFee > 0 && u.MonthlyMeterFeeEffectiveFrom != null)
                    .ToListAsync();

                var created = 0;
                foreach (var owner in owners)
                {
                    var meters = await _context.UtilityMeters
                        .Where(m => m.LandLordId == owner.Id)
                        .ToListAsync();

                    foreach (var meter in meters)
                    {
                        var existing = (await _context.MeterFeeCharges
                            .Where(c => c.UtilityMeterId == meter.Id)
                            .Select(c => c.Period)
                            .ToListAsync()).ToHashSet();

                        // A meter is never charged for months before it was registered or before the fee was set.
                        var startFrom = owner.MonthlyMeterFeeEffectiveFrom!.Value > meter.DateCreated
                            ? owner.MonthlyMeterFeeEffectiveFrom.Value
                            : meter.DateCreated;
                        var month = new DateTime(startFrom.Year, startFrom.Month, 1);

                        // A month is charged once its last day has been reached.
                        while (month.AddMonths(1).AddDays(-1).Date <= now.Date)
                        {
                            var period = month.ToString("yyyy-MM");
                            if (!existing.Contains(period))
                            {
                                _context.MeterFeeCharges.Add(new MeterFeeCharge
                                {
                                    UtilityMeterId = meter.Id,
                                    MeterNumber = meter.MeterNumber,
                                    Period = period,
                                    Amount = owner.MonthlyMeterFee,
                                    CreatedAt = now
                                });
                                created++;
                            }
                            month = month.AddMonths(1);
                        }
                    }
                }

                if (created > 0)
                    await _context.SaveChangesAsync();

                return created;
            }
            finally
            {
                Gate.Release();
            }
        }

        public async Task<double> SettleFeesForPaymentAsync(int paymentId)
        {
            await Gate.WaitAsync();
            try
            {
                var payment = await _context.UtilityPayments.FirstOrDefaultAsync(p => p.Id == paymentId);
                if (payment == null)
                    throw new Exception("Payment not found.");

                if (payment.FeesProcessed)
                    return payment.FeesSettledAmount;

                var charges = await _context.MeterFeeCharges
                    .Where(c => c.MeterNumber == payment.MeterNumber && c.AmountPaid < c.Amount)
                    .OrderBy(c => c.Period)
                    .ToListAsync();

                var remaining = Math.Round(payment.Amount, 2);
                var settled = 0d;
                foreach (var charge in charges)
                {
                    if (remaining <= 0)
                        break;

                    var due = Math.Round(charge.Amount - charge.AmountPaid, 2);
                    var applied = Math.Min(due, remaining);
                    charge.AmountPaid = Math.Round(charge.AmountPaid + applied, 2);
                    if (charge.AmountPaid >= charge.Amount)
                        charge.SettledAt = DateTime.Now;

                    remaining = Math.Round(remaining - applied, 2);
                    settled = Math.Round(settled + applied, 2);
                }

                payment.FeesSettledAmount = settled;
                payment.FeesProcessed = true;
                await _context.SaveChangesAsync();
                return settled;
            }
            finally
            {
                Gate.Release();
            }
        }

        public async Task<MeterFeeReportDto> GetFeeReportAsync(string requesterEmail, bool isAdmin, string? fromPeriod, string? toPeriod)
        {
            var query = from c in _context.MeterFeeCharges.AsNoTracking()
                        join m in _context.UtilityMeters.AsNoTracking() on c.UtilityMeterId equals m.Id
                        select new { c, m.LandLordId, OwnerName = m.User.FullName };

            if (!isAdmin)
            {
                var requesterId = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Email == requesterEmail)
                    .Select(u => (int?)u.Id)
                    .FirstOrDefaultAsync();
                if (requesterId == null)
                    throw new UnauthorizedAccessException("User not found.");
                query = query.Where(x => x.LandLordId == requesterId);
            }

            // Periods are yyyy-MM so string comparison orders them chronologically.
            if (!string.IsNullOrWhiteSpace(fromPeriod))
                query = query.Where(x => x.c.Period.CompareTo(fromPeriod) >= 0);
            if (!string.IsNullOrWhiteSpace(toPeriod))
                query = query.Where(x => x.c.Period.CompareTo(toPeriod) <= 0);

            var rows = (await query
                    .OrderByDescending(x => x.c.Period)
                    .ThenBy(x => x.c.MeterNumber)
                    .ToListAsync())
                .Select(x => new MeterFeeReportRowDto
                {
                    UtilityMeterId = x.c.UtilityMeterId,
                    MeterNumber = x.c.MeterNumber,
                    OwnerName = x.OwnerName,
                    Period = x.c.Period,
                    Amount = x.c.Amount,
                    AmountPaid = x.c.AmountPaid,
                    Balance = Math.Round(x.c.Amount - x.c.AmountPaid, 2),
                    ChargedAt = x.c.CreatedAt,
                    SettledAt = x.c.SettledAt
                }).ToList();

            return new MeterFeeReportDto
            {
                TotalCharged = Math.Round(rows.Sum(r => r.Amount), 2),
                TotalCollected = Math.Round(rows.Sum(r => r.AmountPaid), 2),
                TotalOutstanding = Math.Round(rows.Sum(r => r.Balance), 2),
                Rows = rows
            };
        }

        private async Task<User> GetAuthorizedOwnerAsync(int ownerId, string requesterEmail, bool isAdmin)
        {
            var owner = await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerId)
                ?? throw new KeyNotFoundException("Utility user not found.");

            if (isAdmin)
                return owner;

            if (!string.Equals(owner.Email, requesterEmail, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("You can only manage your own monthly fee.");

            return owner;
        }

        private async Task<MeterFeeSummaryDto> BuildSummaryAsync(User owner)
        {
            var charges = await _context.MeterFeeCharges
                .AsNoTracking()
                .Where(c => _context.UtilityMeters.Any(m => m.Id == c.UtilityMeterId && m.LandLordId == owner.Id))
                .OrderByDescending(c => c.Period)
                .ThenBy(c => c.MeterNumber)
                .ToListAsync();

            return new MeterFeeSummaryDto
            {
                OwnerId = owner.Id,
                OwnerName = owner.FullName,
                MonthlyFee = owner.MonthlyMeterFee,
                OutstandingBalance = Math.Round(charges.Sum(c => c.Amount - c.AmountPaid), 2),
                Charges = charges.Select(c => new MeterFeeChargeDto
                {
                    Id = c.Id,
                    MeterNumber = c.MeterNumber,
                    Period = c.Period,
                    Amount = c.Amount,
                    AmountPaid = c.AmountPaid,
                    CreatedAt = c.CreatedAt,
                    SettledAt = c.SettledAt
                }).ToList()
            };
        }
    }
}
