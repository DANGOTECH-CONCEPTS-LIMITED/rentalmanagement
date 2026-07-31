using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintTenantLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "TenantComplaints",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantComplaints_TenantId",
                table: "TenantComplaints",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_TenantComplaints_Tenants_TenantId",
                table: "TenantComplaints",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TenantComplaints_Tenants_TenantId",
                table: "TenantComplaints");

            migrationBuilder.DropIndex(
                name: "IX_TenantComplaints_TenantId",
                table: "TenantComplaints");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "TenantComplaints");
        }
    }
}
