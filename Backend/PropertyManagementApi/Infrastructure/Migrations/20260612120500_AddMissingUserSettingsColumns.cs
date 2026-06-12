using Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260612120500_AddMissingUserSettingsColumns")]
    public partial class AddMissingUserSettingsColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankAccountNumber",
                table: "Users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "Users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SwiftCode",
                table: "Users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<double>(
                name: "UtilityChargeFlatFee",
                table: "Users",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "UtilityChargePercentage",
                table: "Users",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtilityChargeTiersJson",
                table: "Users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "UtilityChargeType",
                table: "Users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "BankAccountNumber", table: "Users");
            migrationBuilder.DropColumn(name: "BankName", table: "Users");
            migrationBuilder.DropColumn(name: "SwiftCode", table: "Users");
            migrationBuilder.DropColumn(name: "UtilityChargeFlatFee", table: "Users");
            migrationBuilder.DropColumn(name: "UtilityChargePercentage", table: "Users");
            migrationBuilder.DropColumn(name: "UtilityChargeTiersJson", table: "Users");
            migrationBuilder.DropColumn(name: "UtilityChargeType", table: "Users");
        }
    }
}