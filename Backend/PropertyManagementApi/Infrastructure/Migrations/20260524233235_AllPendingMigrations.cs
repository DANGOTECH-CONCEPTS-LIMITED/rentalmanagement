using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AllPendingMigrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Some environments can be missing tables due to partial migration history.
            // Ensure required dependency tables exist before applying changes that reference them.
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `PropertyUnits` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `PropertyId` int NOT NULL,
    `UnitNumber` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `SecurityDeposit` double NOT NULL,
    `MonthlyAmount` double NOT NULL,
    `Status` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NULL,
    CONSTRAINT `PK_PropertyUnits` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;
");

            migrationBuilder.Sql(@"
SET @fk := (
    SELECT rc.CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      AND rc.TABLE_NAME = 'RentalContracts'
      AND rc.CONSTRAINT_NAME = 'FK_RentalContracts_LandLordProperties_PropertyId'
    LIMIT 1
);
SET @stmt := IF(@fk IS NULL,
    'SELECT 1',
    CONCAT('ALTER TABLE `RentalContracts` DROP FOREIGN KEY `', @fk, '`')
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            migrationBuilder.Sql(@"
SET @fk := (
    SELECT rc.CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      AND rc.TABLE_NAME = 'RentalContracts'
      AND rc.CONSTRAINT_NAME = 'FK_RentalContracts_PropertyUnits_UnitId'
    LIMIT 1
);
SET @stmt := IF(@fk IS NULL,
    'SELECT 1',
    CONCAT('ALTER TABLE `RentalContracts` DROP FOREIGN KEY `', @fk, '`')
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            migrationBuilder.Sql(@"
SET @fk := (
    SELECT rc.CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      AND rc.TABLE_NAME = 'RentalContracts'
      AND rc.CONSTRAINT_NAME = 'FK_RentalContracts_Tenants_TenantId'
    LIMIT 1
);
SET @stmt := IF(@fk IS NULL,
    'SELECT 1',
    CONCAT('ALTER TABLE `RentalContracts` DROP FOREIGN KEY `', @fk, '`')
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            migrationBuilder.Sql(@"
SET @fk := (
    SELECT rc.CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      AND rc.TABLE_NAME = 'RentalContracts'
      AND rc.CONSTRAINT_NAME = 'FK_RentalContracts_Users_OwnerId'
    LIMIT 1
);
SET @stmt := IF(@fk IS NULL,
    'SELECT 1',
    CONCAT('ALTER TABLE `RentalContracts` DROP FOREIGN KEY `', @fk, '`')
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            // Avoid dropping the primary key on MariaDB/MySQL. Dropping and re-adding PK on an AUTO_INCREMENT
            // column can fail if the table already has an AUTO_INCREMENT column but no key at that moment.

            migrationBuilder.Sql(@"
SET @has_old_table := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'RentalContracts'
);
SET @has_new_table := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'rentalcontracts'
);
SET @stmt := IF(@has_old_table > 0 AND @has_new_table = 0,
    'RENAME TABLE `RentalContracts` TO `rentalcontracts`',
    'SELECT 1'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            // MariaDB doesn't support renaming indexes via ALTER TABLE ... RENAME INDEX in all versions.
            // Index names are not critical for correctness; skip explicit renames for compatibility.

            // Keep the existing primary key; it remains valid after table rename.

            migrationBuilder.Sql(@"
SET @idx := (
    SELECT s.INDEX_NAME
    FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = DATABASE()
      AND s.TABLE_NAME = 'rentalcontracts'
      AND s.INDEX_NAME = 'IX_rentalcontracts_PropertyId'
    LIMIT 1
);
SET @stmt := IF(@idx IS NULL,
    'CREATE INDEX `IX_rentalcontracts_PropertyId` ON `rentalcontracts` (`PropertyId`)',
    'SELECT 1'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            migrationBuilder.Sql(@"
SET @idx := (
    SELECT s.INDEX_NAME
    FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = DATABASE()
      AND s.TABLE_NAME = 'rentalcontracts'
      AND s.INDEX_NAME = 'IX_rentalcontracts_UnitId'
    LIMIT 1
);
SET @stmt := IF(@idx IS NULL,
    'CREATE INDEX `IX_rentalcontracts_UnitId` ON `rentalcontracts` (`UnitId`)',
    'SELECT 1'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            migrationBuilder.Sql(@"
SET @idx := (
    SELECT s.INDEX_NAME
    FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = DATABASE()
      AND s.TABLE_NAME = 'rentalcontracts'
      AND s.INDEX_NAME = 'IX_rentalcontracts_TenantId'
    LIMIT 1
);
SET @stmt := IF(@idx IS NULL,
    'CREATE INDEX `IX_rentalcontracts_TenantId` ON `rentalcontracts` (`TenantId`)',
    'SELECT 1'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");

            // Skip adding these optional foreign keys for MariaDB/MySQL compatibility.
            // Some environments have schema drift (column types/engines) which can cause errno 150.
            // Relationships can be reintroduced in a dedicated, validated migration later.

            migrationBuilder.Sql(@"
SET @fk := (
    SELECT rc.CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
      AND rc.TABLE_NAME = 'rentalcontracts'
      AND rc.CONSTRAINT_NAME = 'FK_rentalcontracts_Users_OwnerId'
    LIMIT 1
);
SET @stmt := IF(@fk IS NULL,
    'ALTER TABLE `rentalcontracts` ADD CONSTRAINT `FK_rentalcontracts_Users_OwnerId` FOREIGN KEY (`OwnerId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_rentalcontracts_LandLordProperties_PropertyId",
                table: "rentalcontracts");

            migrationBuilder.DropForeignKey(
                name: "FK_rentalcontracts_PropertyUnits_UnitId",
                table: "rentalcontracts");

            migrationBuilder.DropForeignKey(
                name: "FK_rentalcontracts_Tenants_TenantId",
                table: "rentalcontracts");

            migrationBuilder.DropForeignKey(
                name: "FK_rentalcontracts_Users_OwnerId",
                table: "rentalcontracts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_rentalcontracts",
                table: "rentalcontracts");

            migrationBuilder.RenameTable(
                name: "rentalcontracts",
                newName: "RentalContracts");

            migrationBuilder.RenameIndex(
                name: "IX_rentalcontracts_UnitId",
                table: "RentalContracts",
                newName: "IX_RentalContracts_UnitId");

            migrationBuilder.RenameIndex(
                name: "IX_rentalcontracts_TenantId",
                table: "RentalContracts",
                newName: "IX_RentalContracts_TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_rentalcontracts_PropertyId",
                table: "RentalContracts",
                newName: "IX_RentalContracts_PropertyId");

            migrationBuilder.RenameIndex(
                name: "IX_rentalcontracts_OwnerId",
                table: "RentalContracts",
                newName: "IX_RentalContracts_OwnerId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_RentalContracts",
                table: "RentalContracts",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RentalContracts_LandLordProperties_PropertyId",
                table: "RentalContracts",
                column: "PropertyId",
                principalTable: "LandLordProperties",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RentalContracts_PropertyUnits_UnitId",
                table: "RentalContracts",
                column: "UnitId",
                principalTable: "PropertyUnits",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RentalContracts_Tenants_TenantId",
                table: "RentalContracts",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_RentalContracts_Users_OwnerId",
                table: "RentalContracts",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
