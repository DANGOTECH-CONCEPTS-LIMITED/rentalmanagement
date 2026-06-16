using System;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260514100000_AddPropertyUnits")]
    public partial class AddPropertyUnits : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PropertyUnits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    UnitNumber = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SecurityDeposit = table.Column<double>(type: "double", nullable: false),
                    MonthlyAmount = table.Column<double>(type: "double", nullable: false),
                    Status = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyUnits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyUnits_LandLordProperties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "LandLordProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "PropertyUnitId",
                table: "Tenants",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PropertyUnits_PropertyId",
                table: "PropertyUnits",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyUnits_Status",
                table: "PropertyUnits",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyUnits_PropertyId_UnitNumber",
                table: "PropertyUnits",
                columns: new[] { "PropertyId", "UnitNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_PropertyUnitId",
                table: "Tenants",
                column: "PropertyUnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tenants_PropertyUnits_PropertyUnitId",
                table: "Tenants",
                column: "PropertyUnitId",
                principalTable: "PropertyUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tenants_PropertyUnits_PropertyUnitId",
                table: "Tenants");

            migrationBuilder.DropTable(
                name: "PropertyUnits");

            migrationBuilder.DropIndex(
                name: "IX_Tenants_PropertyUnitId",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "PropertyUnitId",
                table: "Tenants");
        }
    }
}
