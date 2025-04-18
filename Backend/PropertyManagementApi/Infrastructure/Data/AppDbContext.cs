using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
        public DbSet<LandLordProperty> LandLordProperties { get; set; }
        public DbSet<PropertyTenant> Tenants { get; set; }
        public DbSet<TenantPayment> TenantPayments { get; set; }

        public DbSet<SystemRole> SystemRoles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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
                });
        }
    }
}
