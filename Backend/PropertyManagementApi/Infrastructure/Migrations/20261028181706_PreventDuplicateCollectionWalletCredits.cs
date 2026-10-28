using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PreventDuplicateCollectionWalletCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            AddCreditMarkerIfMissing(migrationBuilder, "UtilityPayments");
            AddCreditMarkerIfMissing(migrationBuilder, "TenantPayments");

            // Indexed temporary snapshot prevents repeated unindexed ledger scans.
            migrationBuilder.Sql(@"
                UPDATE `UtilityPayments`
                SET `WalletCreditedAtUtc` = UTC_TIMESTAMP(6)
                WHERE `WalletCreditedAtUtc` IS NULL AND `Status` = 'SUCCESSFUL';");

            migrationBuilder.Sql(@"
                UPDATE `TenantPayments`
                SET `WalletCreditedAtUtc` = UTC_TIMESTAMP(6)
                WHERE `WalletCreditedAtUtc` IS NULL AND `PaymentStatus` = 'SUCCESSFUL';");

            migrationBuilder.Sql(@"
                DROP TEMPORARY TABLE IF EXISTS `__WalletCreditBackfill`;");

            migrationBuilder.Sql(@"
                CREATE TEMPORARY TABLE `__WalletCreditBackfill` AS
                SELECT DISTINCT `WalletId`, `TransactionId`
                FROM `WalletTransactions`
                WHERE `TransactionId` IS NOT NULL
                  AND `TransactionId` <> ''
                  AND `Amount` > 0
                  AND `Status` <> 'REVERSAL';");

            migrationBuilder.Sql(@"
                ALTER TABLE `__WalletCreditBackfill`
                ADD INDEX `IX_WalletCreditBackfill_Reference` (`TransactionId`(128), `WalletId`);");

            migrationBuilder.Sql(@"
                UPDATE `UtilityPayments` p
                JOIN `UtilityMeters` m ON m.`MeterNumber` = p.`MeterNumber`
                JOIN `Wallets` w ON w.`LandlordId` = m.`LandLordId`
                JOIN `__WalletCreditBackfill` t ON t.`WalletId` = w.`Id` AND t.`TransactionId` = p.`TransactionID`
                SET p.`WalletCreditedAtUtc` = UTC_TIMESTAMP(6)
                WHERE p.`WalletCreditedAtUtc` IS NULL
                  AND p.`TransactionID` IS NOT NULL
                  AND p.`TransactionID` <> '';");

            migrationBuilder.Sql(@"
                UPDATE `TenantPayments` p
                JOIN `Tenants` pt ON pt.`Id` = p.`PropertyTenantId`
                JOIN `LandLordProperties` pr ON pr.`Id` = pt.`PropertyId`
                JOIN `Wallets` w ON w.`LandlordId` = pr.`OwnerId`
                JOIN `__WalletCreditBackfill` t ON t.`WalletId` = w.`Id` AND t.`TransactionId` = p.`TransactionId`
                SET p.`WalletCreditedAtUtc` = UTC_TIMESTAMP(6)
                WHERE p.`WalletCreditedAtUtc` IS NULL
                  AND p.`TransactionId` <> '';");

            migrationBuilder.Sql(@"
                DROP TEMPORARY TABLE IF EXISTS `__WalletCreditBackfill`;");
        }

        private static void AddCreditMarkerIfMissing(MigrationBuilder migrationBuilder, string table)
        {
            // MySQL DDL can survive a failed migration without its history row being written.
            migrationBuilder.Sql($@"
                SET @wallet_credit_ddl = IF(EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}'
                      AND COLUMN_NAME = 'WalletCreditedAtUtc'
                ), 'SELECT 1', 'ALTER TABLE `{table}` ADD COLUMN `WalletCreditedAtUtc` datetime(6) NULL');
                PREPARE wallet_credit_statement FROM @wallet_credit_ddl;
                EXECUTE wallet_credit_statement;
                DEALLOCATE PREPARE wallet_credit_statement;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WalletCreditedAtUtc",
                table: "UtilityPayments");

            migrationBuilder.DropColumn(
                name: "WalletCreditedAtUtc",
                table: "TenantPayments");
        }
    }
}
