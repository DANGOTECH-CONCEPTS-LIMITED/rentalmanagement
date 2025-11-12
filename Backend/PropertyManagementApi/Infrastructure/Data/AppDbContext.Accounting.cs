using Domain.Entities.Accounting;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data
{
    public partial class AppDbContext
    {
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<JournalEntry> JournalEntries { get; set; } = null!;
        public DbSet<JournalLine> JournalLines { get; set; } = null!;

        partial void OnModelCreatingAccounting(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Account>(e =>
            {
                e.HasIndex(x => x.Code).IsUnique();
                e.Property(x => x.Code).HasMaxLength(32);
                e.Property(x => x.Name).HasMaxLength(256);
            });

            modelBuilder.Entity<JournalEntry>(e =>
            {
                e.HasIndex(x => x.CorrelationId).IsUnique();
                e.Property(x => x.CorrelationId).HasMaxLength(128);
                e.Property(x => x.SourceType).HasMaxLength(64);
                e.Property(x => x.SourceId).HasMaxLength(128);
            });

            modelBuilder.Entity<JournalLine>(e =>
            {
                e.Property(x => x.Debit).HasColumnType("decimal(18,2)");
                e.Property(x => x.Credit).HasColumnType("decimal(18,2)");
            });
        }
    }
}