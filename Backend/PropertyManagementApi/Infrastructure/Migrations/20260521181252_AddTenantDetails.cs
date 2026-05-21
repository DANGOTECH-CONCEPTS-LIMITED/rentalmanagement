using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NextOfKinName",
                table: "Tenants",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "NextOfKinPhone",
                table: "Tenants",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Occupation",
                table: "Tenants",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "WaterMeterNo",
                table: "Tenants",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextOfKinName",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "NextOfKinPhone",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "Occupation",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "WaterMeterNo",
                table: "Tenants");
        }
    }
}
