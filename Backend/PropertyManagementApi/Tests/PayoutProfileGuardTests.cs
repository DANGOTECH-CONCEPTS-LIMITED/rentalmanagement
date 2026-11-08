using Domain.Entities.PropertyMgt;
using Domain.Dtos.Ops;
using Domain.Dtos.Payments.WalletDto;
using Infrastructure.Data;
using Infrastructure.Services.Ops;
using Infrastructure.Services.PaymentServices.WalletSvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests;

/// <summary>
/// Covers the profile guard that stops an un-submittable bank payout from debiting the wallet, and the
/// exception-queue category that surfaces the ones that still slip through.
/// </summary>
public class PayoutProfileGuardTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=payout-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;
    private WalletService _wallet = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _wallet = new WalletService(_db, NullLogger<WalletService>.Instance);
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private async Task SeedAsync(string phone, string? swift, string bankName = "Stanbic Bank Uganda", decimal balance = 500000m)
    {
        _db.Users.Add(new User
        {
            Id = 13, FullName = "Tenya Allan", Email = "tenya@test", PhoneNumber = phone,
            BankName = bankName, BankAccountNumber = "903002704841", SwiftCode = swift, SystemRoleId = 2
        });
        await _db.SaveChangesAsync();
        _db.Wallets.Add(new Wallet { Id = 50, LandlordId = 13, Balance = balance });
        await _db.SaveChangesAsync();
    }

    private static WithdrawDto Withdrawal(decimal amount = 190000m) => new()
    {
        landlordid = 13,
        amount = amount,
        description = "Bank withdrawal"
    };

    [Fact]
    public async Task BankPayoutWithAnInvalidPhoneIsRejectedBeforeTheWalletIsDebited()
    {
        // The production case: the phone field held the bank account number.
        await SeedAsync(phone: "903002704841", swift: "SBICUGKX");

        var error = await Assert.ThrowsAsync<ArgumentException>(() => _wallet.WithdrawAsync(Withdrawal()));

        Assert.Contains("Ugandan mobile number", error.Message);
        Assert.Empty(await _db.WalletTransactions.AsNoTracking().ToListAsync());
        Assert.Equal(500000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
    }

    [Fact]
    public async Task BankPayoutWithoutASwiftCodeIsRejectedBeforeTheWalletIsDebited()
    {
        await SeedAsync(phone: "0700300841", swift: null);

        var error = await Assert.ThrowsAsync<Exception>(() => _wallet.WithdrawAsync(Withdrawal()));

        Assert.Contains("SWIFT", error.Message);
        Assert.Empty(await _db.WalletTransactions.AsNoTracking().ToListAsync());
        Assert.Equal(500000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
    }

    [Fact]
    public async Task ValidProfileCreatesThePendingBankPayout()
    {
        await SeedAsync(phone: "0700300841", swift: "SBICUGKX");

        await _wallet.WithdrawAsync(Withdrawal());

        var transaction = Assert.Single(await _db.WalletTransactions.AsNoTracking().ToListAsync());
        Assert.Equal("PENDING_BANK_PAYOUT", transaction.Status);
        Assert.StartsWith("DANGO_W_", transaction.TransactionId);
        Assert.Equal(-190000m, transaction.Amount);
        Assert.Equal(310000m, (await _db.Wallets.AsNoTracking().SingleAsync()).Balance);
    }

    [Fact]
    public async Task WalletNameTransferDoesNotRequireASwiftCode()
    {
        await SeedAsync(phone: "0700300841", swift: null, bankName: "Wallet");

        await _wallet.WithdrawAsync(Withdrawal());

        var transaction = Assert.Single(await _db.WalletTransactions.AsNoTracking().ToListAsync());
        Assert.Equal("PENDING_WALLET_PAYOUT", transaction.Status);
    }

    [Fact]
    public async Task BlockedReasonIsPersistedWithoutChangingTheStatus()
    {
        await SeedAsync(phone: "0700300841", swift: "SBICUGKX");
        await _wallet.WithdrawAsync(Withdrawal());
        var transaction = await _db.WalletTransactions.AsNoTracking().SingleAsync();

        await _wallet.RecordPayoutBlockedAsync(transaction.Id, "A valid Ugandan mobile number is required. (Parameter 'phone')");

        var stored = await _db.WalletTransactions.AsNoTracking().SingleAsync();
        Assert.Contains("Ugandan mobile number", stored.ReasonAtTelecom);
        Assert.Equal("PENDING_BANK_PAYOUT", stored.Status);
        Assert.Equal(-190000m, stored.Amount);
    }

    [Fact]
    public async Task ExceptionQueueSurfacesStalePendingPayoutsWithTheirReason()
    {
        _db.Users.Add(new User { Id = 13, FullName = "Tenya Allan", Email = "tenya@test", PhoneNumber = "0700300841", SystemRoleId = 2 });
        await _db.SaveChangesAsync();
        _db.Wallets.Add(new Wallet { Id = 50, LandlordId = 13, Balance = 310000m });
        await _db.SaveChangesAsync();
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = 900, WalletId = 50, Amount = -190000m, Status = "PENDING_BANK_PAYOUT",
            TransactionId = "DANGO_W_20261108_63", Description = "Bank withdrawal",
            ReasonAtTelecom = "A valid Ugandan mobile number is required. (Parameter 'phone')",
            CreatedAt = DateTime.Now.AddMinutes(-45)
        });
        await _db.SaveChangesAsync();

        var queue = await new ExceptionQueueService(_db).GetAsync(ExceptionCategories.PayoutStuck, 1, 50);

        Assert.Equal(1, queue.Counts[ExceptionCategories.PayoutStuck]);
        var item = Assert.Single(queue.Items);
        Assert.Equal("DANGO_W_20261108_63", item.Reference);
        Assert.Equal(190000m, item.Amount);
        Assert.Contains("Ugandan mobile number", item.Reason);
        Assert.Contains("landlord", item.ActionHint, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task FreshPendingPayoutsAreNotFlaggedYet()
    {
        _db.Users.Add(new User { Id = 13, FullName = "Tenya Allan", Email = "tenya@test", PhoneNumber = "0700300841", SystemRoleId = 2 });
        await _db.SaveChangesAsync();
        _db.Wallets.Add(new Wallet { Id = 50, LandlordId = 13, Balance = 0 });
        await _db.SaveChangesAsync();
        _db.WalletTransactions.Add(new WalletTransaction
        {
            Id = 901, WalletId = 50, Amount = -190000m, Status = "PENDING_BANK_PAYOUT",
            TransactionId = "DANGO_W_20261108_64", CreatedAt = DateTime.Now.AddMinutes(-2)
        });
        await _db.SaveChangesAsync();

        var queue = await new ExceptionQueueService(_db).GetAsync(ExceptionCategories.PayoutStuck, 1, 50);

        Assert.Equal(0, queue.Counts[ExceptionCategories.PayoutStuck]);
        Assert.Empty(queue.Items);
    }
}

public class WithdrawDtoContract
{
    [Fact]
    public void WithdrawDtoExposesTheFieldsTheGuardReliesOn()
    {
        // Guards against a rename breaking the profile validation silently.
        var dto = new WithdrawDto { landlordid = 1, amount = 1000m, description = "x" };
        Assert.Equal(1, dto.landlordid);
        Assert.Equal(1000m, dto.amount);
    }
}
