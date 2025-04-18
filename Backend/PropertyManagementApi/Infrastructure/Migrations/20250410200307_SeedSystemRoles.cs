using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedSystemRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_SystemRole_SystemRoleId",
                table: "Users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SystemRole",
                table: "SystemRole");

            migrationBuilder.RenameTable(
                name: "SystemRole",
                newName: "SystemRoles");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SystemRoles",
                table: "SystemRoles",
                column: "Id");

            migrationBuilder.InsertData(
                table: "SystemRoles",
                columns: new[] { "Id", "CreatedAt", "Description", "Name", "Permissions" },
                values: new object[,]
                {
                    { 1, new DateTime(2025, 4, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), "System Administrator with full permissions", "Administrator", null },
                    { 2, new DateTime(2025, 4, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), "Landlord role with property management permissions", "Landlord", null },
                    { 3, new DateTime(2025, 4, 10, 0, 0, 0, 0, DateTimeKind.Unspecified), "Tenant role with limited permissions", "Tenant", null }
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Users_SystemRoles_SystemRoleId",
                table: "Users",
                column: "SystemRoleId",
                principalTable: "SystemRoles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_SystemRoles_SystemRoleId",
                table: "Users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SystemRoles",
                table: "SystemRoles");

            migrationBuilder.DeleteData(
                table: "SystemRoles",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "SystemRoles",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "SystemRoles",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.RenameTable(
                name: "SystemRoles",
                newName: "SystemRole");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SystemRole",
                table: "SystemRole",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_SystemRole_SystemRoleId",
                table: "Users",
                column: "SystemRoleId",
                principalTable: "SystemRole",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
