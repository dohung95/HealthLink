SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @userIdType NVARCHAR(256);
DECLARE @userIdCollation NVARCHAR(256);
DECLARE @sql NVARCHAR(MAX);

SELECT
    @userIdType = QUOTENAME(t.name) +
        CASE
            WHEN t.name IN ('varchar', 'char', 'varbinary', 'binary')
                THEN '(' + CASE WHEN c.max_length = -1 THEN 'MAX' ELSE CONVERT(VARCHAR(10), c.max_length) END + ')'
            WHEN t.name IN ('nvarchar', 'nchar')
                THEN '(' + CASE WHEN c.max_length = -1 THEN 'MAX' ELSE CONVERT(VARCHAR(10), c.max_length / 2) END + ')'
            WHEN t.name IN ('decimal', 'numeric')
                THEN '(' + CONVERT(VARCHAR(10), c.precision) + ',' + CONVERT(VARCHAR(10), c.scale) + ')'
            ELSE ''
        END,
    @userIdCollation = c.collation_name
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.Users') AND c.name = 'Id';

IF @userIdType IS NULL
    THROW 50001, 'dbo.Users.Id was not found; PartnerWithdrawalCredentials cannot be created.', 1;

DECLARE @userIdDefinition NVARCHAR(600) = @userIdType +
    CASE WHEN @userIdCollation IS NOT NULL THEN ' COLLATE ' + QUOTENAME(@userIdCollation) ELSE '' END;

IF OBJECT_ID('dbo.PartnerWithdrawalCredentials', 'U') IS NULL
BEGIN
    SET @sql = N'CREATE TABLE dbo.PartnerWithdrawalCredentials (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PartnerWithdrawalCredentials PRIMARY KEY,
        UserId ' + @userIdDefinition + N' NOT NULL,
        PinHash NVARCHAR(255) NOT NULL,
        FailedAttempts INT NOT NULL CONSTRAINT DF_PartnerWithdrawalCredentials_FailedAttempts DEFAULT 0,
        LockedUntil DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PartnerWithdrawalCredentials_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PartnerWithdrawalCredentials_UpdatedAt DEFAULT SYSUTCDATETIME()
    );';
    EXEC sys.sp_executesql @sql;
END;

IF COL_LENGTH('dbo.PartnerWithdrawalCredentials', 'UserId') IS NULL
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.PartnerWithdrawalCredentials)
        THROW 50002, 'Cannot add a required UserId column to a non-empty PartnerWithdrawalCredentials table.', 1;

    SET @sql = N'ALTER TABLE dbo.PartnerWithdrawalCredentials ADD UserId ' + @userIdDefinition + N' NOT NULL;';
    EXEC sys.sp_executesql @sql;
END;

DECLARE @credentialUserIdType NVARCHAR(256);
DECLARE @credentialUserIdCollation NVARCHAR(256);

SELECT
    @credentialUserIdType = QUOTENAME(t.name) +
        CASE
            WHEN t.name IN ('varchar', 'char', 'varbinary', 'binary')
                THEN '(' + CASE WHEN c.max_length = -1 THEN 'MAX' ELSE CONVERT(VARCHAR(10), c.max_length) END + ')'
            WHEN t.name IN ('nvarchar', 'nchar')
                THEN '(' + CASE WHEN c.max_length = -1 THEN 'MAX' ELSE CONVERT(VARCHAR(10), c.max_length / 2) END + ')'
            WHEN t.name IN ('decimal', 'numeric')
                THEN '(' + CONVERT(VARCHAR(10), c.precision) + ',' + CONVERT(VARCHAR(10), c.scale) + ')'
            ELSE ''
        END,
    @credentialUserIdCollation = c.collation_name
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.PartnerWithdrawalCredentials') AND c.name = 'UserId';

IF @credentialUserIdType <> @userIdType
    OR ISNULL(@credentialUserIdCollation, '') <> ISNULL(@userIdCollation, '')
BEGIN
    DECLARE @existingForeignKey SYSNAME;
    SELECT @existingForeignKey = fk.name
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    WHERE fk.parent_object_id = OBJECT_ID('dbo.PartnerWithdrawalCredentials')
      AND fkc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('dbo.PartnerWithdrawalCredentials'), 'UserId', 'ColumnId');

    IF @existingForeignKey IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.PartnerWithdrawalCredentials DROP CONSTRAINT ' + QUOTENAME(@existingForeignKey) + N';';
        EXEC sys.sp_executesql @sql;
    END;

    DECLARE @existingUniqueConstraint SYSNAME;
    SELECT @existingUniqueConstraint = kc.name
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
    WHERE kc.parent_object_id = OBJECT_ID('dbo.PartnerWithdrawalCredentials')
      AND kc.type = 'UQ'
      AND ic.column_id = COLUMNPROPERTY(OBJECT_ID('dbo.PartnerWithdrawalCredentials'), 'UserId', 'ColumnId');

    IF @existingUniqueConstraint IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.PartnerWithdrawalCredentials DROP CONSTRAINT ' + QUOTENAME(@existingUniqueConstraint) + N';';
        EXEC sys.sp_executesql @sql;
    END;

    SET @sql = N'ALTER TABLE dbo.PartnerWithdrawalCredentials ALTER COLUMN UserId ' + @userIdDefinition + N' NOT NULL;';
    EXEC sys.sp_executesql @sql;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
    WHERE kc.parent_object_id = OBJECT_ID('dbo.PartnerWithdrawalCredentials')
      AND kc.type = 'UQ'
      AND ic.column_id = COLUMNPROPERTY(OBJECT_ID('dbo.PartnerWithdrawalCredentials'), 'UserId', 'ColumnId')
)
    ALTER TABLE dbo.PartnerWithdrawalCredentials
        ADD CONSTRAINT UQ_PartnerWithdrawalCredentials_UserId UNIQUE (UserId);

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID('dbo.PartnerWithdrawalCredentials')
      AND name = 'FK_PartnerWithdrawalCredentials_Users'
)
    ALTER TABLE dbo.PartnerWithdrawalCredentials WITH CHECK
        ADD CONSTRAINT FK_PartnerWithdrawalCredentials_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);

COMMIT TRANSACTION;
