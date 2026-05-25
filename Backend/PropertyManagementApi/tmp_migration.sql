DROP PROCEDURE IF EXISTS `POMELO_BEFORE_DROP_PRIMARY_KEY`;
DELIMITER //
CREATE PROCEDURE `POMELO_BEFORE_DROP_PRIMARY_KEY`(IN `SCHEMA_NAME_ARGUMENT` VARCHAR(255), IN `TABLE_NAME_ARGUMENT` VARCHAR(255))
BEGIN
	DECLARE HAS_AUTO_INCREMENT_ID TINYINT(1);
	DECLARE PRIMARY_KEY_COLUMN_NAME VARCHAR(255);
	DECLARE PRIMARY_KEY_TYPE VARCHAR(255);
	DECLARE SQL_EXP VARCHAR(1000);
	SELECT COUNT(*)
		INTO HAS_AUTO_INCREMENT_ID
		FROM `information_schema`.`COLUMNS`
		WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
			AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
			AND `Extra` = 'auto_increment'
			AND `COLUMN_KEY` = 'PRI'
			LIMIT 1;
	IF HAS_AUTO_INCREMENT_ID THEN
		SELECT `COLUMN_TYPE`
			INTO PRIMARY_KEY_TYPE
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_KEY` = 'PRI'
			LIMIT 1;
		SELECT `COLUMN_NAME`
			INTO PRIMARY_KEY_COLUMN_NAME
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_KEY` = 'PRI'
			LIMIT 1;
		SET SQL_EXP = CONCAT('ALTER TABLE `', (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA())), '`.`', TABLE_NAME_ARGUMENT, '` MODIFY COLUMN `', PRIMARY_KEY_COLUMN_NAME, '` ', PRIMARY_KEY_TYPE, ' NOT NULL;');
		SET @SQL_EXP = SQL_EXP;
		PREPARE SQL_EXP_EXECUTE FROM @SQL_EXP;
		EXECUTE SQL_EXP_EXECUTE;
		DEALLOCATE PREPARE SQL_EXP_EXECUTE;
	END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `POMELO_AFTER_ADD_PRIMARY_KEY`;
DELIMITER //
CREATE PROCEDURE `POMELO_AFTER_ADD_PRIMARY_KEY`(IN `SCHEMA_NAME_ARGUMENT` VARCHAR(255), IN `TABLE_NAME_ARGUMENT` VARCHAR(255), IN `COLUMN_NAME_ARGUMENT` VARCHAR(255))
BEGIN
	DECLARE HAS_AUTO_INCREMENT_ID INT(11);
	DECLARE PRIMARY_KEY_COLUMN_NAME VARCHAR(255);
	DECLARE PRIMARY_KEY_TYPE VARCHAR(255);
	DECLARE SQL_EXP VARCHAR(1000);
	SELECT COUNT(*)
		INTO HAS_AUTO_INCREMENT_ID
		FROM `information_schema`.`COLUMNS`
		WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
			AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
			AND `COLUMN_NAME` = COLUMN_NAME_ARGUMENT
			AND `COLUMN_TYPE` LIKE '%int%'
			AND `COLUMN_KEY` = 'PRI';
	IF HAS_AUTO_INCREMENT_ID THEN
		SELECT `COLUMN_TYPE`
			INTO PRIMARY_KEY_TYPE
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_NAME` = COLUMN_NAME_ARGUMENT
				AND `COLUMN_TYPE` LIKE '%int%'
				AND `COLUMN_KEY` = 'PRI';
		SELECT `COLUMN_NAME`
			INTO PRIMARY_KEY_COLUMN_NAME
			FROM `information_schema`.`COLUMNS`
			WHERE `TABLE_SCHEMA` = (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA()))
				AND `TABLE_NAME` = TABLE_NAME_ARGUMENT
				AND `COLUMN_NAME` = COLUMN_NAME_ARGUMENT
				AND `COLUMN_TYPE` LIKE '%int%'
				AND `COLUMN_KEY` = 'PRI';
		SET SQL_EXP = CONCAT('ALTER TABLE `', (SELECT IFNULL(SCHEMA_NAME_ARGUMENT, SCHEMA())), '`.`', TABLE_NAME_ARGUMENT, '` MODIFY COLUMN `', PRIMARY_KEY_COLUMN_NAME, '` ', PRIMARY_KEY_TYPE, ' NOT NULL AUTO_INCREMENT;');
		SET @SQL_EXP = SQL_EXP;
		PREPARE SQL_EXP_EXECUTE FROM @SQL_EXP;
		EXECUTE SQL_EXP_EXECUTE;
		DEALLOCATE PREPARE SQL_EXP_EXECUTE;
	END IF;
END //
DELIMITER ;

CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410193009_InitialCreate') THEN

    ALTER DATABASE CHARACTER SET utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410193009_InitialCreate') THEN

    CREATE TABLE `SystemRole` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NULL,
        `Permissions` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_SystemRole` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410193009_InitialCreate') THEN

    CREATE TABLE `Users` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `FullName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
        `SystemRoleId` int NOT NULL,
        CONSTRAINT `PK_Users` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Users_SystemRole_SystemRoleId` FOREIGN KEY (`SystemRoleId`) REFERENCES `SystemRole` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410193009_InitialCreate') THEN

    CREATE INDEX `IX_Users_SystemRoleId` ON `Users` (`SystemRoleId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410193009_InitialCreate') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250410193009_InitialCreate', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    ALTER TABLE `Users` DROP FOREIGN KEY `FK_Users_SystemRole_SystemRoleId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    CALL POMELO_BEFORE_DROP_PRIMARY_KEY(NULL, 'SystemRole');
    ALTER TABLE `SystemRole` DROP PRIMARY KEY;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    ALTER TABLE `SystemRole` RENAME `SystemRoles`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    ALTER TABLE `SystemRoles` ADD CONSTRAINT `PK_SystemRoles` PRIMARY KEY (`Id`);
    CALL POMELO_AFTER_ADD_PRIMARY_KEY(NULL, 'SystemRoles', 'Id');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    INSERT INTO `SystemRoles` (`Id`, `CreatedAt`, `Description`, `Name`, `Permissions`)
    VALUES (1, TIMESTAMP '2025-04-10 00:00:00', 'System Administrator with full permissions', 'Administrator', NULL),
    (2, TIMESTAMP '2025-04-10 00:00:00', 'Landlord role with property management permissions', 'Landlord', NULL),
    (3, TIMESTAMP '2025-04-10 00:00:00', 'Tenant role with limited permissions', 'Tenant', NULL);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    ALTER TABLE `Users` ADD CONSTRAINT `FK_Users_SystemRoles_SystemRoleId` FOREIGN KEY (`SystemRoleId`) REFERENCES `SystemRoles` (`Id`) ON DELETE CASCADE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250410200307_SeedSystemRoles') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250410200307_SeedSystemRoles', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    ALTER TABLE `Users` ADD `Active` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    ALTER TABLE `Users` ADD `IdBack` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    ALTER TABLE `Users` ADD `IdFront` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    ALTER TABLE `Users` ADD `PassportPhoto` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    ALTER TABLE `Users` ADD `Password` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    ALTER TABLE `Users` ADD `PhoneNumber` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250413091009_AdditionOfNewFieldsOnUser') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250413091009_AdditionOfNewFieldsOnUser', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414085803_AdditionOfPasswordChangedFlagAndVerifiedFlag') THEN

    ALTER TABLE `Users` ADD `PasswordChanged` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414085803_AdditionOfPasswordChangedFlagAndVerifiedFlag') THEN

    ALTER TABLE `Users` ADD `Verified` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414085803_AdditionOfPasswordChangedFlagAndVerifiedFlag') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414085803_AdditionOfPasswordChangedFlagAndVerifiedFlag', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414104418_AdditionOfPropertyTable') THEN

    CREATE TABLE `LandLordProperties` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Type` longtext CHARACTER SET utf8mb4 NULL,
        `Address` longtext CHARACTER SET utf8mb4 NULL,
        `Region` longtext CHARACTER SET utf8mb4 NULL,
        `District` longtext CHARACTER SET utf8mb4 NULL,
        `Zipcode` longtext CHARACTER SET utf8mb4 NULL,
        `NumberOfRooms` int NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NULL,
        `ImageUrl` longtext CHARACTER SET utf8mb4 NULL,
        `Price` double NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `OwnerId` int NOT NULL,
        CONSTRAINT `PK_LandLordProperties` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_LandLordProperties_Users_OwnerId` FOREIGN KEY (`OwnerId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414104418_AdditionOfPropertyTable') THEN

    CREATE INDEX `IX_LandLordProperties_OwnerId` ON `LandLordProperties` (`OwnerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414104418_AdditionOfPropertyTable') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414104418_AdditionOfPropertyTable', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414124441_AdditionOfTokenColumnToUser') THEN

    ALTER TABLE `Users` ADD `Token` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414124441_AdditionOfTokenColumnToUser') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414124441_AdditionOfTokenColumnToUser', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414132231_AdditionOfNationalIdNumber') THEN

    ALTER TABLE `Users` ADD `NationalIdNumber` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414132231_AdditionOfNationalIdNumber') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414132231_AdditionOfNationalIdNumber', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414145540_AdditionOfCurrencyToProperty') THEN

    ALTER TABLE `LandLordProperties` ADD `Currency` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414145540_AdditionOfCurrencyToProperty') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414145540_AdditionOfCurrencyToProperty', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414154757_AdditionOfTenant') THEN

    CREATE TABLE `Tenants` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        `FullName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PhoneNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Password` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Active` tinyint(1) NOT NULL,
        `PassportPhoto` longtext CHARACTER SET utf8mb4 NOT NULL,
        `IdFront` longtext CHARACTER SET utf8mb4 NOT NULL,
        `IdBack` longtext CHARACTER SET utf8mb4 NOT NULL,
        `NationalIdNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `DateMovedIn` datetime(6) NULL,
        `PropertyId` int NOT NULL,
        CONSTRAINT `PK_Tenants` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Tenants_LandLordProperties_PropertyId` FOREIGN KEY (`PropertyId`) REFERENCES `LandLordProperties` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414154757_AdditionOfTenant') THEN

    CREATE INDEX `IX_Tenants_PropertyId` ON `Tenants` (`PropertyId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414154757_AdditionOfTenant') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414154757_AdditionOfTenant', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414170545_AdditionOfNewColumnsOnTenants') THEN

    ALTER TABLE `Tenants` ADD `NextPaymentDate` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414170545_AdditionOfNewColumnsOnTenants') THEN

    ALTER TABLE `Tenants` ADD `PaymentStatus` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414170545_AdditionOfNewColumnsOnTenants') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414170545_AdditionOfNewColumnsOnTenants', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414204305_AdditionOfTenantPayments') THEN

    CREATE TABLE `TenantPayments` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Amount` double NOT NULL,
        `PaymentDate` datetime(6) NOT NULL,
        `PaymentMethod` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Vendor` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PaymentType` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PaymentStatus` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TransactionId` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PropertyTenantId` int NOT NULL,
        CONSTRAINT `PK_TenantPayments` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_TenantPayments_Tenants_PropertyTenantId` FOREIGN KEY (`PropertyTenantId`) REFERENCES `Tenants` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414204305_AdditionOfTenantPayments') THEN

    CREATE INDEX `IX_TenantPayments_PropertyTenantId` ON `TenantPayments` (`PropertyTenantId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250414204305_AdditionOfTenantPayments') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250414204305_AdditionOfTenantPayments', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250417134423_AddBalanceDueToTenant') THEN

    ALTER TABLE `Tenants` ADD `BalanceDue` double NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250417134423_AddBalanceDueToTenant') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250417134423_AddBalanceDueToTenant', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250417141157_AddArrearsToTenant') THEN

    ALTER TABLE `Tenants` ADD `Arrears` double NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250417141157_AddArrearsToTenant') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250417141157_AddArrearsToTenant', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250418084951_RemovalOfNameFromTenant') THEN

    ALTER TABLE `Tenants` DROP COLUMN `Name`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250418084951_RemovalOfNameFromTenant') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250418084951_RemovalOfNameFromTenant', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250418093004_RemovalOfPasswordFromTenant') THEN

    ALTER TABLE `Tenants` DROP COLUMN `Password`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250418093004_RemovalOfPasswordFromTenant') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250418093004_RemovalOfPasswordFromTenant', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419103047_AdditionOfUserIdOnTenant') THEN

    ALTER TABLE `Tenants` ADD `UserId` int NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419103047_AdditionOfUserIdOnTenant') THEN

    CREATE INDEX `IX_Tenants_UserId` ON `Tenants` (`UserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419103047_AdditionOfUserIdOnTenant') THEN

    ALTER TABLE `Tenants` ADD CONSTRAINT `FK_Tenants_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419103047_AdditionOfUserIdOnTenant') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250419103047_AdditionOfUserIdOnTenant', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419221216_AdditionOfTenantcomplaints') THEN

    CREATE TABLE `TenantComplaints` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Subject` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Priority` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Attachement` longtext CHARACTER SET utf8mb4 NOT NULL,
        `DateCreated` datetime(6) NOT NULL,
        `DateUpdated` datetime(6) NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ResolutionDetails` longtext CHARACTER SET utf8mb4 NULL,
        `PropertyId` int NOT NULL,
        CONSTRAINT `PK_TenantComplaints` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_TenantComplaints_LandLordProperties_PropertyId` FOREIGN KEY (`PropertyId`) REFERENCES `LandLordProperties` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419221216_AdditionOfTenantcomplaints') THEN

    CREATE INDEX `IX_TenantComplaints_PropertyId` ON `TenantComplaints` (`PropertyId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250419221216_AdditionOfTenantcomplaints') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250419221216_AdditionOfTenantcomplaints', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421155048_AdditionOfWallet') THEN

    CREATE TABLE `Wallets` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `LandlordId` int NOT NULL,
        `Balance` decimal(65,30) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Wallets` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Wallets_Users_LandlordId` FOREIGN KEY (`LandlordId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421155048_AdditionOfWallet') THEN

    CREATE TABLE `WalletTransactions` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `WalletId` int NOT NULL,
        `Amount` decimal(65,30) NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TransactionId` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TransactionDate` datetime(6) NOT NULL,
        CONSTRAINT `PK_WalletTransactions` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_WalletTransactions_Wallets_WalletId` FOREIGN KEY (`WalletId`) REFERENCES `Wallets` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421155048_AdditionOfWallet') THEN

    CREATE UNIQUE INDEX `IX_Wallets_LandlordId` ON `Wallets` (`LandlordId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421155048_AdditionOfWallet') THEN

    CREATE INDEX `IX_WalletTransactions_WalletId` ON `WalletTransactions` (`WalletId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421155048_AdditionOfWallet') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250421155048_AdditionOfWallet', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421163530_ColumnAdditionDescriptionOnTenantPaymentsAndTransactionIdOnWalletTransactions') THEN

    ALTER TABLE `WalletTransactions` ADD `CreatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421163530_ColumnAdditionDescriptionOnTenantPaymentsAndTransactionIdOnWalletTransactions') THEN

    ALTER TABLE `TenantPayments` ADD `Description` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250421163530_ColumnAdditionDescriptionOnTenantPaymentsAndTransactionIdOnWalletTransactions') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250421163530_ColumnAdditionDescriptionOnTenantPaymentsAndTransactionIdOnWalletTransactions', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250502080349_AdditionOfNewColumnsOnPayments') THEN

    ALTER TABLE `TenantPayments` ADD `ReasonAtTelecom` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250502080349_AdditionOfNewColumnsOnPayments') THEN

    ALTER TABLE `TenantPayments` ADD `VendorTransactionId` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250502080349_AdditionOfNewColumnsOnPayments') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250502080349_AdditionOfNewColumnsOnPayments', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250504085332_AdditionOfStatusToWallet') THEN

    ALTER TABLE `WalletTransactions` ADD `Status` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250504085332_AdditionOfStatusToWallet') THEN

    ALTER TABLE `WalletTransactions` ADD `VendorTranId` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250504085332_AdditionOfStatusToWallet') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250504085332_AdditionOfStatusToWallet', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510100434_AdditionOfUtilityPaymentRole') THEN

    INSERT INTO `SystemRoles` (`Id`, `CreatedAt`, `Description`, `Name`, `Permissions`)
    VALUES (4, TIMESTAMP '2025-04-10 00:00:00', 'Utility payment role with limited permissions', 'Utililty Payment', NULL);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510100434_AdditionOfUtilityPaymentRole') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250510100434_AdditionOfUtilityPaymentRole', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510121819_AdditionOfUtilityPayment') THEN

    CREATE TABLE `UtilityPayments` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Description` longtext CHARACTER SET utf8mb4 NULL,
        `TransactionID` longtext CHARACTER SET utf8mb4 NULL,
        `ReasonAtTelecom` longtext CHARACTER SET utf8mb4 NULL,
        `PaymentMethod` longtext CHARACTER SET utf8mb4 NULL,
        `UtilityType` longtext CHARACTER SET utf8mb4 NULL,
        `Status` longtext CHARACTER SET utf8mb4 NULL,
        `VendorTranId` longtext CHARACTER SET utf8mb4 NULL,
        `Amount` double NOT NULL,
        `Charges` double NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `PhoneNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `MeterNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Token` longtext CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `PK_UtilityPayments` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510121819_AdditionOfUtilityPayment') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250510121819_AdditionOfUtilityPayment', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510142231_AdditionOfUtilityMeter') THEN

    CREATE TABLE `UtilityMeters` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `MeterType` longtext CHARACTER SET utf8mb4 NULL,
        `MeterNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `LandLordId` int NOT NULL,
        `DateCreated` datetime(6) NOT NULL,
        CONSTRAINT `PK_UtilityMeters` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_UtilityMeters_Users_LandLordId` FOREIGN KEY (`LandLordId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510142231_AdditionOfUtilityMeter') THEN

    CREATE INDEX `IX_UtilityMeters_LandLordId` ON `UtilityMeters` (`LandLordId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250510142231_AdditionOfUtilityMeter') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250510142231_AdditionOfUtilityMeter', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250511175618_AdditionOfUnitsToUtilityPayment') THEN

    ALTER TABLE `UtilityPayments` ADD `Units` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250511175618_AdditionOfUnitsToUtilityPayment') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250511175618_AdditionOfUnitsToUtilityPayment', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250511182336_AdditionOfIsTokenGeneratedFlag') THEN

    ALTER TABLE `UtilityPayments` ADD `IsTokenGenerated` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250511182336_AdditionOfIsTokenGeneratedFlag') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250511182336_AdditionOfIsTokenGeneratedFlag', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250511190137_AdditionOfHttpRequestResponseTable') THEN

    CREATE TABLE `HttpRequesRequestResponses` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Request` longtext CHARACTER SET utf8mb4 NULL,
        `Response` longtext CHARACTER SET utf8mb4 NULL,
        `Status` longtext CHARACTER SET utf8mb4 NULL,
        `ErrorMessage` longtext CHARACTER SET utf8mb4 NULL,
        `RequestType` longtext CHARACTER SET utf8mb4 NULL,
        `RequestUrl` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_HttpRequesRequestResponses` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250511190137_AdditionOfHttpRequestResponseTable') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250511190137_AdditionOfHttpRequestResponseTable', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250710192957_AdditionOfUtilityAccountToUtilityMeter') THEN

    ALTER TABLE `UtilityMeters` ADD `NWSCAccount` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250710192957_AdditionOfUtilityAccountToUtilityMeter') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250710192957_AdditionOfUtilityAccountToUtilityMeter', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250710193911_AdditionOfUtilityAccountLocationToUtilityMeter') THEN

    ALTER TABLE `UtilityMeters` ADD `LocationOfNwscMeter` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250710193911_AdditionOfUtilityAccountLocationToUtilityMeter') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250710193911_AdditionOfUtilityAccountLocationToUtilityMeter', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250718103302_AdditionOfNewColumnsToUtilityPayment') THEN

    ALTER TABLE `UtilityPayments` ADD `UtilityAccountNumber` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250718103302_AdditionOfNewColumnsToUtilityPayment') THEN

    ALTER TABLE `UtilityPayments` ADD `Vendor` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250718103302_AdditionOfNewColumnsToUtilityPayment') THEN

    ALTER TABLE `UtilityPayments` ADD `VendorPaymentDate` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250718103302_AdditionOfNewColumnsToUtilityPayment') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250718103302_AdditionOfNewColumnsToUtilityPayment', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    CREATE TABLE `UssdMenus` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Code` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `RootNodeId` int NOT NULL,
        CONSTRAINT `PK_UssdMenus` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    CREATE TABLE `UssdSessions` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `SessionId` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ServiceCode` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PhoneNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CurrentNodeId` int NOT NULL,
        `DataJson` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `UpdatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_UssdSessions` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    CREATE TABLE `UssdNodes` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `MenuId` int NOT NULL,
        `Type` int NOT NULL,
        `Prompt` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ValidationRegex` longtext CHARACTER SET utf8mb4 NULL,
        `DataKey` longtext CHARACTER SET utf8mb4 NULL,
        `NextNodeId` int NULL,
        `ActionKey` longtext CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `PK_UssdNodes` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_UssdNodes_UssdMenus_MenuId` FOREIGN KEY (`MenuId`) REFERENCES `UssdMenus` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    CREATE TABLE `UssdOptions` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `NodeId` int NOT NULL,
        `Label` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Value` longtext CHARACTER SET utf8mb4 NOT NULL,
        `NextNodeId` int NOT NULL,
        CONSTRAINT `PK_UssdOptions` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_UssdOptions_UssdNodes_NodeId` FOREIGN KEY (`NodeId`) REFERENCES `UssdNodes` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    INSERT INTO `UssdMenus` (`Id`, `Code`, `RootNodeId`, `Title`)
    VALUES (1, 'waterpay', 10, 'Welcome to WaterPay');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    INSERT INTO `UssdNodes` (`Id`, `ActionKey`, `DataKey`, `MenuId`, `NextNodeId`, `Prompt`, `Type`, `ValidationRegex`)
    VALUES (10, NULL, NULL, 1, NULL, CONCAT('Welcome to WaterPay', CHAR(10), '1. Pay water bill', CHAR(10), '0. Exit'), 1, NULL),
    (20, NULL, 'meter', 1, 25, 'Enter Meter Number:', 2, '^\\d{6,16}$'),
    (25, 'LookupCustomer', NULL, 1, 30, 'Looking up meter...', 3, NULL),
    (30, NULL, 'amount', 1, 40, CONCAT('{customerName} - Meter {meter}', CHAR(10), 'Enter amount ({CURRENCY}):'), 2, '^\\d+(\\.\\d{1,2})?$'),
    (40, NULL, NULL, 1, NULL, CONCAT('Pay {CURRENCY} {amount} for Meter {meter}?', CHAR(10), '1. Confirm', CHAR(10), '2. Cancel'), 1, NULL),
    (50, 'Checkout', NULL, 1, NULL, 'Processing payment...', 3, NULL),
    (90, NULL, NULL, 1, NULL, 'Goodbye.', 4, NULL);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    INSERT INTO `UssdOptions` (`Id`, `Label`, `NextNodeId`, `NodeId`, `Value`)
    VALUES (1, '1. Pay water bill', 20, 10, '1'),
    (2, '0. Exit', 90, 10, '0'),
    (3, '1. Confirm', 50, 40, '1'),
    (4, '2. Cancel', 90, 40, '2');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    CREATE INDEX `IX_UssdNodes_MenuId` ON `UssdNodes` (`MenuId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    CREATE INDEX `IX_UssdOptions_NodeId` ON `UssdOptions` (`NodeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250915084403_AdditionOfUssdTables') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250915084403_AdditionOfUssdTables', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250917115938_AdditionOfSmsSentColumn') THEN

    ALTER TABLE `UtilityPayments` ADD `IsSmsSent` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250917115938_AdditionOfSmsSentColumn') THEN

    UPDATE `UssdNodes` SET `Prompt` = CONCAT('Welcome to DangoPay', CHAR(10), '1. Pay water bill', CHAR(10), '0. Exit')
    WHERE `Id` = 10;
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250917115938_AdditionOfSmsSentColumn') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250917115938_AdditionOfSmsSentColumn', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250922093209_AdditionOfRawResponseTo') THEN

    ALTER TABLE `UtilityPayments` ADD `RawResponse` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250922093209_AdditionOfRawResponseTo') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250922093209_AdditionOfRawResponseTo', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250922094825_NullableResponse') THEN

    ALTER TABLE `UtilityPayments` MODIFY COLUMN `RawResponse` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250922094825_NullableResponse') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250922094825_NullableResponse', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250922100947_RemoveResponseField') THEN

    ALTER TABLE `UtilityPayments` DROP COLUMN `RawResponse`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250922100947_RemoveResponseField') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250922100947_RemoveResponseField', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250930101546_AdditionOfReasonAtTelecom') THEN

    ALTER TABLE `WalletTransactions` ADD `ReasonAtTelecom` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20250930101546_AdditionOfReasonAtTelecom') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20250930101546_AdditionOfReasonAtTelecom', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251005083512_AdditionOfServiceLog') THEN

    CREATE TABLE `ServiceLogs` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ServiceName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `LogDate` datetime(6) NOT NULL,
        `LogLevel` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Message` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Exception` longtext CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `PK_ServiceLogs` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251005083512_AdditionOfServiceLog') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20251005083512_AdditionOfServiceLog', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE TABLE `Accounts` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Code` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
        `Name` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
        `Type` int NOT NULL,
        `IsActive` tinyint(1) NOT NULL,
        CONSTRAINT `PK_Accounts` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE TABLE `JournalEntries` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `EntryDate` datetime(6) NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CorrelationId` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
        `SourceType` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
        `SourceId` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `PK_JournalEntries` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE TABLE `JournalLines` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `JournalEntryId` int NOT NULL,
        `AccountId` int NOT NULL,
        `Debit` decimal(18,2) NOT NULL,
        `Credit` decimal(18,2) NOT NULL,
        `WalletId` int NULL,
        `LandlordId` int NULL,
        `TenantId` int NULL,
        `Memo` longtext CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `PK_JournalLines` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_JournalLines_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_JournalLines_JournalEntries_JournalEntryId` FOREIGN KEY (`JournalEntryId`) REFERENCES `JournalEntries` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE UNIQUE INDEX `IX_Accounts_Code` ON `Accounts` (`Code`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE UNIQUE INDEX `IX_JournalEntries_CorrelationId` ON `JournalEntries` (`CorrelationId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE INDEX `IX_JournalLines_AccountId` ON `JournalLines` (`AccountId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    CREATE INDEX `IX_JournalLines_JournalEntryId` ON `JournalLines` (`JournalEntryId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    INSERT INTO `Accounts` (`Code`, `Name`, `Type`, `IsActive`)
    VALUES ('1000', 'Cash – PSP Settlement Account', 1, TRUE),
    ('2000', 'Wallets Payable – Landlords', 2, TRUE),
    ('2100', 'Withdrawals Payable – Clearing', 2, TRUE),
    ('4100', 'Commission Income', 4, TRUE),
    ('4200', 'SMS Fee Income', 4, TRUE),
    ('4300', 'Withdrawal Fee Income', 4, TRUE),
    ('5100', 'Payment Processing Fees – PSP', 5, TRUE);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251022081312_AccountingModule') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20251022081312_AccountingModule', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251111111139_mpesacallback') THEN

    CREATE TABLE `MpesaCallbackAudits` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ReceivedAt` datetime(6) NOT NULL,
        `Payload` longtext CHARACTER SET utf8mb4 NULL,
        `Headers` longtext CHARACTER SET utf8mb4 NULL,
        `TransId` varchar(255) CHARACTER SET utf8mb4 NULL,
        `Amount` longtext CHARACTER SET utf8mb4 NULL,
        `BillRefNumber` longtext CHARACTER SET utf8mb4 NULL,
        `Processed` tinyint(1) NOT NULL,
        CONSTRAINT `PK_MpesaCallbackAudits` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251111111139_mpesacallback') THEN

    CREATE INDEX `IX_MpesaCallbackAudits_TransId` ON `MpesaCallbackAudits` (`TransId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20251111111139_mpesacallback') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20251111111139_mpesacallback', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412202635_AddCollectoWalletWithdrawalHistory') THEN

    CREATE TABLE `CollectoWalletWithdrawalHistories` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Reference` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `Amount` decimal(65,30) NOT NULL,
        `WithdrawTo` longtext CHARACTER SET utf8mb4 NOT NULL,
        `RequestedByEmail` longtext CHARACTER SET utf8mb4 NOT NULL,
        `RequestedByRole` longtext CHARACTER SET utf8mb4 NOT NULL,
        `EndpointRequestUrl` longtext CHARACTER SET utf8mb4 NOT NULL,
        `EndpointRequestPayload` longtext CHARACTER SET utf8mb4 NOT NULL,
        `EndpointResponsePayload` longtext CHARACTER SET utf8mb4 NOT NULL,
        `EndpointStatus` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CollectoRequestUrl` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CollectoRequestPayload` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CollectoResponsePayload` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CollectoHttpStatusCode` int NOT NULL,
        `CollectoStatus` longtext CHARACTER SET utf8mb4 NOT NULL,
        `IsSuccess` tinyint(1) NOT NULL,
        `ErrorMessage` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_CollectoWalletWithdrawalHistories` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412202635_AddCollectoWalletWithdrawalHistory') THEN

    CREATE INDEX `IX_CollectoWalletWithdrawalHistories_CreatedAt` ON `CollectoWalletWithdrawalHistories` (`CreatedAt`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412202635_AddCollectoWalletWithdrawalHistory') THEN

    CREATE INDEX `IX_CollectoWalletWithdrawalHistories_Reference` ON `CollectoWalletWithdrawalHistories` (`Reference`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412202635_AddCollectoWalletWithdrawalHistory') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260412202635_AddCollectoWalletWithdrawalHistory', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    ALTER TABLE `ServiceLogs` ADD `EventHash` varchar(255) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    ALTER TABLE `ServiceLogs` ADD `RawContent` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    ALTER TABLE `ServiceLogs` ADD `SourceIdentifier` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    ALTER TABLE `ServiceLogs` ADD `SourceType` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    CREATE UNIQUE INDEX `IX_ServiceLogs_EventHash` ON `ServiceLogs` (`EventHash`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    CREATE INDEX `IX_ServiceLogs_LogDate` ON `ServiceLogs` (`LogDate`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260412205114_AddDbBackedSerilogServiceLogs') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260412205114_AddDbBackedSerilogServiceLogs', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260502114623_AddAuditTrail') THEN

    CREATE TABLE `AuditTrailEntries` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `CreatedAt` datetime(6) NOT NULL,
        `UserId` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `UserName` longtext CHARACTER SET utf8mb4 NULL,
        `UserRole` longtext CHARACTER SET utf8mb4 NULL,
        `HttpMethod` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Route` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Action` longtext CHARACTER SET utf8mb4 NOT NULL,
        `RequestData` longtext CHARACTER SET utf8mb4 NULL,
        `ResultStatus` longtext CHARACTER SET utf8mb4 NULL,
        `SourceIp` longtext CHARACTER SET utf8mb4 NULL,
        `Description` longtext CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `PK_AuditTrailEntries` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260502114623_AddAuditTrail') THEN

    CREATE INDEX `IX_AuditTrailEntries_CreatedAt` ON `AuditTrailEntries` (`CreatedAt`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260502114623_AddAuditTrail') THEN

    CREATE INDEX `IX_AuditTrailEntries_UserId` ON `AuditTrailEntries` (`UserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260502114623_AddAuditTrail') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260502114623_AddAuditTrail', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521124330_AddRentalContracts') THEN

    CREATE TABLE `rentalcontracts` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ContractNumber` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TenantName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TenantEmail` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TenantPhone` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PropertyName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `UnitName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `StartDate` datetime(6) NOT NULL,
        `EndDate` datetime(6) NOT NULL,
        `RentAmount` double NOT NULL,
        `Currency` longtext CHARACTER SET utf8mb4 NOT NULL,
        `SecurityDeposit` double NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Terms` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `UpdatedAt` datetime(6) NOT NULL,
        `OwnerId` int NOT NULL,
        `PropertyId` int NULL,
        `UnitId` int NULL,
        `TenantId` int NULL,
        CONSTRAINT `PK_rentalcontracts` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_rentalcontracts_Users_OwnerId` FOREIGN KEY (`OwnerId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521124330_AddRentalContracts') THEN

    CREATE INDEX `IX_rentalcontracts_OwnerId` ON `rentalcontracts` (`OwnerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521124330_AddRentalContracts') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260521124330_AddRentalContracts', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521161929_AddVendorReferenceToWalletTransaction') THEN

    ALTER TABLE `WalletTransactions` ADD `vendorReference` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521161929_AddVendorReferenceToWalletTransaction') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260521161929_AddVendorReferenceToWalletTransaction', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521181252_AddTenantDetails') THEN

    ALTER TABLE `Tenants` ADD `NextOfKinName` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521181252_AddTenantDetails') THEN

    ALTER TABLE `Tenants` ADD `NextOfKinPhone` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521181252_AddTenantDetails') THEN

    ALTER TABLE `Tenants` ADD `Occupation` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521181252_AddTenantDetails') THEN

    ALTER TABLE `Tenants` ADD `WaterMeterNo` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521181252_AddTenantDetails') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260521181252_AddTenantDetails', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521204858_AddSmsLog') THEN

    CREATE TABLE `SmsLogs` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Phone` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Message` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Reference` longtext CHARACTER SET utf8mb4 NOT NULL,
        `SentByEmail` longtext CHARACTER SET utf8mb4 NOT NULL,
        `SentByRole` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Success` tinyint(1) NOT NULL,
        `SentAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_SmsLogs` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521204858_AddSmsLog') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260521204858_AddSmsLog', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521215551_AddViewingRequests') THEN

    CREATE TABLE `ViewingRequests` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `PropertyId` int NOT NULL,
        `TenantId` int NOT NULL,
        `TenantName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TenantEmail` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TenantPhone` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PreferredDate` datetime(6) NOT NULL,
        `Message` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_ViewingRequests` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ViewingRequests_LandLordProperties_PropertyId` FOREIGN KEY (`PropertyId`) REFERENCES `LandLordProperties` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521215551_AddViewingRequests') THEN

    CREATE INDEX `IX_ViewingRequests_PropertyId` ON `ViewingRequests` (`PropertyId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260521215551_AddViewingRequests') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260521215551_AddViewingRequests', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN


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


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN


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


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN


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


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN


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


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN


    SET @pk := (
        SELECT tc.CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS tc
        WHERE tc.CONSTRAINT_SCHEMA = DATABASE()
          AND tc.TABLE_NAME = 'RentalContracts'
          AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        LIMIT 1
    );
    SET @stmt := IF(@pk IS NULL,
        'SELECT 1',
        'ALTER TABLE `RentalContracts` DROP PRIMARY KEY'
    );
    PREPARE s FROM @stmt;
    EXECUTE s;
    DEALLOCATE PREPARE s;


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    ALTER TABLE `RentalContracts` RENAME `rentalcontracts`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    ALTER TABLE `rentalcontracts` ADD CONSTRAINT `PK_rentalcontracts` PRIMARY KEY (`Id`);
    CALL POMELO_AFTER_ADD_PRIMARY_KEY(NULL, 'rentalcontracts', 'Id');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    ALTER TABLE `rentalcontracts` ADD CONSTRAINT `FK_rentalcontracts_LandLordProperties_PropertyId` FOREIGN KEY (`PropertyId`) REFERENCES `LandLordProperties` (`Id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    ALTER TABLE `rentalcontracts` ADD CONSTRAINT `FK_rentalcontracts_PropertyUnits_UnitId` FOREIGN KEY (`UnitId`) REFERENCES `PropertyUnits` (`Id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    ALTER TABLE `rentalcontracts` ADD CONSTRAINT `FK_rentalcontracts_Tenants_TenantId` FOREIGN KEY (`TenantId`) REFERENCES `Tenants` (`Id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    ALTER TABLE `rentalcontracts` ADD CONSTRAINT `FK_rentalcontracts_Users_OwnerId` FOREIGN KEY (`OwnerId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260524233235_AllPendingMigrations') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260524233235_AllPendingMigrations', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

DROP PROCEDURE `POMELO_BEFORE_DROP_PRIMARY_KEY`;

DROP PROCEDURE `POMELO_AFTER_ADD_PRIMARY_KEY`;

