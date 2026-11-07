using Application.Interfaces.Analytics;
using Application.Interfaces.Billing;
using Application.Interfaces.Deposits;
using Domain;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Deposits;

/// <summary>
/// Security deposits: holding them, recording damage/cleaning claims, and settling the tenancy.
/// Arrears are cleared through <see cref="IRentInvoicingService"/> so invoice balances, statuses and
/// the status history stay consistent with a normal payment.
/// </summary>
public sealed class DepositService(
    AppDbContext db,
    IRentInvoicingService invoicing,
    IPaymentStatusHistory history,
    ILogger<DepositService> logger) : IDepositService
{
    public async Task<MoveOutStatementDto> GetStatementAsync(int rentalContractId, CancellationToken ct = default)
    {
        var deposit = await EnsureDepositAsync(rentalContractId, ct)
            ?? throw new KeyNotFoundException("Rental contract not found.");

        return await BuildStatementAsync(deposit, ct);
    }

    public async Task<DepositDeductionDto> AddDeductionAsync(
        int rentalContractId, string category, decimal amount, string? description, string? actor, CancellationToken ct = default)
    {
        var normalizedCategory = DepositDeductionCategory.All.FirstOrDefault(x => string.Equals(x, category, StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException($"Unknown deduction category '{category}'.");

        var value = Money.Round(amount);
        if (value <= 0)
            throw new ArgumentException("Deduction amount must be greater than zero.");

        var deposit = await EnsureDepositAsync(rentalContractId, ct)
            ?? throw new KeyNotFoundException("Rental contract not found.");
        if (deposit.Status != SecurityDepositStatus.Held)
            throw new InvalidOperationException("Deductions cannot be added after the deposit is settled.");

        var deduction = new DepositDeduction
        {
            SecurityDepositId = deposit.Id,
            Category = normalizedCategory,
            Amount = value,
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = actor
        };
        db.DepositDeductions.Add(deduction);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Deposit deduction {Amount} ({Category}) added to contract {ContractId}.",
            value, normalizedCategory, rentalContractId);

        return ToDto(deduction);
    }

    public async Task RemoveDeductionAsync(int deductionId, string? actor, CancellationToken ct = default)
    {
        var deduction = await db.DepositDeductions
            .Include(x => x.SecurityDeposit)
            .FirstOrDefaultAsync(x => x.Id == deductionId, ct)
            ?? throw new KeyNotFoundException("Deduction not found.");

        if (deduction.SecurityDeposit?.Status != SecurityDepositStatus.Held)
            throw new InvalidOperationException("Deductions cannot be removed after the deposit is settled.");

        db.DepositDeductions.Remove(deduction);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Deposit deduction {DeductionId} removed by {Actor}.", deductionId, actor ?? "system");
    }

    public async Task<SettleDepositResult> SettleAsync(
        int rentalContractId, string? actor, string? notes, CancellationToken ct = default)
    {
        var deposit = await db.SecurityDeposits
            .Include(x => x.RentalContract).ThenInclude(c => c!.Tenant)
            .FirstOrDefaultAsync(x => x.RentalContractId == rentalContractId, ct)
            ?? await EnsureDepositAsync(rentalContractId, ct)
            ?? throw new KeyNotFoundException("Rental contract not found.");

        if (deposit.Status != SecurityDepositStatus.Held)
            throw new InvalidOperationException("This deposit has already been settled.");

        var remaining = Money.Round(deposit.AmountHeld);
        var appliedToArrears = 0m;
        var invoicesSettled = 0;

        // Contractual arrears come first, oldest invoice first.
        var unpaid = await db.RentInvoices.AsNoTracking()
            .Where(i => i.RentalContractId == rentalContractId &&
                        i.Status != RentInvoiceStatus.Paid &&
                        i.Status != RentInvoiceStatus.Cancelled)
            .OrderBy(i => i.DueDate)
            .Select(i => new { i.Id, i.Amount, i.AmountPaid })
            .ToListAsync(ct);

        foreach (var invoice in unpaid)
        {
            if (remaining <= 0m) break;
            var balance = Money.Round(invoice.Amount - invoice.AmountPaid);
            if (balance <= 0m) continue;

            var applied = Math.Min(balance, remaining);
            // Reuses the invoicing service so the invoice status and its history row are consistent.
            await invoicing.ApplyPaymentAsync(invoice.Id, applied, actor ?? "deposit-settlement", ct);

            remaining = Money.Round(remaining - applied);
            appliedToArrears = Money.Round(appliedToArrears + applied);
            invoicesSettled++;
        }

        var deductions = await db.DepositDeductions.AsNoTracking()
            .Where(x => x.SecurityDepositId == deposit.Id)
            .ToListAsync(ct);
        var totalDeductions = Money.Round(deductions.Sum(x => x.Amount));
        var appliedToDeductions = Money.Round(Math.Min(remaining, totalDeductions));
        remaining = Money.Round(remaining - appliedToDeductions);

        var arrearsShortfall = Money.Round(Math.Max(0m, unpaid.Sum(x => x.Amount - x.AmountPaid) - appliedToArrears));
        var deductionShortfall = Money.Round(Math.Max(0m, totalDeductions - appliedToDeductions));
        var refund = Money.Round(Math.Max(0m, remaining));

        deposit.DeductedAmount = Money.Round(appliedToArrears + appliedToDeductions);
        deposit.RefundAmount = refund;
        deposit.Status = refund > 0m ? SecurityDepositStatus.Settled : SecurityDepositStatus.Forfeited;
        deposit.SettledAtUtc = DateTime.UtcNow;
        deposit.SettledBy = actor;
        deposit.Notes = string.IsNullOrWhiteSpace(notes) ? deposit.Notes : notes.Trim();

        var now = DateTime.UtcNow;
        if (deposit.RentalContract is { } contract)
        {
            contract.Status = "TERMINATED";
            contract.TerminatedAt ??= now;
            contract.TerminationReason ??= "Move-out settlement";
        }
        if (deposit.RentalContract?.Tenant is { } tenant)
        {
            tenant.Active = false;
        }

        await db.SaveChangesAsync(ct);
        await history.RecordAsync(PaymentStatusSubject.RentalContract, rentalContractId, SecurityDepositStatus.Held,
            deposit.Status,
            $"Deposit settled: applied {appliedToArrears:N2} to arrears, {appliedToDeductions:N2} to deductions, refund {refund:N2}.",
            actor, reference: $"DEPOSIT-{deposit.Id}", amount: deposit.AmountHeld, ct: ct);

        logger.LogInformation(
            "Deposit {DepositId} settled: arrears {Arrears}, deductions {Deductions}, refund {Refund}, shortfall {Shortfall}.",
            deposit.Id, appliedToArrears, appliedToDeductions, refund, Money.Round(arrearsShortfall + deductionShortfall));

        return new SettleDepositResult(deposit.Id, deposit.Status, appliedToArrears, appliedToDeductions, refund,
            Money.Round(arrearsShortfall + deductionShortfall), invoicesSettled);
    }

    public async Task<DepositPage> GetDepositsAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        await EnsureMissingDepositsAsync(ct);

        var query = db.SecurityDeposits.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(x => x.Status == SecurityDepositStatus.Held ? 0 : 1)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new DepositRowDto(
                x.Id,
                x.RentalContractId,
                x.TenantId,
                x.RentalContract!.Tenant!.FullName,
                x.RentalContract!.Property!.Name,
                x.AmountHeld,
                x.DeductedAmount,
                x.RefundAmount,
                x.Status,
                x.RentalContract!.EndDate,
                x.SettledAtUtc))
            .ToListAsync(ct);

        return new DepositPage(rows, page, pageSize, total);
    }

    private async Task<MoveOutStatementDto> BuildStatementAsync(SecurityDeposit deposit, CancellationToken ct)
    {
        var contract = await db.RentalContracts.AsNoTracking()
            .Where(c => c.Id == deposit.RentalContractId)
            .Select(c => new { c.EndDate })
            .FirstOrDefaultAsync(ct);

        var unpaid = await db.RentInvoices.AsNoTracking()
            .Where(i => i.RentalContractId == deposit.RentalContractId &&
                        i.Status != RentInvoiceStatus.Paid &&
                        i.Status != RentInvoiceStatus.Cancelled)
            .Select(i => new { i.Amount, i.AmountPaid })
            .ToListAsync(ct);

        var outstandingArrears = Money.Round(unpaid.Sum(x => x.Amount - x.AmountPaid));

        var deductions = await db.DepositDeductions.AsNoTracking()
            .Where(x => x.SecurityDepositId == deposit.Id)
            .OrderBy(x => x.Id)
            .ToListAsync(ct);
        var totalDeductions = Money.Round(deductions.Sum(x => x.Amount));

        var refundable = Money.Round(Math.Max(0m, deposit.AmountHeld - outstandingArrears - totalDeductions));
        var shortfall = Money.Round(Math.Max(0m, outstandingArrears + totalDeductions - deposit.AmountHeld));

        return new MoveOutStatementDto(
            deposit.RentalContractId,
            deposit.Id,
            deposit.Status,
            deposit.AmountHeld,
            outstandingArrears,
            unpaid.Count,
            deductions.Select(ToDto).ToList(),
            totalDeductions,
            deposit.Status == SecurityDepositStatus.Held ? refundable : deposit.RefundAmount,
            shortfall,
            contract?.EndDate,
            deposit.SettledAtUtc,
            deposit.Notes);
    }

    /// <summary>Creates the deposit row for a contract the first time it is touched.</summary>
    private async Task<SecurityDeposit?> EnsureDepositAsync(int rentalContractId, CancellationToken ct)
    {
        var tracked = db.ChangeTracker.Entries<SecurityDeposit>()
            .Select(e => e.Entity)
            .FirstOrDefault(e => e.RentalContractId == rentalContractId);

        var existing = tracked ?? await db.SecurityDeposits
            .Include(x => x.RentalContract).ThenInclude(c => c!.Tenant)
            .FirstOrDefaultAsync(x => x.RentalContractId == rentalContractId, ct);
        if (existing != null) return existing;

        var contract = await db.RentalContracts
            .Include(c => c.Tenant)
            .FirstOrDefaultAsync(c => c.Id == rentalContractId, ct);
        if (contract == null) return null;

        var deposit = new SecurityDeposit
        {
            RentalContractId = contract.Id,
            TenantId = contract.TenantId,
            PropertyId = contract.PropertyId,
            AmountHeld = Money.Round(contract.Deposit),
            Status = SecurityDepositStatus.Held,
            CreatedAtUtc = DateTime.UtcNow
        };
        db.SecurityDeposits.Add(deposit);
        await db.SaveChangesAsync(ct);

        deposit.RentalContract = contract;
        return deposit;
    }

    /// <summary>Backfills deposit rows for legacy contracts that were created before deposits existed.</summary>
    private async Task EnsureMissingDepositsAsync(CancellationToken ct)
    {
        var missing = await db.RentalContracts.AsNoTracking()
            .Where(c => c.Deposit > 0 && !db.SecurityDeposits.Any(d => d.RentalContractId == c.Id))
            .Select(c => new { c.Id, c.TenantId, c.PropertyId, c.Deposit })
            .ToListAsync(ct);

        if (missing.Count == 0) return;

        foreach (var contract in missing)
        {
            db.SecurityDeposits.Add(new SecurityDeposit
            {
                RentalContractId = contract.Id,
                TenantId = contract.TenantId,
                PropertyId = contract.PropertyId,
                AmountHeld = Money.Round(contract.Deposit),
                Status = SecurityDepositStatus.Held,
                CreatedAtUtc = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync(ct);
    }

    private static DepositDeductionDto ToDto(DepositDeduction deduction) => new(
        deduction.Id, deduction.Category, deduction.Amount, deduction.Description,
        deduction.CreatedAtUtc, deduction.CreatedBy);
}
