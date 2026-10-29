using Application.Interfaces.PaymentService;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.PaymentServices;

public sealed class AdminPayoutReconciliationService(AppDbContext db, DangoPaymentClient dango) : IAdminPayoutReconciliation
{
    private IQueryable<WalletTransaction> PendingDangoPayouts() => db.WalletTransactions.AsNoTracking()
        .Where(x => x.Amount < 0 && (x.Status == "PENDING AT TELCOM" || x.Status == "PENDING AT TELECOM" || x.Status == "PENDING AT THE BANK") &&
            db.Set<PaymentGatewaySubmission>().Any(s => s.Operation == "Payout" && s.Provider == "DangoPayment" && s.Reference == x.TransactionId));

    public async Task<AdminPayoutReconciliationPage> GetAsync(string? reference, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || reference?.Length > 128)
            throw new ArgumentException("Invalid search or pagination.");
        var query = PendingDangoPayouts();
        if (!string.IsNullOrWhiteSpace(reference)) query = query.Where(x => x.TransactionId == reference.Trim());
        var rows = await query.OrderByDescending(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize + 1)
            .Select(x => new AdminPayoutReconciliationItem(x.Id, x.TransactionId, -x.Amount, x.Status, x.VendorTranId,
                x.Wallet.Landlord.FullName)).ToListAsync(ct);
        return new(rows.Take(pageSize).ToList(), page, pageSize, rows.Count > pageSize);
    }

    public async Task<BillPaymentAdminPage> GetBillPaymentsAsync(string? reference, string? status, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || reference?.Length > 128 || status?.Length > 32)
            throw new ArgumentException("Invalid search, status or pagination.");
        var query = db.Set<BillPaymentInstruction>().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(reference))
        {
            var value = reference.Trim();
            query = query.Where(x => x.RequestReference == value || x.NwscAccount == value || x.MeterNumber == value);
        }
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status.Trim().ToUpperInvariant());
        var rows = await query.OrderByDescending(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize + 1)
            .Select(x => new BillPaymentAdminItem(x.Id, x.RequestReference, x.NwscAccount, x.MeterNumber,
                x.Amount, x.Status, x.ProviderReference, x.Reason, x.CreatedAtUtc,
                x.SubmittedAtUtc, x.ConfirmedAtUtc, x.WalletDebitedAtUtc)).ToListAsync(ct);
        return new(rows.Take(pageSize).ToList(), page, pageSize, rows.Count > pageSize);
    }

    public async Task<FailAndReversePayoutResponse> FailAndReverseAsync(int id, FailAndReversePayoutRequest request, string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(actor)) throw new UnauthorizedAccessException("An authenticated administrator is required.");
        if (!request.ConfirmUnpaid || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length is < 5 or > 500 ||
            string.IsNullOrWhiteSpace(request.ConfirmedTransactionId) || request.ConfirmedTransactionId.Length > 128)
            throw new ArgumentException("Confirm the exact transaction ID, independent unpaid verification, and a reason of 5–500 characters.");
        var row = await PendingDangoPayouts().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (row == null)
        {
            if (!await db.WalletTransactions.AnyAsync(x => x.Id == id, ct)) throw new KeyNotFoundException("Payout not found.");
            throw new InvalidOperationException("Payout is no longer an eligible pending Dango withdrawal. Refresh the list.");
        }
        if (request.ConfirmedTransactionId != row.TransactionId)
            throw new ArgumentException("The confirmed transaction ID does not match the selected payout.");
        if (!await dango.HasUnresolvedNotFoundPayoutAsync(row.TransactionId, ct))
            throw new InvalidOperationException("Provider status is not a matching transaction-not-found response. No refund was made; reconcile and refresh.");
        row.ReasonAtTelecom = $"Administrator {actor}: verified unpaid; manually failed and reversed. Reason: {request.Reason.Trim()}";
        if (!await WalletPayoutReversal.ReverseAsync(db, row, matchById: true, pendingOnly: true, ct: ct))
            throw new InvalidOperationException("The payout changed during reconciliation. No additional refund was made; refresh the list.");
        return new(row.TransactionId, "REVERSED", -row.Amount);
    }
}
