using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdditionOfUtilityPaymentRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "SystemRoles",
                columns: new[] { "Id", "CreatedAt", "Description", "Name", "Permissions" },
                values: new object[] { 4, new DateTime(2025, 4, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), "Utility payment role with limited permissions", "Utililty Payment", null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "SystemRoles",
                keyColumn: "Id",
                keyValue: 4);
        }
    }
}
