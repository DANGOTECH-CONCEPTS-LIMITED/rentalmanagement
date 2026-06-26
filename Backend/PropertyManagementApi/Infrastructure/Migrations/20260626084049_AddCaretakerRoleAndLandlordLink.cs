using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCaretakerRoleAndLandlordLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LandlordId",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.InsertData(
                table: "SystemRoles",
                columns: new[] { "Id", "CreatedAt", "Description", "Name", "Permissions" },
                values: new object[] { 5, new DateTime(2025, 4, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), "Caretaker role under a landlord with limited permissions", "Caretaker", null });

            migrationBuilder.CreateIndex(
                name: "IX_Users_LandlordId",
                table: "Users",
                column: "LandlordId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Users_LandlordId",
                table: "Users",
                column: "LandlordId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Users_LandlordId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_LandlordId",
                table: "Users");

            migrationBuilder.DeleteData(
                table: "SystemRoles",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DropColumn(
                name: "LandlordId",
                table: "Users");
        }
    }
}
