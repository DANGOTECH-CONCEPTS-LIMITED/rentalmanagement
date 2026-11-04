using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Tests;

public class TenantPaymentsPagingTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;
    private PaymentService _service = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        _db = new AppDbContext(options);
        await _db.Database.EnsureCreatedAsync();

        _db.Users.AddRange(
            new User { Id = 101, Email = "l1@test", SystemRoleId = 2 },
            new User { Id = 102, Email = "l2@test", SystemRoleId = 2 });
        var tenant1 = new PropertyTenant { Id = 301, Property = new LandLordProperty { Id = 201, OwnerId = 101, Price = 1000, Currency = "UGX" }, FullName = "Tenant One", PhoneNumber = "256700000001" };
        var tenant2 = new PropertyTenant { Id = 302, Property = new LandLordProperty { Id = 202, OwnerId = 102, Price = 1000, Currency = "UGX" }, FullName = "Tenant Two", PhoneNumber = "256700000002" };
        _db.Tenants.AddRange(tenant1, tenant2);
        _db.TenantPayments.AddRange(
            new TenantPayment { Id = 401, PropertyTenant = tenant1, Amount = 100, PaymentStatus = "SUCCESSFUL", PaymentMethod = "MOMO", TransactionId = "T-1", PaymentDate = new DateTime(2026, 11, 1) },
            new TenantPayment { Id = 402, PropertyTenant = tenant1, Amount = 200, PaymentStatus = "PENDING", PaymentMethod = "CASH", TransactionId = "T-2", PaymentDate = new DateTime(2026, 11, 2) },
            new TenantPayment { Id = 403, PropertyTenant = tenant1, Amount = 300, PaymentStatus = "SUCCESSFUL", PaymentMethod = "MOMO", TransactionId = "T-3", PaymentDate = new DateTime(2026, 11, 3) },
            new TenantPayment { Id = 404, PropertyTenant = tenant2, Amount = 400, PaymentStatus = "SUCCESSFUL", PaymentMethod = "BANK", TransactionId = "T-4", PaymentDate = new DateTime(2026, 11, 4) });
        await _db.SaveChangesAsync();

        _service = new PaymentService(_db, null!);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task PagingReturnsRequestedPageAndHasMoreFlag()
    {
        var first = await _service.GetPaymentsAsync(101, null, null, null, 1, 2, CancellationToken.None);
        Assert.Equal(2, first.Items.Count);
        Assert.True(first.HasMore);

        var second = await _service.GetPaymentsAsync(101, null, null, null, 2, 2, CancellationToken.None);
        Assert.Single(second.Items);
        Assert.False(second.HasMore);
    }

    [Fact]
    public async Task LandlordFilterExcludesOtherLandlordsPayments()
    {
        var page = await _service.GetPaymentsAsync(101, null, null, null, 1, 10, CancellationToken.None);
        Assert.Equal(3, page.Items.Count);
        Assert.All(page.Items, p => Assert.Equal(101, p.PropertyTenant.Property.OwnerId));
    }

    [Fact]
    public async Task StatusAndSearchFiltersNarrowResults()
    {
        var successful = await _service.GetPaymentsAsync(101, null, "SUCCESSFUL", null, 1, 10, CancellationToken.None);
        Assert.Equal(2, successful.Items.Count);

        var bySearch = await _service.GetPaymentsAsync(101, "T-1", null, null, 1, 10, CancellationToken.None);
        Assert.Single(bySearch.Items);
        Assert.Equal("T-1", bySearch.Items[0].TransactionId);
    }

    [Fact]
    public async Task InvalidPaginationIsRejected()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.GetPaymentsAsync(null, null, null, null, 0, 10, CancellationToken.None));
    }
}
