using API.Controllers.UserControllers;
using Domain.Dtos.User;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using System.Text.Json;

namespace Tests;

public class UtilityChargeSettingsTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new($"Data Source=charges-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5");
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = Context();
        await _db.Database.EnsureCreatedAsync();
        _db.Users.AddRange(
            new User { Id = 601, FullName = "Percentage Owner", Email = "pct@test", SystemRoleId = 4, UtilityChargeType = "Percentage", UtilityChargePercentage = 5, MonthlyMeterFee = 1000, MonthlyMeterFeeEffectiveFrom = new DateTime(2026, 10, 7, 10, 44, 50) },
            // Stored exactly as the rows in the database (PascalCase keys).
            new User { Id = 602, FullName = "Tiered Owner", Email = "tiered@test", SystemRoleId = 4, UtilityChargeType = "Tiered", UtilityChargeTiersJson = """[{"MinAmount":0,"MaxAmount":5000,"Charge":500},{"MinAmount":5000,"MaxAmount":null,"Charge":1000}]""", MonthlyMeterFee = 1000, MonthlyMeterFeeEffectiveFrom = new DateTime(2026, 10, 20, 9, 58, 39) },
            // Stored with camelCase keys, e.g. pasted from an API response.
            new User { Id = 603, FullName = "Camel Tiered Owner", Email = "camel@test", SystemRoleId = 4, UtilityChargeType = "Tiered", UtilityChargeTiersJson = """[{"minAmount":0,"maxAmount":5000,"charge":500}]""", MonthlyMeterFee = 0 },
            // Stored with typographic quotes, which is invalid JSON unless normalised.
            new User { Id = 604, FullName = "Smart Quote Owner", Email = "smart@test", SystemRoleId = 4, UtilityChargeType = "Tiered", UtilityChargeTiersJson = "[{“MinAmount”:0,“MaxAmount”:5000,“Charge”:750}]", MonthlyMeterFee = 1000 },
            // Stored with genuinely broken JSON.
            new User { Id = 605, FullName = "Broken Tier Owner", Email = "broken@test", SystemRoleId = 4, UtilityChargeType = "Tiered", UtilityChargeTiersJson = "[{MinAmount:0,MaxAmount:5000,Charge:500]", UtilityChargePercentage = null, UtilityChargeFlatFee = 2500, MonthlyMeterFee = 0 });
        await _db.SaveChangesAsync();
    }

    public async Task DisposeAsync() { await _db.DisposeAsync(); await _connection.DisposeAsync(); }

    private AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    private UserController Controller(AppDbContext db) =>
        new(null!, NullLogger<UserController>.Instance, db, null!, null!, null!);

    private static LandlordUtilityChargeDto Dto(IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsType<LandlordUtilityChargeDto>(ok.Value);
    }

    [Fact]
    public async Task PercentageChargeIsReturnedForTheSelectedAccount()
    {
        var dto = Dto(await Controller(_db).GetLandlordUtilityCharge(601));

        Assert.Equal(601, dto.LandlordId);
        Assert.Equal("Percentage", dto.ChargeType);
        Assert.Equal(5d, dto.ChargePercentage);
        Assert.Empty(dto.Tiers);
    }

    [Fact]
    public async Task TieredChargeIsReturnedWithItsBands()
    {
        var dto = Dto(await Controller(_db).GetLandlordUtilityCharge(602));

        Assert.Equal("Tiered", dto.ChargeType);
        Assert.Equal(2, dto.Tiers.Count);
        Assert.Equal(0d, dto.Tiers[0].MinAmount);
        Assert.Equal(5000d, dto.Tiers[0].MaxAmount);
        Assert.Equal(500d, dto.Tiers[0].Charge);
        Assert.Null(dto.Tiers[1].MaxAmount);
        Assert.Equal(1000d, dto.Tiers[1].Charge);
    }

    [Fact]
    public async Task TierJsonWithDifferentCasingIsStillRead()
    {
        var result = await Controller(_db).GetLandlordUtilityCharge(603);

        // A hand-written / pasted tier list must not make the whole settings response fail.
        var dto = Dto(result);
        Assert.Single(dto.Tiers);
        Assert.Equal(500d, dto.Tiers[0].Charge);
        Assert.Null(dto.TiersWarning);
    }

    [Fact]
    public async Task TierJsonWithTypographicQuotesIsRepaired()
    {
        var dto = Dto(await Controller(_db).GetLandlordUtilityCharge(604));

        Assert.Single(dto.Tiers);
        Assert.Equal(750d, dto.Tiers[0].Charge);
        Assert.Equal(5000d, dto.Tiers[0].MaxAmount);
        Assert.Null(dto.TiersWarning);
    }

    [Fact]
    public async Task BrokenTierJsonStillReturnsTheRestOfTheConfigurationWithAWarning()
    {
        var dto = Dto(await Controller(_db).GetLandlordUtilityCharge(605));

        Assert.Equal("Tiered", dto.ChargeType);
        Assert.Equal(2500d, dto.FlatFee);
        Assert.Empty(dto.Tiers);
        Assert.False(string.IsNullOrWhiteSpace(dto.TiersWarning));
    }

    [Fact]
    public void TierJsonShapeMatchesWhatTheApiWrites()
    {
        // The write path stores PascalCase keys (default serializer options).
        var json = JsonSerializer.Serialize(new List<LandlordUtilityChargeTierDto>
        {
            new() { MinAmount = 0, MaxAmount = 5000, Charge = 500 }
        });
        Assert.Contains("\"MinAmount\"", json);
    }
}
