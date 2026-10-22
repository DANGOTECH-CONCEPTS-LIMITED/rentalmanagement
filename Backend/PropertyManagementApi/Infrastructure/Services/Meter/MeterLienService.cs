using Application.Interfaces.Meter;
using Domain.Dtos.Meters;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Infrastructure.Services.Meter;

public class MeterLienService : IMeterLienService
{
    private readonly AppDbContext _db;
    private readonly IMeterFeeService _fees;
    public MeterLienService(AppDbContext db, IMeterFeeService fees) { _db = db; _fees = fees; }

    private async Task<UtilityMeter> AuthorizeAsync(int meterId, string email)
    {
        var user = await _db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Email == email);
        if (user == null || (user.SystemRoleId != 1 && user.SystemRoleId != 4))
            throw new UnauthorizedAccessException();
        var meter = await _db.UtilityMeters.AsNoTracking().SingleOrDefaultAsync(x => x.Id == meterId)
            ?? throw new KeyNotFoundException("Meter not found.");
        if (user.SystemRoleId != 1 && meter.LandLordId != user.Id) throw new UnauthorizedAccessException();
        return meter;
    }

    // All lien writes and payment allocations lock the same meter row, across application instances.
    private async Task LockMeterAsync(int meterId)
    {
        if (_db.Database.IsMySql())
            await _db.UtilityMeters.FromSqlInterpolated($"SELECT * FROM UtilityMeters WHERE Id = {meterId} FOR UPDATE").AsNoTracking().ToListAsync();
    }

    public async Task<MeterLienSummaryDto> GetAsync(int meterId, string requesterEmail)
    {
        var meter = await AuthorizeAsync(meterId, requesterEmail);
        return await SummaryAsync(meter);
    }

    private async Task<MeterLienSummaryDto> SummaryAsync(UtilityMeter meter)
    {
        var policy = await _db.MeterLienPolicies.AsNoTracking().SingleOrDefaultAsync(x => x.UtilityMeterId == meter.Id);
        var liens = await _db.MeterLiens.AsNoTracking().Where(x => x.UtilityMeterId == meter.Id)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).ToListAsync();
        var history = await (from r in _db.MeterLienRepayments.AsNoTracking()
                             join p in _db.UtilityPayments.AsNoTracking() on r.PaymentId equals p.Id
                             where r.UtilityMeterId == meter.Id && r.LienAmount > 0
                             orderby r.CreatedAt descending
                             select new MeterLienRepaymentDto(r.PaymentId, p.TransactionID, r.PaymentAmount, r.LienAmount, r.TokenAmount, DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc))).ToListAsync();
        return new MeterLienSummaryDto
        {
            MeterId = meter.Id, MeterNumber = meter.MeterNumber,
            TotalAmount = liens.Sum(x => x.Amount), AmountPaid = liens.Sum(x => x.AmountPaid),
            Balance = liens.Sum(x => x.Amount - x.AmountPaid),
            RepaymentMode = policy?.RepaymentMode ?? "FullFirst", RepaymentPercentage = policy?.RepaymentPercentage ?? 100m,
            Liens = liens.Select(x => new MeterLienItemDto(x.Id, x.Amount, x.AmountPaid, x.Amount - x.AmountPaid, x.Description, DateTime.SpecifyKind(x.CreatedAt, DateTimeKind.Utc))).ToList(),
            Repayments = history
        };
    }

    private static void ValidatePolicy(SetMeterLienPolicyDto request)
    {
        if (request.RepaymentMode != "FullFirst" && request.RepaymentMode != "Percentage")
            throw new ArgumentException("Repayment mode must be FullFirst or Percentage.");
        if (request.RepaymentPercentage <= 0 || request.RepaymentPercentage > 100 || decimal.Round(request.RepaymentPercentage, 18) != request.RepaymentPercentage)
            throw new ArgumentException("Repayment percentage must be greater than zero and at most 100 (up to 18 decimal places).");
    }

    private async Task UpdatePolicyAsync(int meterId, SetMeterLienPolicyDto request)
    {
        var policy = await _db.MeterLienPolicies.SingleOrDefaultAsync(x => x.UtilityMeterId == meterId);
        if (policy == null) { policy = new MeterLienPolicy { UtilityMeterId = meterId }; _db.MeterLienPolicies.Add(policy); }
        policy.RepaymentMode = request.RepaymentMode;
        policy.RepaymentPercentage = request.RepaymentMode == "FullFirst" ? 100m : request.RepaymentPercentage;
    }

    public async Task<MeterLienSummaryDto> AddAsync(int meterId, AddMeterLienDto request, string requesterEmail)
    {
        ValidatePolicy(request);
        if (request.Amount <= 0 || request.Amount > 9999999999999999.99m || decimal.Round(request.Amount, 2) != request.Amount)
            throw new ArgumentException("Amount must be positive, at most 9999999999999999.99 and have at most two decimal places.");
        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Length > 500)
            throw new ArgumentException("Description is required and must not exceed 500 characters.");
        var meter = await AuthorizeAsync(meterId, requesterEmail);
        await using var tx = await _db.Database.BeginTransactionAsync(_db.Database.IsMySql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable);
        await LockMeterAsync(meterId);
        await AuthorizeAsync(meterId, requesterEmail);
        await UpdatePolicyAsync(meterId, request);
        var userId = await _db.Users.Where(x => x.Email == requesterEmail).Select(x => x.Id).SingleAsync();
        _db.MeterLiens.Add(new MeterLien { UtilityMeterId = meterId, Amount = request.Amount, Description = request.Description.Trim(), CreatedByUserId = userId });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await SummaryAsync(meter);
    }

    public async Task<MeterLienSummaryDto> SetPolicyAsync(int meterId, SetMeterLienPolicyDto request, string requesterEmail)
    {
        ValidatePolicy(request);
        var meter = await AuthorizeAsync(meterId, requesterEmail);
        await using var tx = await _db.Database.BeginTransactionAsync(_db.Database.IsMySql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable);
        await LockMeterAsync(meterId);
        await AuthorizeAsync(meterId, requesterEmail);
        await UpdatePolicyAsync(meterId, request);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return await SummaryAsync(meter);
    }

    public static decimal CalculateLienAmount(decimal available, decimal balance, string mode, decimal percentage)
    {
        if (available < 0 || balance < 0 || percentage <= 0 || percentage > 100 || (mode != "FullFirst" && mode != "Percentage"))
            throw new ArgumentException("Invalid lien allocation inputs.");
        // Round down percentage deductions so a sub-cent allocation never exceeds the configured share.
        var budget = mode == "FullFirst" ? available : decimal.Floor(available * percentage) / 100m;
        return Math.Min(balance, budget);
    }

    public async Task<MeterLienRepayment> AllocatePaymentAsync(int paymentId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(_db.Database.IsMySql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable);
        var payment = await _db.UtilityPayments.AsNoTracking().SingleAsync(x => x.Id == paymentId);
        var meter = await _db.UtilityMeters.AsNoTracking().SingleOrDefaultAsync(x => x.MeterNumber == payment.MeterNumber);
        if (meter != null) await LockMeterAsync(meter.Id);
        // Lock the payment too, including unregistered meters, before reading its idempotency record.
        if (_db.Database.IsMySql())
            await _db.UtilityPayments.FromSqlInterpolated($"SELECT * FROM UtilityPayments WHERE Id = {paymentId} FOR UPDATE").AsNoTracking().ToListAsync();
        var existing = await _db.MeterLienRepayments.AsNoTracking().SingleOrDefaultAsync(x => x.PaymentId == paymentId);
        if (existing != null) { await tx.CommitAsync(); return existing; }
        payment = await _db.UtilityPayments.AsNoTracking().SingleAsync(x => x.Id == paymentId);
        if (payment.Status != "SUCCESSFUL" || payment.IsTokenGenerated || payment.Token != null)
            throw new InvalidOperationException("Only successful, unvended payments may be allocated.");
        var paymentAmount = decimal.Round(checked((decimal)payment.Amount), 2, MidpointRounding.AwayFromZero);
        if (paymentAmount <= 0 || paymentAmount > 9999999999999999.99m) throw new InvalidOperationException("Invalid payment amount.");
        var feeAmount = decimal.Round(checked((decimal)await _fees.SettleFeesForPaymentAsync(paymentId)), 2, MidpointRounding.AwayFromZero);
        if (feeAmount < 0 || feeAmount > paymentAmount) throw new InvalidOperationException("Invalid monthly fee allocation.");
        var policy = meter == null ? null : await _db.MeterLienPolicies.AsNoTracking().SingleOrDefaultAsync(x => x.UtilityMeterId == meter.Id);
        var liens = meter == null ? new List<MeterLien>() : await _db.MeterLiens
            .Where(x => x.UtilityMeterId == meter.Id && x.AmountPaid < x.Amount).OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).ToListAsync();
        foreach (var lien in liens) await _db.Entry(lien).ReloadAsync();
        var mode = policy?.RepaymentMode ?? "FullFirst";
        var percentage = policy?.RepaymentPercentage ?? 100m;
        var lienAmount = CalculateLienAmount(paymentAmount - feeAmount, liens.Sum(x => x.Amount - x.AmountPaid), mode, percentage);
        var repayment = new MeterLienRepayment
        {
            PaymentId = paymentId, UtilityMeterId = meter?.Id, PaymentAmount = paymentAmount, FeeAmount = feeAmount,
            LienAmount = lienAmount, TokenAmount = paymentAmount - feeAmount - lienAmount,
            RepaymentMode = mode, RepaymentPercentage = percentage
        };
        _db.MeterLienRepayments.Add(repayment);
        await _db.SaveChangesAsync();
        var remaining = lienAmount;
        foreach (var lien in liens)
        {
            if (remaining <= 0) break;
            var amount = Math.Min(remaining, lien.Amount - lien.AmountPaid);
            lien.AmountPaid += amount;
            remaining -= amount;
            _db.MeterLienAllocations.Add(new MeterLienAllocation { MeterLienId = lien.Id, MeterLienRepaymentId = repayment.Id, Amount = amount });
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return repayment;
    }

    public async Task<bool> TryClaimVendAsync(int paymentId) =>
        await _db.MeterLienRepayments.Where(x => x.PaymentId == paymentId && x.VendState == "Ready")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.VendState, "InFlight").SetProperty(x => x.VendStartedAt, DateTime.UtcNow).SetProperty(x => x.VendError, (string?)null)) == 1;

    public async Task CompleteVendAsync(int paymentId, string? token, string units)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        var updated = await _db.MeterLienRepayments.Where(x => x.PaymentId == paymentId && x.VendState == "InFlight")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.VendState, "Complete"));
        if (updated != 1) throw new InvalidOperationException("Payment is not claimed for vending.");
        await _db.UtilityPayments.Where(x => x.Id == paymentId)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsTokenGenerated, true).SetProperty(x => x.Token, token).SetProperty(x => x.Units, units));
        await tx.CommitAsync();
    }

    public async Task RecordVendFailureAsync(int paymentId, string error, bool definitiveFailure)
    {
        error = error.Length > 500 ? error[..500] : error;
        await _db.MeterLienRepayments.Where(x => x.PaymentId == paymentId && x.VendState == "InFlight")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.VendState, definitiveFailure ? "Ready" : "InFlight").SetProperty(x => x.VendError, error));
    }

    public async Task<T> WithVendAuthorizationAsync<T>(string meterNumber, decimal amount, int? paymentId, Func<Task<T>> vend)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(_db.Database.IsMySql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable);
        var meter = await _db.UtilityMeters.AsNoTracking().SingleOrDefaultAsync(x => x.MeterNumber == meterNumber);
        if (meter != null) await LockMeterAsync(meter.Id);
        if (paymentId.HasValue)
        {
            var authorized = await (from r in _db.MeterLienRepayments.AsNoTracking()
                                    join p in _db.UtilityPayments.AsNoTracking() on r.PaymentId equals p.Id
                                    where r.PaymentId == paymentId && r.VendState == "InFlight" && r.TokenAmount == amount && p.MeterNumber == meterNumber && p.Status == "SUCCESSFUL" && !p.IsTokenGenerated
                                    select r.Id).AnyAsync();
            if (!authorized) throw new InvalidOperationException("Vend must match a claimed payment allocation.");
        }
        else if (meter != null && await _db.MeterLiens.AnyAsync(x => x.UtilityMeterId == meter.Id && x.AmountPaid < x.Amount))
            throw new InvalidOperationException("This meter has an outstanding lien. Vend through a successful utility payment.");
        var result = await vend();
        await tx.CommitAsync();
        return result;
    }
}
