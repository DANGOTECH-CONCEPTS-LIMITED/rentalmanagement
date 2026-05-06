using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    public partial class Add_Utility_Indexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_UtilityPayments_MeterNumber",
                table: "UtilityPayments",
                column: "MeterNumber");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityPayments_CreatedAt",
                table: "UtilityPayments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityMeters_MeterNumber",
                table: "UtilityMeters",
                column: "MeterNumber");

            migrationBuilder.CreateIndex(
                name: "IX_UtilityMeters_LandLordId",
                table: "UtilityMeters",
                column: "LandLordId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UtilityPayments_MeterNumber",
                table: "UtilityPayments");

            migrationBuilder.DropIndex(
                name: "IX_UtilityPayments_CreatedAt",
                table: "UtilityPayments");

            migrationBuilder.DropIndex(
                name: "IX_UtilityMeters_MeterNumber",
                table: "UtilityMeters");

            migrationBuilder.DropIndex(
                name: "IX_UtilityMeters_LandLordId",
                table: "UtilityMeters");
        }
    }
}