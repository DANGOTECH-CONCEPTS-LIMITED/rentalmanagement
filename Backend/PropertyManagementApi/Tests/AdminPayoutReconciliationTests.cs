using API.Controllers;
using Domain.Dtos.Payments;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Reflection;
using System.Security.Claims;
using System.Text;

namespace Tests;

public class AdminPayoutReconciliationTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;
    private Handler _handler = new();
    private AdminPayoutReconciliationService _service = null!;
    private const string Reference = "DANGO_W_20261028_9";
    private AppDbContext Context(IInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection);
        if (interceptor != null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }
    private AdminPayoutReconciliationService Service(AppDbContext db) => new(db,
        new DangoPaymentClient(new HttpClient(_handler), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DangoPayment:BaseUrl"] = "https://test.invalid/", ["DangoPayment:ClientId"] = "test-client"
        }).Build()));
    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _db.Users.Add(new User { Id = 101, FullName = "Test Owner", Email = "owner@test", SystemRoleId = 2 });
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = 301, Wallet = new Wallet { Id = 201, LandlordId = 101, Balance = 4000 },
            TransactionId = Reference, Amount = -1000, Status = "PENDING AT THE BANK", VendorTranId = "provider-reference"
        });
        _db.Set<PaymentGatewaySubmission>().Add(new()
        {
            Id = PaymentGatewayRouter.SubmissionId("Payout", Reference), Operation = "Payout", Provider = "DangoPayment", Reference = Reference
        });
        await _db.SaveChangesAsync();
        _service = Service(_db);
    }
    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }
    private static FailAndReversePayoutRequest Request() => new()
    {
        Reason = "Provider confirmed no payment and recipient statement verified", ConfirmUnpaid = true, ConfirmedTransactionId = Reference
    };
    [Fact]
    public async Task ListsOnlyPendingSubmittedNegativeDangoPayoutsWithoutCallingProvider()
    {
        var page = await _service.GetAsync(Reference, 1, 20, CancellationToken.None);
        var row = Assert.Single(page.Items);
        Assert.Equal(1000m, row.Amount);
        Assert.Equal("Test Owner", row.Owner);
        Assert.False(page.HasMore);
        Assert.Equal(0, _handler.Calls);
        Assert.Empty((await _service.GetAsync("unknown", 1, 20, CancellationToken.None)).Items);
    }
    [Fact]
    public async Task ManualRefundRequiresFreshNotFoundAndIsAuditedAndExactlyOnce()
    {
        var result = await _service.FailAndReverseAsync(301, Request(), "admin@test", CancellationToken.None);
        Assert.Equal("REVERSED", result.Status);
        Assert.Equal(1000m, result.Amount);
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        var original = await _db.WalletTransactions.AsNoTracking().SingleAsync(x => x.Id == 301);
        Assert.Contains("admin@test", original.ReasonAtTelecom);
        Assert.Contains(Request().Reason, original.ReasonAtTelecom);
        Assert.Equal("provider-reference", original.VendorTranId);
        var reversal = await _db.WalletTransactions.SingleAsync(x => x.Status == "REVERSAL");
        Assert.Equal(Reference, reversal.VendorTranId);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FailAndReverseAsync(301, Request(), "admin@test", CancellationToken.None));
        Assert.Equal(1, _handler.Calls);
        Assert.Equal(2, await _db.WalletTransactions.CountAsync());
    }
    [Theory]
    [InlineData(false, "verified reason", Reference)]
    [InlineData(true, "", Reference)]
    [InlineData(true, "verified reason", "wrong-ref")]
    public async Task InvalidConfirmationNeverContactsProviderOrRefunds(bool confirmed, string reason, string reference)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.FailAndReverseAsync(301,
            new() { ConfirmUnpaid = confirmed, Reason = reason, ConfirmedTransactionId = reference }, "admin", CancellationToken.None));
        Assert.Equal(0, _handler.Calls);
        Assert.Equal(4000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
    }
    [Theory]
    [InlineData("SUCCESSFUL")]
    [InlineData("SUCCESSFUL AT THE BANK")]
    [InlineData("REVERSED")]
    [InlineData("PENDING_BANK_PAYOUT")]
    public async Task IneligibleStatusCannotBeManuallyReversed(string state)
    {
        await _db.WalletTransactions.Where(x => x.Id == 301).ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, state));
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FailAndReverseAsync(301, Request(), "admin", CancellationToken.None));
        Assert.Empty((await _service.GetAsync(null, 1, 20, CancellationToken.None)).Items);
        Assert.Equal(0, _handler.Calls);
    }
    [Theory]
    [InlineData("{\"statusCode\":\"00\",\"requestId\":\"DANGO_W_20261028_9\"}")]
    [InlineData("{\"httpCode\":404,\"httpMessage\":\"Not Found\",\"moreInformation\":\"No Transaction found for the requested message ID\",\"requestId\":\"different-ref\"}")]
    [InlineData("{}")]
    [InlineData("not-json")]
    public async Task ChangedUnknownOrMismatchedProviderResponseBlocksManualRefund(string body)
    {
        _handler.Body = body;
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FailAndReverseAsync(301, Request(), "admin", CancellationToken.None));
        Assert.Equal(4000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Equal("PENDING AT THE BANK", (await _db.WalletTransactions.AsNoTracking().SingleAsync()).Status);
    }
    [Fact]
    public async Task OtherProviderOrPositiveCreditCannotBeReversed()
    {
        await _db.Set<PaymentGatewaySubmission>().ExecuteUpdateAsync(s => s.SetProperty(x => x.Provider, "Collecto"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FailAndReverseAsync(301, Request(), "admin", CancellationToken.None));
        await _db.Set<PaymentGatewaySubmission>().ExecuteUpdateAsync(s => s.SetProperty(x => x.Provider, "DangoPayment"));
        await _db.WalletTransactions.ExecuteUpdateAsync(s => s.SetProperty(x => x.Amount, 1000));
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FailAndReverseAsync(301, Request(), "admin", CancellationToken.None));
        Assert.Equal(0, _handler.Calls);
    }
    [Fact]
    public async Task RaceWithSuccessfulStatusBlocksManualRefund()
    {
        _handler.BeforeResponse = async () => await _db.WalletTransactions.Where(x => x.Id == 301)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "SUCCESSFUL AT THE BANK"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.FailAndReverseAsync(301, Request(), "admin", CancellationToken.None));
        Assert.Equal(4000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
        Assert.Single(await _db.WalletTransactions.ToListAsync());
    }
    [Fact]
    public async Task StaleStatusPollCannotReopenManuallyRefundedPayout()
    {
        await _service.FailAndReverseAsync(301, Request(), "admin", CancellationToken.None);
        await new PaymentService(_db, null!).UpdateWalletTransaction(new()
        {
            TransactionId = Reference, Status = "SUCCESSFUL", VendorTranId = "late-reference"
        });
        Assert.Equal("REVERSED", (await _db.WalletTransactions.SingleAsync(x => x.Id == 301)).Status);
        Assert.Equal(5000m, await _db.Wallets.AsNoTracking().Select(x => x.Balance).SingleAsync());
    }
    [Fact]
    public async Task ControllerRequiresAdministratorAndActorIdentity()
    {
        Assert.Equal("Administrator", typeof(AdminPayoutReconciliationController).GetCustomAttribute<AuthorizeAttribute>()!.Roles);
        var controller = new AdminPayoutReconciliationController(_service)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        Assert.IsType<UnauthorizedResult>((await controller.FailAndReverse(301, Request(), CancellationToken.None)).Result);
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "admin-103")], "Test"));
        var response = await controller.FailAndReverse(301, Request(), CancellationToken.None);
        Assert.IsType<OkObjectResult>(response.Result);
        Assert.Contains("admin-103", (await _db.WalletTransactions.SingleAsync(x => x.Id == 301)).ReasonAtTelecom);
    }
    public sealed class Handler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public string Body { get; set; } = """{"httpCode":404,"httpMessage":"Not Found","moreInformation":"No Transaction found for the requested message ID","requestId":"DANGO_W_20261028_9"}""";
        public Func<Task>? BeforeResponse { get; set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Assert.EndsWith("get-transaction-status", request.RequestUri!.AbsolutePath);
            Calls++;
            if (BeforeResponse != null) await BeforeResponse();
            return new(HttpStatusCode.NotFound) { Content = new StringContent(Body, Encoding.UTF8, "application/json") };
        }
    }
}
