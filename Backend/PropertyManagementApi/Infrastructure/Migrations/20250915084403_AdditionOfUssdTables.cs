using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdditionOfUssdTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UssdMenus",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Code = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RootNodeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UssdMenus", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UssdSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    SessionId = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ServiceCode = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PhoneNumber = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CurrentNodeId = table.Column<int>(type: "int", nullable: false),
                    DataJson = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UssdSessions", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UssdNodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    MenuId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Prompt = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ValidationRegex = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DataKey = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NextNodeId = table.Column<int>(type: "int", nullable: true),
                    ActionKey = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UssdNodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UssdNodes_UssdMenus_MenuId",
                        column: x => x.MenuId,
                        principalTable: "UssdMenus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UssdOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    NodeId = table.Column<int>(type: "int", nullable: false),
                    Label = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Value = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NextNodeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UssdOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UssdOptions_UssdNodes_NodeId",
                        column: x => x.NodeId,
                        principalTable: "UssdNodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "UssdMenus",
                columns: new[] { "Id", "Code", "RootNodeId", "Title" },
                values: new object[] { 1, "waterpay", 10, "Welcome to WaterPay" });

            migrationBuilder.InsertData(
                table: "UssdNodes",
                columns: new[] { "Id", "ActionKey", "DataKey", "MenuId", "NextNodeId", "Prompt", "Type", "ValidationRegex" },
                values: new object[,]
                {
                    { 10, null, null, 1, null, "Welcome to WaterPay\n1. Pay water bill\n0. Exit", 1, null },
                    { 20, null, "meter", 1, 25, "Enter Meter Number:", 2, "^\\d{6,16}$" },
                    { 25, "LookupCustomer", null, 1, 30, "Looking up meter...", 3, null },
                    { 30, null, "amount", 1, 40, "{customerName} - Meter {meter}\nEnter amount ({CURRENCY}):", 2, "^\\d+(\\.\\d{1,2})?$" },
                    { 40, null, null, 1, null, "Pay {CURRENCY} {amount} for Meter {meter}?\n1. Confirm\n2. Cancel", 1, null },
                    { 50, "Checkout", null, 1, null, "Processing payment...", 3, null },
                    { 90, null, null, 1, null, "Goodbye.", 4, null }
                });

            migrationBuilder.InsertData(
                table: "UssdOptions",
                columns: new[] { "Id", "Label", "NextNodeId", "NodeId", "Value" },
                values: new object[,]
                {
                    { 1, "1. Pay water bill", 20, 10, "1" },
                    { 2, "0. Exit", 90, 10, "0" },
                    { 3, "1. Confirm", 50, 40, "1" },
                    { 4, "2. Cancel", 90, 40, "2" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_UssdNodes_MenuId",
                table: "UssdNodes",
                column: "MenuId");

            migrationBuilder.CreateIndex(
                name: "IX_UssdOptions_NodeId",
                table: "UssdOptions",
                column: "NodeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UssdOptions");

            migrationBuilder.DropTable(
                name: "UssdSessions");

            migrationBuilder.DropTable(
                name: "UssdNodes");

            migrationBuilder.DropTable(
                name: "UssdMenus");
        }
    }
}
