using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdditionOfSmsSentColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSmsSent",
                table: "UtilityPayments",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "UssdNodes",
                keyColumn: "Id",
                keyValue: 10,
                column: "Prompt",
                value: "Welcome to DangoPay\n1. Pay water bill\n0. Exit");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSmsSent",
                table: "UtilityPayments");

            migrationBuilder.UpdateData(
                table: "UssdNodes",
                keyColumn: "Id",
                keyValue: 10,
                column: "Prompt",
                value: "Welcome to WaterPay\n1. Pay water bill\n0. Exit");
        }
    }
}
