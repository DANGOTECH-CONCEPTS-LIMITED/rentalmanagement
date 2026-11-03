using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.BackgroundServices;

public interface IBackgroundJobLease
{
    Task<IAsyncDisposable?> TryAcquireAsync(string name, TimeSpan lease, CancellationToken ct);
}

// Acquires a short, renewable lease on a named key so a background job runs on only one
// instance at a time. Leases are stored in the BackgroundJobLock table and are taken over
// atomically once they expire, so a crashed instance cannot permanently block a job.
public sealed class BackgroundJobLease(AppDbContext db) : IBackgroundJobLease
{
    public async Task<IAsyncDisposable?> TryAcquireAsync(string name, TimeSpan lease, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var owner = Guid.NewGuid().ToString("N");
        var locks = db.Set<BackgroundJobLock>();

        // Take over an expired lease atomically. If another instance holds a live lease this
        // affects zero rows and the insert attempt below fails on the unique key.
        var claimed = await locks.Where(x => x.Name == name && x.LeaseUntilUtc < now)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.OwnerId, owner)
                .SetProperty(x => x.LeaseUntilUtc, now + lease), ct);
        if (claimed != 1)
        {
            var added = new BackgroundJobLock { Name = name, OwnerId = owner, LeaseUntilUtc = now + lease };
            locks.Add(added);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                db.Entry(added).State = EntityState.Detached;
                return null; // Another instance claimed the lock first.
            }
        }
        return new Releaser(locks, name, owner);
    }

    private sealed class Releaser(DbSet<BackgroundJobLock> locks, string name, string owner) : IAsyncDisposable
    {
        private int _released;
        public async ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _released, 1) != 0) return;
            try
            {
                await locks.Where(x => x.Name == name && x.OwnerId == owner).ExecuteDeleteAsync();
            }
            catch
            {
                // Best-effort release: an unreleased lease simply expires.
            }
        }
    }
}
