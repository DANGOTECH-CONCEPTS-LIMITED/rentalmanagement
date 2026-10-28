using API.Controllers.Payments;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Tests;

public class CollectionTransactionIdTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;
    private PaymentService _service = null!;

    private AppDbContext Context(IInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection);
        if (interceptor != null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _db.Users.Add(new User { Id = 101, Email = "owner@test", SystemRoleId = 2 });
        var property = new LandLordProperty { Id = 201, OwnerId = 101, Price = 10000, Currency = "UGX" };
        _db.Tenants.Add(new PropertyTenant
        {
            Id = 301, Property = property, FullName = "Test tenant", PhoneNumber = "256770000001",
            NextPaymentDate = DateTime.UtcNow.AddMonths(1), BalanceDue = 10000
        });
        await _db.SaveChangesAsync();
        _service = new(_db, null!);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private static TenantPaymentDto Rent(string? clientReference = null) => new()
    {
        PropertyTenantId = 301, Amount = 1000, PaymentMethod = "MOMO", Description = "Rent",
        TransactionId = clientReference
    };

    [Fact]
    public async Task UtilityAndRentUseDatedIdsAtCreationBeforeAnyProviderSubmission()
    {
        var utilityId = await _service.MakeUtilityPayment(new()
        {
            MeterNumber = "123456789", Amount = 1000, PhoneNumber = "0770000001"
        });
        Assert.Matches("^DANGO_U_[0-9]{8}_1$", utilityId);
        var rent = Rent();
        await _service.MakeTenantPaymentAsync(rent);
        Assert.Matches("^DANGO_R_[0-9]{8}_2$", rent.TransactionId);
        Assert.Equal(utilityId, (await _db.UtilityPayments.SingleAsync()).TransactionID);
        Assert.Equal(rent.TransactionId, (await _db.TenantPayments.SingleAsync()).TransactionId);
        Assert.Equal("PENDING", (await _db.TenantPayments.SingleAsync()).PaymentStatus);
        Assert.Equal(2, await _db.Set<CollectionTransactionIdentity>().CountAsync());
        Assert.Empty(await _db.Set<PaymentGatewaySubmission>().ToListAsync());
    }

    [Fact]
    public async Task SuppliedRentReferenceIsRetainedSeparatelyAndDuplicateSubmissionIsRejected()
    {
        var rent = Rent("receipt-123");
        await _service.MakeTenantPaymentAsync(rent);
        Assert.StartsWith("DANGO_R_", rent.TransactionId);
        var row = await _db.TenantPayments.SingleAsync();
        Assert.Equal("receipt-123", row.ClientReference);
        Assert.Equal(rent.TransactionId, row.TransactionId);
        var balance = (await _db.Tenants.FindAsync(301))!.BalanceDue;
        await Assert.ThrowsAsync<Exception>(() => _service.MakeTenantPaymentAsync(Rent("receipt-123")));
        await Assert.ThrowsAsync<Exception>(() => _service.MakeTenantPaymentAsync(Rent(rent.TransactionId)));
        Assert.Single(await _db.TenantPayments.ToListAsync());
        Assert.Single(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
        Assert.Equal(balance, (await _db.Tenants.FindAsync(301))!.BalanceDue);
    }

    [Fact]
    public async Task ExistingTransactionsRetainTheirIdsAndCannotBeRecreatedAsNewRent()
    {
        _db.TenantPayments.Add(new TenantPayment
        {
            PropertyTenantId = 301, PropertyTenant = (await _db.Tenants.FindAsync(301))!, TransactionId = "old-guid",
            PaymentStatus = "SUCCESSFUL", Amount = 1000
        });
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<Exception>(() => _service.MakeTenantPaymentAsync(Rent("old-guid")));
        Assert.Equal("old-guid", (await _db.TenantPayments.SingleAsync()).TransactionId);
        Assert.Empty(await _db.Set<DangoPaymentReferenceAllocation>().ToListAsync());
    }

    [Fact]
    public async Task MpesaUtilityCreationsAlsoUseUtilityTransactionIds()
    {
        var payment = new UtilityPayment { Amount = 1000, MeterNumber = "meter", PhoneNumber = "256770000001" };
        await _service.MakeMPesaUtilityPayment(payment);
        Assert.Matches("^DANGO_U_[0-9]{8}_1$", payment.TransactionID);
        Assert.Equal("M-PESA", payment.PaymentMethod);
        Assert.Equal("SUCCESSFUL AT TELECOM", payment.Status);
    }

    [Fact]
    public async Task WalletIdentityReplaysClientReferenceAcrossContextsWithoutConsumingAnotherSequence()
    {
        var id = await CollectionTransactionIds.CreateAsync(_db, "W", "topup-client-reference");
        Assert.Matches("^DANGO_W_[0-9]{8}_1$", id);
        await using var restarted = Context();
        Assert.Equal(id, await CollectionTransactionIds.CreateAsync(restarted, "W", "topup-client-reference"));
        Assert.Equal(id, await CollectionTransactionIds.CreateAsync(restarted, "W", id));
        Assert.Single(await restarted.Set<DangoPaymentReferenceAllocation>().ToListAsync());
    }

    [Fact]
    public async Task ConcurrentClientReferenceReservationsConvergeOnOneTransactionId()
    {
        string? competingId = null;
        var interceptor = new CompetingIdentity(async () =>
        {
            await using var competing = Context();
            competingId = await CollectionTransactionIds.CreateAsync(competing, "W", "same-client-reference");
        });
        await using var first = Context(interceptor);
        var actual = await CollectionTransactionIds.CreateAsync(first, "W", "same-client-reference");
        Assert.Equal(competingId, actual);
        Assert.Single(await _db.Set<CollectionTransactionIdentity>().ToListAsync());
    }

    [Fact]
    public async Task RentEndpointExposesCanonicalIdWithoutChangingExistingSuccessBody()
    {
        var controller = new PaymentController(_service)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        var dto = Rent("receipt-456");
        var result = Assert.IsType<OkObjectResult>(await controller.MakeTenantPayment(dto));
        Assert.Equal("Payment created successfully.", result.Value);
        Assert.Equal(dto.TransactionId, controller.Response.Headers["X-Transaction-Id"].ToString());
        Assert.StartsWith("DANGO_R_", dto.TransactionId);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task RentStatusKeepsLastReturnedProviderReferenceWhenNextResponseOmitsIt(string omitted)
    {
        var dto = Rent();
        await _service.MakeTenantPaymentAsync(dto);
        await _service.UpdatePaymentStatus("PENDING AT TELCOM", dto.TransactionId!, "Accepted", "remote-rent-ref", "RENT");
        await _service.UpdatePaymentStatus("SUCCESSFUL AT TELECOM", dto.TransactionId!, "Settled", omitted, "RENT");
        var row = await _db.TenantPayments.SingleAsync();
        Assert.Equal("remote-rent-ref", row.VendorTransactionId);
        Assert.Equal(dto.TransactionId, row.TransactionId);
    }

    private sealed class CompetingIdentity(Func<Task> allocate) : SaveChangesInterceptor
    {
        private bool _allocated;
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (!_allocated && eventData.Context!.ChangeTracker.Entries<CollectionTransactionIdentity>().Any(x => x.State == EntityState.Added))
            {
                _allocated = true;
                await allocate();
            }
            return result;
        }
    }
}
