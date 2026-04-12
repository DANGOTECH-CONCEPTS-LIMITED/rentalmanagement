using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDbBackedSerilogServiceLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EventHash",
                table: "ServiceLogs",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "RawContent",
                table: "ServiceLogs",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SourceIdentifier",
                table: "ServiceLogs",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "ServiceLogs",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceLogs_EventHash",
                table: "ServiceLogs",
                column: "EventHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceLogs_LogDate",
                table: "ServiceLogs",
                column: "LogDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ServiceLogs_EventHash",
                table: "ServiceLogs");

            migrationBuilder.DropIndex(
                name: "IX_ServiceLogs_LogDate",
                table: "ServiceLogs");

            migrationBuilder.DropColumn(
                name: "EventHash",
                table: "ServiceLogs");

            migrationBuilder.DropColumn(
                name: "RawContent",
                table: "ServiceLogs");

            migrationBuilder.DropColumn(
                name: "SourceIdentifier",
                table: "ServiceLogs");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "ServiceLogs");
        }
    }
}
