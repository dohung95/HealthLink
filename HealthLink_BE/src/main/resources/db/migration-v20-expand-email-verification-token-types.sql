SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('dbo.EmailVerificationTokens', 'U') IS NULL
        THROW 50005, 'dbo.EmailVerificationTokens was not found.', 1;

    IF COL_LENGTH('dbo.EmailVerificationTokens', 'Type') IS NULL
        THROW 50006, 'dbo.EmailVerificationTokens.Type was not found.', 1;

    DECLARE @constraintName SYSNAME;
    DECLARE @sql NVARCHAR(MAX);
    DECLARE type_constraints CURSOR LOCAL FAST_FORWARD FOR
    SELECT cc.name
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID('dbo.EmailVerificationTokens')
      AND (
          cc.parent_column_id = COLUMNPROPERTY(
              OBJECT_ID('dbo.EmailVerificationTokens'),
              'Type',
              'ColumnId'
          )
          OR cc.name = 'CK_EmailVerificationTokens_Type'
          OR cc.name LIKE 'CK__EmailVerif__Type__%'
      );

    OPEN type_constraints;
    FETCH NEXT FROM type_constraints INTO @constraintName;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'ALTER TABLE dbo.EmailVerificationTokens DROP CONSTRAINT '
            + QUOTENAME(@constraintName) + N';';
        EXEC sys.sp_executesql @sql;
        FETCH NEXT FROM type_constraints INTO @constraintName;
    END;
    CLOSE type_constraints;
    DEALLOCATE type_constraints;

    ALTER TABLE dbo.EmailVerificationTokens WITH CHECK
        ADD CONSTRAINT CK_EmailVerificationTokens_Type
        CHECK ([Type] IN (
            'EMAIL_VERIFICATION',
            'PASSWORD_RESET',
            'WITHDRAWAL_PIN',
            'PAYPAL_EMAIL_CONFIRM',
            'PAYPAL_EMAIL_OTP'
        ));

    ALTER TABLE dbo.EmailVerificationTokens
        CHECK CONSTRAINT CK_EmailVerificationTokens_Type;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
