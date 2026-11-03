using Infrastructure.Data;
using Infrastructure.Services.BackgroundServices;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Tests;

public class BackgroundJobLeaseTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=lock-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;

    private AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task LeaseIsExclusiveAndReleased()
    {
        var first = await new BackgroundJobLease(Context()).TryAcquireAsync("job-a", TimeSpan.FromMinutes(1), CancellationToken.None);
        Assert.NotNull(first);

        // A second instance cannot acquire while the first holds the lease.
        var second = await new BackgroundJobLease(Context()).TryAcquireAsync("job-a", TimeSpan.FromMinutes(1), CancellationToken.None);
        Assert.Null(second);

        // Different names are independent.
        var other = await new BackgroundJobLease(Context()).TryAcquireAsync("job-b", TimeSpan.FromMinutes(1), CancellationToken.None);
        Assert.NotNull(other);
        await other!.DisposeAsync();

        await first!.DisposeAsync();

        var after = await new BackgroundJobLease(Context()).TryAcquireAsync("job-a", TimeSpan.FromMinutes(1), CancellationToken.None);
        Assert.NotNull(after);
    }

    [Fact]
    public async Task ExpiredLeaseCanBeTakenOver()
    {
        var first = await new BackgroundJobLease(Context()).TryAcquireAsync("job-a", TimeSpan.FromMilliseconds(1), CancellationToken.None);
        Assert.NotNull(first);
        // Let the lease expire without releasing.
        await Task.Delay(30);
        var second = await new BackgroundJobLease(Context()).TryAcquireAsync("job-a", TimeSpan.FromMinutes(1), CancellationToken.None);
        Assert.NotNull(second);
    }
}
