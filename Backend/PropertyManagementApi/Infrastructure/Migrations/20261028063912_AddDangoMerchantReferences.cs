using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDangoMerchantReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProviderReferenceNumber",
                table: "PaymentGatewaySubmission",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "DangoPaymentReferenceAllocation",
                columns: table => new
                {
                    DateUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Sequence = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DangoPaymentReferenceAllocation", x => new { x.DateUtc, x.Sequence });
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentGatewaySubmission_ProviderReferenceNumber",
                table: "PaymentGatewaySubmission",
                column: "ProviderReferenceNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DangoPaymentReferenceAllocation");

            migrationBuilder.DropIndex(
                name: "IX_PaymentGatewaySubmission_ProviderReferenceNumber",
                table: "PaymentGatewaySubmission");

            migrationBuilder.DropColumn(
                name: "ProviderReferenceNumber",
                table: "PaymentGatewaySubmission");
        }
    }
}
