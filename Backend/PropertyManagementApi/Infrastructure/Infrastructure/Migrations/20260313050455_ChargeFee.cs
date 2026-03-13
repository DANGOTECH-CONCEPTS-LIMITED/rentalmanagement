using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChargeFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "UtilityChargeFlatFee",
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UtilityChargeFlatFee",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UtilityChargeTiersJson",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UtilityChargeType",
                table: "Users");
        }
    }
}
