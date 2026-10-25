using API.Controllers.Payments.Wallet;
using API.Filters;
using Application.Interfaces.AuditTrail;
using Domain.Dtos.AuditTrail;
using Domain.Dtos.Payments.WalletDto;
using Domain.Entities.AuditTrail;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using System.Reflection;
using System.Security.Claims;

namespace Tests;

public class WalletWithdrawalTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;
    private WalletService _service = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _db.Users.AddRange(
            new User { Id = 101, Email = "utility@test", SystemRoleId = 4, PhoneNumber = "256770000001" },
            new User { Id = 102, Email = "other@test", SystemRoleId = 4, PhoneNumber = "256770000002" },
            new User { Id = 103, Email = "admin@test", SystemRoleId = 1, PhoneNumber = "256770000003" },
            new User { Id = 104, Email = "landlord@test", SystemRoleId = 2 },
            new User { Id = 105, Email = "tenant@test", SystemRoleId = 3 });
        _db.Wallets.AddRange(
            new Wallet { Id = 201, LandlordId = 101, Balance = 5000m },
            new Wallet { Id = 202, LandlordId = 102, Balance = 5000m },
            new Wallet { Id = 203, LandlordId = 103, Balance = 5000m },
            new Wallet { Id = 204, LandlordId = 104, Balance = 5000m });
        await _db.SaveChangesAsync();
        _service = new WalletService(_db, NullLogger<WalletService>.Instance);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private static AdminUtilityWalletWithdrawalDto Request(int sourceUserId = 101, decimal amount = 1000m) =>
        new() { SourceUserId = sourceUserId, Amount = amount, Description = "Utility wallet withdrawal" };

    private WalletController Controller(string email, string role = "Administrator") => new(_service, null!)
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.NameIdentifier, email),
                    new Claim(ClaimTypes.Role, role),
                }, "Test")),
            },
        },
    };

    private async Task AssertUnchangedAsync()
    {
        Assert.Empty(await _db.WalletTransactions.ToListAsync());
        Assert.All(await _db.Wallets.ToListAsync(), wallet => Assert.Equal(5000m, wallet.Balance));
    }

    [Fact]
    public async Task AdminWithdrawalDebitsOnlySelectedOwnerAndQueuesExactlyOneExistingPayout()
    {
        var result = Assert.IsType<OkObjectResult>(await Controller("admin@test").AdminWithdrawUtilityWallet(Request()));
        Assert.Equal("Withdrawal successful.", result.Value);
        Assert.Equal(4000m, (await _db.Wallets.FindAsync(201))!.Balance);
        Assert.Equal(5000m, (await _db.Wallets.FindAsync(202))!.Balance);
        Assert.Equal(5000m, (await _db.Wallets.FindAsync(203))!.Balance);
        var pending = Assert.Single(await _service.GetTransactionsByStatus("PENDING"));
        Assert.Equal(-1000m, pending.Amount);
        Assert.Equal(201, pending.WalletId);
        Assert.Equal(101, pending.Wallet.LandlordId);
        Assert.Equal("256770000001", pending.Wallet.Landlord.PhoneNumber);
        Assert.Equal("Utility wallet withdrawal", pending.Description);
        Assert.False(string.IsNullOrWhiteSpace(pending.TransactionId));
        Assert.Single(await _db.WalletTransactions.ToListAsync());
    }

    [Fact]
    public async Task AdminReasonCannotOverrideOwnersPayoutRouting()
    {
        var request = Request();
        request.Description = "Automatic meter repairs";
        await _service.AdminWithdrawUtilityAsync(request, "admin@test");
        Assert.Equal("PENDING", (await _db.WalletTransactions.SingleAsync()).Status);
    }

    [Theory]
    [InlineData("0.001")]
    [InlineData("1.001")]
    public async Task AdminRejectsFractionalCents(string value)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.AdminWithdrawUtilityAsync(Request(amount: decimal.Parse(value, System.Globalization.CultureInfo.InvariantCulture)), "admin@test"));
        await AssertUnchangedAsync();
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public async Task AdminRequiresWithdrawalReason(string reason)
    {
        var request = Request();
        request.Description = reason;
        await Assert.ThrowsAsync<ArgumentException>(() => _service.AdminWithdrawUtilityAsync(request, "admin@test"));
        await AssertUnchangedAsync();
    }

    [Theory]
    [InlineData("Bank", "123456", "PENDING_BANK_PAYOUT")]
    [InlineData("Wallet", "", "PENDING_WALLET_PAYOUT")]
    public async Task AdminWithdrawalPreservesSelectedOwnersExistingPayoutRouting(string bank, string account, string expectedStatus)
    {
        var owner = (await _db.Users.FindAsync(101))!;
        owner.BankName = bank;
        owner.BankAccountNumber = account;
        await _db.SaveChangesAsync();
        await _service.AdminWithdrawUtilityAsync(Request(), "admin@test");
        var transaction = Assert.Single(await _service.GetTransactionsByStatus(expectedStatus));
        Assert.Equal(101, transaction.Wallet.Landlord.Id);
        Assert.Equal(bank, transaction.Wallet.Landlord.BankName);
        Assert.Equal(account, transaction.Wallet.Landlord.BankAccountNumber);
        Assert.Single(await _db.WalletTransactions.ToListAsync());
    }

    [Theory]
    [InlineData("utility@test")]
    [InlineData("tenant@test")]
    [InlineData("missing@test")]
    [InlineData("")]
    public async Task AdminWithdrawalRequiresExistingAdministratorActor(string actor)
    {
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.AdminWithdrawUtilityAsync(Request(), actor));
        await AssertUnchangedAsync();
    }

    [Theory]
    [InlineData(103)]
    [InlineData(104)]
    [InlineData(105)]
    [InlineData(999)]
    public async Task AdminWithdrawalRequiresSelectedUtilityAccount(int owner)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.AdminWithdrawUtilityAsync(Request(owner), "admin@test"));
        await AssertUnchangedAsync();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(5001)]
    public async Task AdminWithdrawalRetainsAmountAndBalanceChecks(decimal amount)
    {
        if (amount <= 0)
            await Assert.ThrowsAsync<ArgumentException>(() => _service.AdminWithdrawUtilityAsync(Request(amount: amount), "admin@test"));
        else
            await Assert.ThrowsAsync<Exception>(() => _service.AdminWithdrawUtilityAsync(Request(amount: amount), "admin@test"));
        await AssertUnchangedAsync();
    }

    [Fact]
    public async Task AdminWithdrawalRetainsOwnerEmailValidation()
    {
        (await _db.Users.FindAsync(101))!.Email = "invalid";
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<Exception>(() => _service.AdminWithdrawUtilityAsync(Request(), "admin@test"));
        await AssertUnchangedAsync();
    }

    [Theory]
    [InlineData(101, "utility@test")]
    [InlineData(104, "landlord@test")]
    public async Task ExistingSelfWithdrawalRemainsSupported(int owner, string actor)
    {
        Assert.IsType<OkObjectResult>(await Controller(actor, "UtilityPayment").Withdraw(new WithdrawDto
        {
            landlordid = owner, amount = 1000m, description = "Self withdrawal",
        }));
        Assert.Equal(4000m, (await _db.Wallets.SingleAsync(x => x.LandlordId == owner)).Balance);
        Assert.Single(await _db.WalletTransactions.ToListAsync());
    }

    [Fact]
    public async Task ExistingWithdrawalRejectsAnotherOwnersWallet()
    {
        var result = Assert.IsType<ObjectResult>(await Controller("utility@test", "UtilityPayment").Withdraw(new WithdrawDto
        {
            landlordid = 102, amount = 1000m, description = "Not my wallet",
        }));
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
        await AssertUnchangedAsync();
    }

    [Fact]
    public async Task ExistingAdministratorWithdrawalRemainsSupported()
    {
        await _service.WithdrawForUserAsync(new WithdrawDto
        {
            landlordid = 104, amount = 1000m, description = "Existing admin withdrawal",
        }, "admin@test");
        Assert.Equal(4000m, (await _db.Wallets.FindAsync(204))!.Balance);
        Assert.Single(await _db.WalletTransactions.ToListAsync());
    }

    [Theory]
    [InlineData("utility@test", "UtilityPayment")]
    [InlineData("utility@test", "Administrator")]
    [InlineData("admin@test", "UtilityPayment")]
    [InlineData("missing@test", "Administrator")]
    public async Task AdminEndpointRejectsNonAdminClaimsOrPersistedActor(string actor, string role)
    {
        var result = Assert.IsType<ObjectResult>(await Controller(actor, role).AdminWithdrawUtilityWallet(Request()));
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
        await AssertUnchangedAsync();
    }

    [Fact]
    public void AdminEndpointRequiresAuthorizationAndBodyBinding()
    {
        var type = typeof(WalletController);
        Assert.NotNull(type.GetCustomAttribute<AuthorizeAttribute>());
        var action = type.GetMethod(nameof(WalletController.AdminWithdrawUtilityWallet))!;
        Assert.Equal("Administrator", action.GetCustomAttribute<AuthorizeAttribute>()!.Roles);
        Assert.Equal("/AdminWithdrawUtilityWallet", action.GetCustomAttribute<HttpPostAttribute>()!.Template);
        Assert.NotNull(action.GetParameters()[0].GetCustomAttribute<FromBodyAttribute>());
    }

    [Fact]
    public async Task ExistingAuditFilterRecordsAdministratorActorAndExplicitSelectedOwner()
    {
        var http = Controller("admin@test").HttpContext;
        http.Request.Method = "POST";
        http.Request.Path = "/AdminWithdrawUtilityWallet";
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var filters = new List<IFilterMetadata>();
        var executing = new ActionExecutingContext(action, filters,
            new Dictionary<string, object?> { ["withdrawDto"] = Request() }, Controller("admin@test"));
        var audit = new AuditRecorder();
        await new AuditTrailFilter(audit).OnActionExecutionAsync(executing,
            () => Task.FromResult(new ActionExecutedContext(action, filters, executing.Controller)));
        var entry = Assert.Single(audit.Entries);
        Assert.Equal("admin@test", entry.UserId);
        Assert.Equal("Administrator", entry.UserRole);
        Assert.Equal("/AdminWithdrawUtilityWallet", entry.Route);
        Assert.Contains("SourceUserId=101", entry.RequestData);
        Assert.Contains("Amount=1000", entry.RequestData);
    }

    private class AuditRecorder : IAuditTrailRepository
    {
        public List<AuditTrailWriteDto> Entries { get; } = new();
        public Task LogAuditAsync(AuditTrailWriteDto dto) { Entries.Add(dto); return Task.CompletedTask; }
        public Task<IReadOnlyList<AuditTrailEntry>> GetByDateRangeAsync(DateTime startDate, DateTime endDate,
            string? userId = null, string? action = null, string? route = null, string? userRole = null) =>
            throw new NotSupportedException();
    }
}
