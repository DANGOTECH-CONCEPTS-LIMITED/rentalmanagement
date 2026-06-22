using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityDepositLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DeductedAmount",
                table: "TenantInvoices",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "OriginalAmount",
                table: "TenantInvoices",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PaidAmount",
                table: "TenantInvoices",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "RefundedAmount",
                table: "TenantInvoices",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.Sql(@"
                UPDATE TenantInvoices
                SET OriginalAmount = Amount
                WHERE OriginalAmount = 0 AND Amount > 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeductedAmount",
                table: "TenantInvoices");

            migrationBuilder.DropColumn(
                name: "OriginalAmount",
                table: "TenantInvoices");

            migrationBuilder.DropColumn(
                name: "PaidAmount",
                table: "TenantInvoices");

            migrationBuilder.DropColumn(
                name: "RefundedAmount",
                table: "TenantInvoices");
        }
    }
}
