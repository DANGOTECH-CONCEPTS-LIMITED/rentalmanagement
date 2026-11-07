namespace Domain;

/// <summary>
/// Single definition of how monetary values are rounded. Everything that charges, credits or
/// settles money goes through here so two code paths can never disagree by one cent.
/// </summary>
public static class Money
{
    /// <summary>Decimal places stored for every money column.</summary>
    public const int Scale = 2;

    /// <summary>Upper bound that still fits a decimal(18,2) column.</summary>
    public const decimal MaxAmount = 9_999_999_999_999_999.99m;

    /// <summary>Rounds to cents, half away from zero (the convention invoices and receipts expect).</summary>
    public static decimal Round(decimal value) => decimal.Round(value, Scale, MidpointRounding.AwayFromZero);

    /// <summary>Rounds to cents and keeps the result inside the representable money range.</summary>
    public static decimal Normalize(decimal value) => Math.Clamp(Round(value), -MaxAmount, MaxAmount);

    /// <summary>Rounds to cents and never returns a negative amount for a charge.</summary>
    public static decimal NonNegative(decimal value) => Math.Max(0m, Round(value));
}
