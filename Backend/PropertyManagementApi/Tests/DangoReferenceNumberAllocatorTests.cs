using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Tests;

public class DangoReferenceNumberAllocatorTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private static readonly DateTime Day = new(2026, 10, 28, 9, 0, 0, DateTimeKind.Utc);

    private AppDbContext Context(IInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection);
        if (interceptor != null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        await using var db = Context();
        await db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync() => await _connection.DisposeAsync();

    [Fact]
    public async Task SequenceSurvivesNewContextsAndResetsOnNextUtcDate()
    {
        await using (var first = Context())
            Assert.Equal("DANGO_U_20261028_1", await DangoReferenceNumberAllocator.AllocateAsync(first, "U", Day));
        await using (var restarted = Context())
        {
            Assert.Equal("DANGO_R_20261028_2", await DangoReferenceNumberAllocator.AllocateAsync(restarted, "R", Day.AddHours(3)));
            Assert.Equal("DANGO_W_20261029_1", await DangoReferenceNumberAllocator.AllocateAsync(restarted, "W", Day.AddDays(1)));
        }
    }

    [Fact]
    public async Task SupportsValidationCategory()
    {
        await using var db = Context();
        Assert.Equal("DANGO_V_20261028_1", await DangoReferenceNumberAllocator.AllocateAsync(db, "V", Day));
    }

    [Fact]
    public async Task CompetingAllocationCannotReuseTheSameDailySequence()
    {
        var interceptor = new CompetingAllocator(async () =>
        {
            await using var competitor = Context();
            Assert.Equal("DANGO_R_20261028_1", await DangoReferenceNumberAllocator.AllocateAsync(competitor, "R", Day));
        });
        await using var db = Context(interceptor);
        Assert.Equal("DANGO_U_20261028_2", await DangoReferenceNumberAllocator.AllocateAsync(db, "U", Day));
        Assert.Equal(2, await db.Set<DangoPaymentReferenceAllocation>().CountAsync());
    }

    [Theory]
    [InlineData("")]
    [InlineData("X")]
    [InlineData("u")]
    public async Task RejectsUnsupportedCategoryWithoutConsumingSequence(string category)
    {
        await using var db = Context();
        await Assert.ThrowsAsync<ArgumentException>(() => DangoReferenceNumberAllocator.AllocateAsync(db, category, Day));
        Assert.Empty(await db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
    }

    private sealed class CompetingAllocator(Func<Task> allocate) : SaveChangesInterceptor
    {
        private bool _allocated;
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (!_allocated)
            {
                _allocated = true;
                await allocate();
            }
            return result;
        }
    }
}
