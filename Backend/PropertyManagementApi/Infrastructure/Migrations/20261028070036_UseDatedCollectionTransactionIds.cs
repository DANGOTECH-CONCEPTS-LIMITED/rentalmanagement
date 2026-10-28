using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UseDatedCollectionTransactionIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientReference",
                table: "TenantPayments",
                type: "varchar(128)",
                maxLength: 128,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CollectionTransactionIdentity",
                columns: table => new
                {
                    TransactionId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Category = table.Column<string>(type: "varchar(1)", maxLength: 1, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ClientReferenceHash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CollectionTransactionIdentity", x => x.TransactionId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TenantPayments_ClientReference",
                table: "TenantPayments",
                column: "ClientReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CollectionTransactionIdentity_ClientReferenceHash",
                table: "CollectionTransactionIdentity",
                column: "ClientReferenceHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CollectionTransactionIdentity");

            migrationBuilder.DropIndex(
                name: "IX_TenantPayments_ClientReference",
                table: "TenantPayments");

            migrationBuilder.DropColumn(
                name: "ClientReference",
                table: "TenantPayments");
        }
    }
}
