using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Tests;

public class WalletCreditMigrationTests
{
    [Fact]
    public void MySqlCreditMigrationChecksBothColumnsBeforeAddingAndPreservesExistingMarkers()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql("Server=127.0.0.1;Database=script_only;User=unused;Allow User Variables=True",
                new MySqlServerVersion(new Version(8, 0, 28))).Options);
        // Script generation does not open the configured connection.
        var sql = db.GetService<IMigrator>().GenerateScript(
            "20261028070036_UseDatedCollectionTransactionIds", "20261028181706_PreventDuplicateCollectionWalletCredits");
        foreach (var table in new[] { "UtilityPayments", "TenantPayments" })
        {
            Assert.Contains($"TABLE_NAME = '{table}'", sql);
            Assert.Contains($"'ALTER TABLE `{table}` ADD COLUMN `WalletCreditedAtUtc` datetime(6) NULL'", sql);
        }
        Assert.Contains("INFORMATION_SCHEMA.COLUMNS", sql);
        Assert.Contains("TABLE_SCHEMA = DATABASE()", sql);
        Assert.Contains("COLUMN_NAME = 'WalletCreditedAtUtc'", sql);
        Assert.Contains("'SELECT 1'", sql);
        Assert.Contains("PREPARE wallet_credit_statement FROM @wallet_credit_ddl", sql);
        Assert.Contains("EXECUTE wallet_credit_statement", sql);
        Assert.Contains("DEALLOCATE PREPARE wallet_credit_statement", sql);
        Assert.Contains("`WalletCreditedAtUtc` IS NULL AND `Status` = 'SUCCESSFUL'", sql);
        Assert.Contains("`WalletCreditedAtUtc` IS NULL AND `PaymentStatus` = 'SUCCESSFUL'", sql);
        Assert.Contains("CREATE TEMPORARY TABLE `__WalletCreditBackfill` AS", sql);
        Assert.Contains("FROM `WalletTransactions`", sql);
        Assert.Contains("`Amount` > 0", sql);
        Assert.Contains("`Status` <> 'REVERSAL'", sql);
        Assert.Contains("ADD INDEX `IX_WalletCreditBackfill_Reference` (`TransactionId`(128), `WalletId`)", sql);
        Assert.Contains("JOIN `__WalletCreditBackfill` t ON t.`WalletId` = w.`Id` AND t.`TransactionId` = p.`TransactionID`", sql);
        Assert.Contains("JOIN `__WalletCreditBackfill` t ON t.`WalletId` = w.`Id` AND t.`TransactionId` = p.`TransactionId`", sql);
        Assert.Contains("DROP TEMPORARY TABLE IF EXISTS `__WalletCreditBackfill`", sql);
        Assert.DoesNotContain("DROP COLUMN", sql);
        Assert.Contains("20261028181706_PreventDuplicateCollectionWalletCredits", sql);
    }
}
