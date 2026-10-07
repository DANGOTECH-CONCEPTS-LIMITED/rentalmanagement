using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyMeterFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "MeterNumber",
                table: "UtilityPayments",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "FeesProcessed",
                table: "UtilityPayments",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "FeesSettledAmount",
                table: "UtilityPayments",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AlterColumn<string>(
                name: "MeterNumber",
                table: "UtilityMeters",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<double>(
                name: "MonthlyMeterFee",
                table: "Users",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<DateTime>(
                name: "MonthlyMeterFeeEffectiveFrom",
                table: "Users",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MeterFeeCharges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UtilityMeterId = table.Column<int>(type: "int", nullable: false),
                    MeterNumber = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Period = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Amount = table.Column<double>(type: "double", nullable: false),
                    AmountPaid = table.Column<double>(type: "double", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeterFeeCharges", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityPayments_CreatedAt",
                table: "UtilityPayments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityPayments_MeterNumber",
                table: "UtilityPayments",
                column: "MeterNumber");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityMeters_MeterNumber",
                table: "UtilityMeters",
                column: "MeterNumber");

            migrationBuilder.CreateIndex(
                name: "IX_MeterFeeCharges_MeterNumber",
                table: "MeterFeeCharges",
                column: "MeterNumber");

            migrationBuilder.CreateIndex(
                name: "IX_MeterFeeCharges_UtilityMeterId_Period",
                table: "MeterFeeCharges",
                columns: new[] { "UtilityMeterId", "Period" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeterFeeCharges");

            migrationBuilder.DropIndex(
                name: "IX_UtilityPayments_CreatedAt",
                table: "UtilityPayments");

            migrationBuilder.DropIndex(
                name: "IX_UtilityPayments_MeterNumber",
                table: "UtilityPayments");

            migrationBuilder.DropIndex(
                name: "IX_UtilityMeters_MeterNumber",
                table: "UtilityMeters");

            migrationBuilder.DropColumn(
                name: "FeesProcessed",
                table: "UtilityPayments");

            migrationBuilder.DropColumn(
                name: "FeesSettledAmount",
                table: "UtilityPayments");

            migrationBuilder.DropColumn(
                name: "MonthlyMeterFee",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MonthlyMeterFeeEffectiveFrom",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "MeterNumber",
                table: "UtilityPayments",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "MeterNumber",
                table: "UtilityMeters",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
