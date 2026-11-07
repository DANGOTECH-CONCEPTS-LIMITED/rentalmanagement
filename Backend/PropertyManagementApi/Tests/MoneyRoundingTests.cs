using Domain;

namespace Tests;

public class MoneyRoundingTests
{
    [Theory]
    [InlineData("10.005", "10.01")]
    [InlineData("10.004", "10.00")]
    [InlineData("10.015", "10.02")]
    [InlineData("-10.005", "-10.01")]
    [InlineData("600", "600.00")]
    public void RoundUsesTwoDecimalsAwayFromZero(string input, string expected)
        => Assert.Equal(decimal.Parse(expected), Money.Round(decimal.Parse(input)));

    [Fact]
    public void NonNegativeNeverReturnsALossMakingCharge()
    {
        Assert.Equal(0m, Money.NonNegative(-12.345m));
        Assert.Equal(12.35m, Money.NonNegative(12.345m));
    }

    [Fact]
    public void NormalizeKeepsValuesInsideTheDecimal18_2Range()
    {
        Assert.Equal(Money.MaxAmount, Money.Normalize(Money.MaxAmount * 2));
        Assert.Equal(-Money.MaxAmount, Money.Normalize(-Money.MaxAmount * 2));
        Assert.Equal(1500.55m, Money.Normalize(1500.554m));
    }

    [Fact]
    public void RepeatedRoundingIsStable()
    {
        // Rounding twice must never move the value again, or split/aggregate flows would disagree.
        foreach (var value in new[] { 0.005m, 1.115m, 99.999m, 1234.564m })
        {
            Assert.Equal(Money.Round(value), Money.Round(Money.Round(value)));
        }
    }
}
