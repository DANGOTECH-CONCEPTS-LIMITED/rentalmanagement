using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCaretakerPropertyAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CaretakerPropertyAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CaretakerId = table.Column<int>(type: "int", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaretakerPropertyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaretakerPropertyAssignments_LandLordProperties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "LandLordProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CaretakerPropertyAssignments_Users_CaretakerId",
                        column: x => x.CaretakerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_CaretakerPropertyAssignments_CaretakerId_PropertyId",
                table: "CaretakerPropertyAssignments",
                columns: new[] { "CaretakerId", "PropertyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CaretakerPropertyAssignments_PropertyId",
                table: "CaretakerPropertyAssignments",
                column: "PropertyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CaretakerPropertyAssignments");
        }
    }
}
