using Application.Interfaces.Analytics;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Analytics;

/// <summary>
/// Append-only status trail for payments. Writes are best-effort by design: losing an audit row must
/// never roll back the payment or bill state change that produced it.
/// </summary>
public sealed class PaymentStatusHistory(AppDbContext db, ILogger<PaymentStatusHistory> logger) : IPaymentStatusHistory
{
    public async Task RecordAsync(
        string subjectType,
        int subjectId,
        string? fromStatus,
        string toStatus,
        string? reason = null,
        string? actor = null,
        string? reference = null,
        decimal? amount = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(subjectType) || string.IsNullOrWhiteSpace(toStatus)) return;

        try
        {
            db.PaymentStatusEvents.Add(new PaymentStatusEvent
            {
                SubjectType = subjectType,
                SubjectId = subjectId,
                Reference = Trim(reference, 128),
                FromStatus = Trim(fromStatus, 48),
                ToStatus = Trim(toStatus, 48) ?? string.Empty,
                Reason = Trim(reason, 512),
                Actor = Trim(actor, 128) ?? "system",
                Amount = amount,
                OccurredAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not record the status history for {SubjectType} {SubjectId} -> {ToStatus}.",
                subjectType, subjectId, toStatus);
        }
    }

    public async Task<PaymentStatusHistoryPage> GetAsync(
        string? subjectType, int? subjectId, string? reference, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.PaymentStatusEvents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(subjectType))
            query = query.Where(x => x.SubjectType == subjectType);
        if (subjectId is > 0)
            query = query.Where(x => x.SubjectId == subjectId);
        if (!string.IsNullOrWhiteSpace(reference))
            query = query.Where(x => x.Reference == reference);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new PaymentStatusEventDto(
                x.Id, x.SubjectType, x.SubjectId, x.Reference, x.FromStatus, x.ToStatus, x.Reason, x.Actor, x.Amount, x.OccurredAtUtc))
            .ToListAsync(ct);

        return new PaymentStatusHistoryPage(items, page, pageSize, total);
    }

    private static string? Trim(string? value, int max) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Length <= max ? value : value[..max];
}
