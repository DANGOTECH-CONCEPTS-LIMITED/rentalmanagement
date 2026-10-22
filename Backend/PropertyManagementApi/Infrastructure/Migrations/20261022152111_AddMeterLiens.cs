using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMeterLiens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MeterLienPolicies",
                columns: table => new
                {
                    UtilityMeterId = table.Column<int>(type: "int", nullable: false),
                    RepaymentMode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RepaymentPercentage = table.Column<decimal>(type: "decimal(28,18)", precision: 28, scale: 18, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeterLienPolicies", x => x.UtilityMeterId);
                    table.ForeignKey(
                        name: "FK_MeterLienPolicies_UtilityMeters_UtilityMeterId",
                        column: x => x.UtilityMeterId,
                        principalTable: "UtilityMeters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "MeterLienRepayments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PaymentId = table.Column<int>(type: "int", nullable: false),
                    UtilityMeterId = table.Column<int>(type: "int", nullable: true),
                    PaymentAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    FeeAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    LienAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TokenAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RepaymentMode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RepaymentPercentage = table.Column<decimal>(type: "decimal(28,18)", precision: 28, scale: 18, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    VendState = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VendStartedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    VendError = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeterLienRepayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeterLienRepayments_UtilityMeters_UtilityMeterId",
                        column: x => x.UtilityMeterId,
                        principalTable: "UtilityMeters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MeterLienRepayments_UtilityPayments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "UtilityPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "MeterLiens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UtilityMeterId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeterLiens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeterLiens_UtilityMeters_UtilityMeterId",
                        column: x => x.UtilityMeterId,
                        principalTable: "UtilityMeters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "MeterLienAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    MeterLienId = table.Column<int>(type: "int", nullable: false),
                    MeterLienRepaymentId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeterLienAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeterLienAllocations_MeterLienRepayments_MeterLienRepaymentId",
                        column: x => x.MeterLienRepaymentId,
                        principalTable: "MeterLienRepayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MeterLienAllocations_MeterLiens_MeterLienId",
                        column: x => x.MeterLienId,
                        principalTable: "MeterLiens",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_MeterLienAllocations_MeterLienId",
                table: "MeterLienAllocations",
                column: "MeterLienId");

            migrationBuilder.CreateIndex(
                name: "IX_MeterLienAllocations_MeterLienRepaymentId_MeterLienId",
                table: "MeterLienAllocations",
                columns: new[] { "MeterLienRepaymentId", "MeterLienId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeterLienRepayments_PaymentId",
                table: "MeterLienRepayments",
                column: "PaymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MeterLienRepayments_UtilityMeterId",
                table: "MeterLienRepayments",
                column: "UtilityMeterId");

            migrationBuilder.CreateIndex(
                name: "IX_MeterLiens_UtilityMeterId_CreatedAt",
                table: "MeterLiens",
                columns: new[] { "UtilityMeterId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeterLienAllocations");

            migrationBuilder.DropTable(
                name: "MeterLienPolicies");

            migrationBuilder.DropTable(
                name: "MeterLienRepayments");

            migrationBuilder.DropTable(
                name: "MeterLiens");
        }
    }
}
