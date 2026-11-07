using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Tests;

/// <summary>
/// Locks in the money columns: they must stay <see cref="decimal"/> and share one precision so
/// amounts added in one table and subtracted in another never drift by a rounding cent.
/// </summary>
public class MoneyPrecisionTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=money-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    [Theory]
    [InlineData(typeof(UtilityPayment), nameof(UtilityPayment.Amount), 18, 2)]
    [InlineData(typeof(UtilityPayment), nameof(UtilityPayment.Charges), 18, 2)]
    [InlineData(typeof(UtilityPayment), nameof(UtilityPayment.FeesSettledAmount), 18, 2)]
    [InlineData(typeof(MeterFeeCharge), nameof(MeterFeeCharge.Amount), 18, 2)]
    [InlineData(typeof(MeterFeeCharge), nameof(MeterFeeCharge.AmountPaid), 18, 2)]
    [InlineData(typeof(User), nameof(User.UtilityChargePercentage), 9, 4)]
    [InlineData(typeof(User), nameof(User.UtilityChargeFlatFee), 18, 2)]
    [InlineData(typeof(User), nameof(User.MonthlyMeterFee), 18, 2)]
    [InlineData(typeof(Wallet), nameof(Wallet.Balance), 18, 2)]
    [InlineData(typeof(WalletTransaction), nameof(WalletTransaction.Amount), 18, 2)]
    [InlineData(typeof(BillPaymentInstruction), nameof(BillPaymentInstruction.Amount), 18, 2)]
    public void MoneyColumnsAreDecimalWithAFixedScale(Type entityType, string propertyName, int precision, int scale)
    {
        var entity = _db.Model.FindEntityType(entityType);
        Assert.NotNull(entity);

        var property = entity!.FindProperty(propertyName);
        Assert.NotNull(property);
        Assert.Equal(typeof(decimal), Nullable.GetUnderlyingType(property!.ClrType) ?? property.ClrType);
        Assert.Equal(precision, property.GetPrecision());
        Assert.Equal(scale, property.GetScale());
    }

    [Fact]
    public void NoMappedMoneyColumnFallsBackToDouble()
    {
        var offenders = _db.Model.GetEntityTypes()
            .SelectMany(e => e.GetProperties().Select(p => new { Entity = e.ClrType.Name, p.Name, p.ClrType }))
            .Where(p => p.ClrType == typeof(double) || p.ClrType == typeof(double?))
            .Where(p => p.Name.Contains("Amount", StringComparison.OrdinalIgnoreCase) ||
                        p.Name.Contains("Balance", StringComparison.OrdinalIgnoreCase) ||
                        p.Name.Contains("Charge", StringComparison.OrdinalIgnoreCase) ||
                        p.Name.Contains("Fee", StringComparison.OrdinalIgnoreCase))
            .Select(p => $"{p.Entity}.{p.Name}")
            .ToList();

        Assert.Empty(offenders);
    }
}
