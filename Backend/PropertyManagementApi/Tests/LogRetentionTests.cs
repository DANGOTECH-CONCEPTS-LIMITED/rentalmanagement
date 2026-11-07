using Domain.Entities.Notifications;
using Domain.Entities.PropertyMgt;
using Domain.Entities.ServiceLogs;
using Infrastructure.Data;
using Infrastructure.Services.Maintenance;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Domain.Entities.Notifications;

namespace Tests;

public class LogRetentionTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=retain-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private LogRetentionService _service = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _service = new LogRetentionService(_db, NullLogger<LogRetentionService>.Instance);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private async Task SeedHttpLogsAsync(int old, int recent)
    {
        // The table is written with local time, so seed relative to local now.
        for (var i = 0; i < old; i++)
            _db.HttpRequesRequestResponses.Add(new HttpRequesRequestResponse { Request = "old", CreatedAt = DateTime.Now.AddDays(-45) });
        for (var i = 0; i < recent; i++)
            _db.HttpRequesRequestResponses.Add(new HttpRequesRequestResponse { Request = "new", CreatedAt = DateTime.Now.AddDays(-1) });
        await _db.SaveChangesAsync();
    }

    private async Task SeedServiceLogsAsync(int old, int recent)
    {
        for (var i = 0; i < old; i++)
            _db.ServiceLogs.Add(Log("old", DateTime.Now.AddDays(-40)));
        for (var i = 0; i < recent; i++)
            _db.ServiceLogs.Add(Log("new", DateTime.Now.AddHours(-3)));
        await _db.SaveChangesAsync();

        static ServiceLogs Log(string message, DateTime date) => new()
        {
            ServiceName = "test",
            LogLevel = "Information",
            Message = message,
            Exception = string.Empty,
            LogDate = date
        };
    }

    private async Task SeedNotificationLogsAsync(int old, int recent)
    {
        for (var i = 0; i < old; i++)
            _db.NotificationDeliveries.Add(Delivery(DateTime.UtcNow.AddDays(-120)));
        for (var i = 0; i < recent; i++)
            _db.NotificationDeliveries.Add(Delivery(DateTime.UtcNow.AddDays(-2)));
        await _db.SaveChangesAsync();

        static NotificationDelivery Delivery(DateTime created) => new()
        {
            EventType = "bill_payment_failed",
            Channel = "Email",
            Recipient = "ops@test",
            Subject = "s",
            Status = NotificationDeliveryStatus.Sent,
            CreatedAtUtc = created
        };
    }

    [Fact]
    public async Task PurgeDeletesRowsOlderThanEachWindowAndKeepsTheRest()
    {
        await SeedHttpLogsAsync(old: 3, recent: 2);
        await SeedServiceLogsAsync(old: 2, recent: 1);
        await SeedNotificationLogsAsync(old: 2, recent: 1);

        var result = await _service.PurgeAsync(new LogRetentionOptions());

        Assert.Equal(3, result.HttpLogs);
        Assert.Equal(2, result.ServiceLogs);
        Assert.Equal(2, result.Notifications);
        Assert.Equal(7, result.Total);

        Assert.Equal(2, await _db.HttpRequesRequestResponses.CountAsync());
        Assert.Equal(1, await _db.ServiceLogs.CountAsync());
        Assert.Equal(1, await _db.NotificationDeliveries.CountAsync());
        Assert.All(await _db.HttpRequesRequestResponses.ToListAsync(), x => Assert.Equal("new", x.Request));
    }

    [Fact]
    public async Task LongerWindowKeepsOlderRows()
    {
        await SeedHttpLogsAsync(old: 2, recent: 0);

        // 90 days keeps the 45-day-old rows.
        var result = await _service.PurgeAsync(new LogRetentionOptions(HttpLogDays: 90, ServiceLogDays: 30, NotificationDays: 90));

        Assert.Equal(0, result.HttpLogs);
        Assert.Equal(2, await _db.HttpRequesRequestResponses.CountAsync());
    }

    [Fact]
    public async Task DisabledRetentionDeletesNothing()
    {
        await SeedHttpLogsAsync(old: 2, recent: 0);

        var result = await _service.PurgeAsync(new LogRetentionOptions(Enabled: false));

        Assert.Equal(0, result.Total);
        Assert.Equal(2, await _db.HttpRequesRequestResponses.CountAsync());
    }

    [Fact]
    public async Task PurgeLoopsThroughMultipleBatches()
    {
        for (var i = 0; i < 130; i++)
            _db.HttpRequesRequestResponses.Add(new HttpRequesRequestResponse { Request = "old", CreatedAt = DateTime.Now.AddDays(-10) });
        await _db.SaveChangesAsync();

        var result = await _service.PurgeAsync(new LogRetentionOptions(HttpLogDays: 5, BatchSize: 50));

        Assert.Equal(130, result.HttpLogs);
        Assert.Equal(0, await _db.HttpRequesRequestResponses.CountAsync());
    }

    [Fact]
    public async Task SecondRunIsANoOp()
    {
        await SeedHttpLogsAsync(old: 2, recent: 1);

        var first = await _service.PurgeAsync(new LogRetentionOptions());
        var second = await _service.PurgeAsync(new LogRetentionOptions());

        Assert.Equal(2, first.HttpLogs);
        Assert.Equal(0, second.Total);
    }
}
