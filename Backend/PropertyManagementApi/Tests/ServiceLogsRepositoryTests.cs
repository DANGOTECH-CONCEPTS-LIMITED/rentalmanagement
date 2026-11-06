using Domain.Entities.ServiceLogs;
using Infrastructure.Data;
using Infrastructure.Services.ServiceLogs;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Tests;

public class ServiceLogsRepositoryTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=slogs-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _db.ServiceLogs.AddRange(
            Log(1, new DateTime(2026, 11, 5, 10, 0, 0), "INF", "older day entry", "SerilogSink", "raw-1"),
            Log(2, new DateTime(2026, 11, 6, 9, 0, 0), "ERR", "DANGO_B_20261106_49 status FAILED", "SerilogSink", "raw-2"),
            Log(3, new DateTime(2026, 11, 6, 9, 5, 0), "INF", "unrelated warmup", "SerilogFile", "raw-3"));
        await _db.SaveChangesAsync();
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    private static ServiceLogs Log(int id, DateTime date, string level, string message, string sourceType, string raw) => new()
    {
        Id = id,
        ServiceName = "API",
        LogDate = date,
        LogLevel = level,
        Message = message,
        Exception = string.Empty,
        SourceType = sourceType,
        SourceIdentifier = "API",
        RawContent = raw,
        EventHash = $"hash-{id}",
    };

    [Fact]
    public async Task PagedLogsFilterByDateSourceAndSearchThenPage()
    {
        var repository = new ServiceLogsRepository(_db);

        var all = await repository.GetPagedByDateRangeAsync(new DateTime(2026, 11, 5), new DateTime(2026, 11, 6));
        Assert.Equal(3, all.Total);
        Assert.Equal(3, all.Items.Count);
        Assert.Equal(3, all.Items[0].Id); // newest first (09:05 entry)

        var singleDay = await repository.GetPagedByDateRangeAsync(new DateTime(2026, 11, 5), new DateTime(2026, 11, 5));
        Assert.Equal(1, singleDay.Total);
        Assert.Equal("older day entry", singleDay.Items.Single().Message);

        var bySource = await repository.GetPagedByDateRangeAsync(new DateTime(2026, 11, 5), new DateTime(2026, 11, 6), sourceType: "SerilogFile");
        Assert.Equal(3, bySource.Items.Single().Id);

        // The reference is only present in Message/RawContent, which the search must cover.
        var bySearch = await repository.GetPagedByDateRangeAsync(new DateTime(2026, 11, 5), new DateTime(2026, 11, 6), search: "DANGO_B_20261106_49");
        Assert.Equal(2, bySearch.Items.Single().Id);

        var firstPage = await repository.GetPagedByDateRangeAsync(new DateTime(2026, 11, 5), new DateTime(2026, 11, 6), page: 1, pageSize: 2);
        var secondPage = await repository.GetPagedByDateRangeAsync(new DateTime(2026, 11, 5), new DateTime(2026, 11, 6), page: 2, pageSize: 2);
        Assert.Equal(3, firstPage.Total);
        Assert.Equal(2, firstPage.Items.Count);
        Assert.Single(secondPage.Items);
        Assert.Empty(firstPage.Items.Select(x => x.Id).Intersect(secondPage.Items.Select(x => x.Id)));
    }
}
