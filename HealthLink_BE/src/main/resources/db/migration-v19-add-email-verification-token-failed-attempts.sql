SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.EmailVerificationTokens', 'U') IS NULL
    THROW 50004, 'dbo.EmailVerificationTokens was not found.', 1;

DECLARE @sql NVARCHAR(MAX);

IF COL_LENGTH('dbo.EmailVerificationTokens', 'FailedAttempts') IS NULL
BEGIN
    SET @sql = N'ALTER TABLE dbo.EmailVerificationTokens ADD FailedAttempts INT NOT NULL CONSTRAINT DF_EmailVerificationTokens_FailedAttempts DEFAULT 0 WITH VALUES;';
    EXEC sys.sp_executesql @sql;
END
ELSE
BEGIN
    SET @sql = N'UPDATE dbo.EmailVerificationTokens SET FailedAttempts = 0 WHERE FailedAttempts IS NULL;';
    EXEC sys.sp_executesql @sql;

    IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.EmailVerificationTokens')
          AND name = 'FailedAttempts'
          AND is_nullable = 1
    )
    BEGIN
        SET @sql = N'ALTER TABLE dbo.EmailVerificationTokens ALTER COLUMN FailedAttempts INT NOT NULL;';
        EXEC sys.sp_executesql @sql;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.EmailVerificationTokens')
          AND c.name = 'FailedAttempts'
    )
    BEGIN
        SET @sql = N'ALTER TABLE dbo.EmailVerificationTokens ADD CONSTRAINT DF_EmailVerificationTokens_FailedAttempts DEFAULT 0 FOR FailedAttempts;';
        EXEC sys.sp_executesql @sql;
    END;
END;

COMMIT TRANSACTION;
