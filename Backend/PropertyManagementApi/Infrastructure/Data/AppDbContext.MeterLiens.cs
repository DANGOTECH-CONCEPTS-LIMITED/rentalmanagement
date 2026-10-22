using Domain.Entities.PropertyMgt;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public partial class AppDbContext
{
    public DbSet<MeterLienPolicy> MeterLienPolicies { get; set; } = null!;
    public DbSet<MeterLien> MeterLiens { get; set; } = null!;
    public DbSet<MeterLienRepayment> MeterLienRepayments { get; set; } = null!;
    public DbSet<MeterLienAllocation> MeterLienAllocations { get; set; } = null!;

    private void ConfigureMeterLiens(ModelBuilder model)
    {
        model.Entity<MeterLienPolicy>(e =>
        {
            e.HasKey(x => x.UtilityMeterId);
            e.HasOne<UtilityMeter>().WithOne().HasForeignKey<MeterLienPolicy>(x => x.UtilityMeterId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.RepaymentMode).HasMaxLength(20);
            e.Property(x => x.RepaymentPercentage).HasPrecision(28, 18);
        });
        model.Entity<MeterLien>(e =>
        {
            e.HasOne<UtilityMeter>().WithMany().HasForeignKey(x => x.UtilityMeterId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.UtilityMeterId, x.CreatedAt });
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.AmountPaid).HasPrecision(18, 2);
            e.Property(x => x.Description).HasMaxLength(500);
        });
        model.Entity<MeterLienRepayment>(e =>
        {
            e.HasIndex(x => x.PaymentId).IsUnique();
            e.HasOne<UtilityPayment>().WithOne().HasForeignKey<MeterLienRepayment>(x => x.PaymentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<UtilityMeter>().WithMany().HasForeignKey(x => x.UtilityMeterId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.PaymentAmount).HasPrecision(18, 2);
            e.Property(x => x.FeeAmount).HasPrecision(18, 2);
            e.Property(x => x.LienAmount).HasPrecision(18, 2);
            e.Property(x => x.TokenAmount).HasPrecision(18, 2);
            e.Property(x => x.RepaymentPercentage).HasPrecision(28, 18);
            e.Property(x => x.RepaymentMode).HasMaxLength(20);
            e.Property(x => x.VendState).HasMaxLength(20);
            e.Property(x => x.VendError).HasMaxLength(500);
        });
        model.Entity<MeterLienAllocation>(e =>
        {
            e.HasIndex(x => new { x.MeterLienRepaymentId, x.MeterLienId }).IsUnique();
            e.HasOne<MeterLien>().WithMany().HasForeignKey(x => x.MeterLienId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<MeterLienRepayment>().WithMany().HasForeignKey(x => x.MeterLienRepaymentId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.Amount).HasPrecision(18, 2);
        });
    }
}
