using Domain.Entities.PropertyMgt;
using Domain.Entities.ServiceLogs;
using Domain.Entities.AuditTrail;
using Domain.Entities.USSD;
using Domain.Entities.External;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Data
{
    public partial class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
        public DbSet<LandLordProperty> LandLordProperties { get; set; }
        public DbSet<PropertyUnit> PropertyUnits { get; set; } = null!;
        public DbSet<PropertyTenant> Tenants { get; set; }
        public DbSet<TenantPayment> TenantPayments { get; set; }
        public DbSet<TenantInvoice> TenantInvoices { get; set; } = null!;
        public DbSet<Complaint> TenantComplaints { get; set; }
        public DbSet<Wallet> Wallets { get; set; } = null!;
        public DbSet<WalletTransaction> WalletTransactions { get; set; } = null!;

        public DbSet<SystemRole> SystemRoles { get; set; }
        public DbSet<CaretakerPropertyAssignment> CaretakerPropertyAssignments { get; set; } = null!;

        public DbSet<UtilityPayment> UtilityPayments { get; set; } = null!;
        public DbSet<UtilityMeter> UtilityMeters { get; set; } = null!;
        public DbSet<PropertyExpense> PropertyExpenses { get; set; } = null!;
        public DbSet<HttpRequesRequestResponse> HttpRequesRequestResponses { get; set; } = null!;
        public DbSet<CollectoWalletWithdrawalHistory> CollectoWalletWithdrawalHistories { get; set; } = null!;
        public DbSet<ServiceLogs> ServiceLogs { get; set; } = null!;
        public DbSet<AuditTrailEntry> AuditTrailEntries { get; set; } = null!;
        public DbSet<MpesaCallbackAudit> MpesaCallbackAudits { get; set; } = null!;
        public DbSet<MeterToken> MeterTokens { get; set; }
        public DbSet<RentalContract> RentalContracts { get; set; } = null!;
        public DbSet<SmsLog> SmsLogs { get; set; } = null!;
        public DbSet<ViewingRequest> ViewingRequests { get; set; } = null!;

        #region USSD
        public DbSet<UssdMenu> UssdMenus { get; set; }
        public DbSet<UssdNode> UssdNodes { get; set; }
        public DbSet<UssdOption> UssdOptions { get; set; }
        public DbSet<UssdSession> UssdSessions { get; set; }

        #endregion


        #region External Payments
        public DbSet<VendorPayments> VendorPayments { get; set; }
        #endregion

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            #region USSD
            //USSD Setup

            // Ids for reference
            var menuId = 1;
            var rootId = 10;
            var meterInputId = 20;
            var lookupId = 25;
            var amountInputId = 30;
            var confirmId = 40;
            var checkoutId = 50;
            var exitId = 90;

            modelBuilder.Entity<UssdMenu>().HasData(new UssdMenu
            {
                Id = menuId,
                Code = "waterpay",
                Title = "Welcome to WaterPay",
                RootNodeId = rootId
            });

            modelBuilder.Entity<PropertyExpense>(e =>
            {
                e.Property(x => x.Category).HasMaxLength(255);
                e.HasIndex(x => x.OwnerId);
                e.HasIndex(x => x.Date);
                e.HasIndex(x => x.Category);
                e.HasIndex(x => x.PropertyId);
                e.HasIndex(x => x.PropertyUnitId);
                e.HasIndex(x => x.CreatedAt);

                e.HasOne(x => x.Owner)
                    .WithMany()
                    .HasForeignKey(x => x.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(x => x.Property)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasOne(x => x.Unit)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyUnitId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<UssdNode>().HasData(
            new UssdNode
            {
                Id = rootId,
                MenuId = menuId,
                Type = NodeType.Menu,
                Prompt = "Welcome to DangoPay\n1. Pay water bill\n0. Exit"
            },
            new UssdNode
            {
                Id = meterInputId,
                MenuId = menuId,
                Type = NodeType.Input,
                Prompt = "Enter Meter Number:",
                ValidationRegex = @"^\d{6,16}$",
                DataKey = "meter",
                NextNodeId = lookupId
            },
            new UssdNode
            {
                Id = lookupId,
                MenuId = menuId,
                Type = NodeType.Action,
                Prompt = "Looking up meter...",
                ActionKey = "LookupCustomer",
                NextNodeId = amountInputId
            },
            new UssdNode
            {
                Id = amountInputId,
                MenuId = menuId,
                Type = NodeType.Input,
                Prompt = "{customerName} - Meter {meter}\nEnter amount ({CURRENCY}):",
                ValidationRegex = @"^\d+(\.\d{1,2})?$",
                DataKey = "amount",
                NextNodeId = confirmId
            },
            new UssdNode
            {
                Id = confirmId,
                MenuId = menuId,
                Type = NodeType.Menu,
                Prompt = "Pay {CURRENCY} {amount} for Meter {meter}?\n1. Confirm\n2. Cancel"
            },
            new UssdNode
            {
                Id = checkoutId,
                MenuId = menuId,
                Type = NodeType.Action,
                Prompt = "Processing payment...",
                ActionKey = "Checkout"
            },
            new UssdNode
            {
                Id = exitId,
                MenuId = menuId,
                Type = NodeType.Exit,
                Prompt = "Goodbye."
            }
        );

            modelBuilder.Entity<UssdOption>().HasData(
            new UssdOption { Id = 1, NodeId = rootId, Label = "1. Pay water bill", Value = "1", NextNodeId = meterInputId },
            new UssdOption { Id = 2, NodeId = rootId, Label = "0. Exit", Value = "0", NextNodeId = exitId },
            new UssdOption { Id = 3, NodeId = confirmId, Label = "1. Confirm", Value = "1", NextNodeId = checkoutId },
            new UssdOption { Id = 4, NodeId = confirmId, Label = "2. Cancel", Value = "2", NextNodeId = exitId }
        );

            #endregion


            // Seed default system roles
            modelBuilder.Entity<SystemRole>().HasData(
                new SystemRole
                {
                    Id = 1,
                    Name = "Administrator",
                    Description = "System Administrator with full permissions",
                    Permissions = null,
                    CreatedAt = new DateTime(2025, 04, 10)
                },
                new SystemRole
                {
                    Id = 2,
                    Name = "Landlord",
                    Description = "Landlord role with property management permissions",
                    Permissions = null,
                    CreatedAt = new DateTime(2025, 04, 10)
                },
                new SystemRole
                {
                    Id = 3,
                    Name = "Tenant",
                    Description = "Tenant role with limited permissions",
                    Permissions = null,
                    CreatedAt = new DateTime(2025, 04, 10)
                },
                new SystemRole
                {
                    Id = 4,
                    Name = "Utililty Payment",
                    Description = "Utility payment role with limited permissions",
                    Permissions = null,
                    CreatedAt = new DateTime(2025, 04, 10)
                },
                new SystemRole
                {
                    Id = 5,
                    Name = "Caretaker",
                    Description = "Caretaker role under a landlord with limited permissions",
                    Permissions = null,
                    CreatedAt = new DateTime(2025, 04, 10)
                });

            modelBuilder.Entity<User>(e =>
            {
                e.HasIndex(x => x.LandlordId);
                e.HasOne(x => x.Landlord)
                    .WithMany()
                    .HasForeignKey(x => x.LandlordId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<CaretakerPropertyAssignment>(e =>
            {
                e.HasIndex(x => new { x.CaretakerId, x.PropertyId }).IsUnique();
                e.HasIndex(x => x.PropertyId);
                e.HasOne(x => x.Caretaker)
                    .WithMany()
                    .HasForeignKey(x => x.CaretakerId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Property)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // one‐to‐one between User⇄Wallet
            modelBuilder.Entity<Wallet>()
                .HasIndex(w => w.LandlordId)
                .IsUnique();

            modelBuilder.Entity<WalletTransaction>()
                .HasOne(t => t.Wallet)
                .WithMany(w => w.Transactions)
                .HasForeignKey(t => t.WalletId);

            modelBuilder.Entity<CollectoWalletWithdrawalHistory>(e =>
            {
                e.Property(x => x.Reference).HasMaxLength(255);
                e.HasIndex(x => x.CreatedAt);
                e.HasIndex(x => x.Reference);
            });

            modelBuilder.Entity<ServiceLogs>()
                .HasIndex(x => x.LogDate);

            modelBuilder.Entity<RentalContract>(e =>
            {
                e.ToTable("rentalcontracts");

                e.HasOne(x => x.Owner)
                    .WithMany()
                    .HasForeignKey(x => x.OwnerId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(x => x.Property)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyId);

                e.HasOne(x => x.Unit)
                    .WithMany()
                    .HasForeignKey(x => x.UnitId);

                e.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId);
            });

            modelBuilder.Entity<ServiceLogs>(e =>
            {
                e.Property(x => x.EventHash).HasMaxLength(255);
                e.HasIndex(x => x.EventHash).IsUnique();
            });

            modelBuilder.Entity<AuditTrailEntry>(e =>
            {
                e.Property(x => x.RequestData).HasColumnType("longtext");
                e.HasIndex(x => x.CreatedAt);
                e.HasIndex(x => x.UserId);
            });

            // Ensure the accounting partial hook is invoked exactly once:
            OnModelCreatingAccounting(modelBuilder);

            modelBuilder.Entity<MpesaCallbackAudit>(e =>
            {
                e.Property(x => x.Payload).HasColumnType("longtext");
                e.Property(x => x.Headers).HasColumnType("longtext");
                e.Property(x => x.TransId).HasMaxLength(255);
                e.HasIndex(x => x.TransId);
            });

            modelBuilder.Entity<PropertyUnit>(e =>
            {
                e.Property(x => x.UnitNumber).HasMaxLength(255);
                e.Property(x => x.Status).HasMaxLength(255);
                e.HasIndex(x => new { x.PropertyId, x.UnitNumber }).IsUnique();
                e.HasIndex(x => x.PropertyId);
                e.HasIndex(x => x.Status);
            });

            modelBuilder.Entity<PropertyTenant>(e =>
            {
                e.HasIndex(x => x.PropertyUnitId);
                e.HasOne(x => x.Unit)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyUnitId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<TenantInvoice>(e =>
            {
                e.Property(x => x.Status).HasMaxLength(255);
                e.HasIndex(x => x.InvoiceNumber).IsUnique();
                e.HasIndex(x => x.TenantId);
                e.HasIndex(x => x.PropertyId);
                e.HasIndex(x => x.PropertyUnitId);
                e.HasIndex(x => x.CreatedByUserId);
                e.HasIndex(x => x.Status);
                e.HasIndex(x => x.DueDate);
                e.HasIndex(x => x.CreatedAt);

                e.HasOne(x => x.Tenant)
                    .WithMany()
                    .HasForeignKey(x => x.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(x => x.Property)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(x => x.Unit)
                    .WithMany()
                    .HasForeignKey(x => x.PropertyUnitId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasOne(x => x.CreatedBy)
                    .WithMany()
                    .HasForeignKey(x => x.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Indexes to improve utility payments/meters lookups and aggregations
            modelBuilder.Entity<UtilityPayment>(e =>
            {
                e.Property(p => p.MeterNumber).HasMaxLength(255);
                e.HasIndex(p => p.MeterNumber);
                e.HasIndex(p => p.CreatedAt);
            });

            modelBuilder.Entity<UtilityMeter>(e =>
            {
                e.Property(m => m.MeterNumber).HasMaxLength(255);
                e.HasIndex(m => m.MeterNumber);
                e.HasIndex(m => m.LandLordId);
            });
        }

        // Declaration of the partial hook used by AppDbContext.Accounting.cs
        partial void OnModelCreatingAccounting(ModelBuilder modelBuilder);
    }
}
