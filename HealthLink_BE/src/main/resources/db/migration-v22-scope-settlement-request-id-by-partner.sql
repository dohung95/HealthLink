SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.Settlements', 'client_request_id') IS NULL
    ALTER TABLE dbo.Settlements ADD client_request_id VARCHAR(100) NULL;

DECLARE @dropSql NVARCHAR(MAX);

SELECT @dropSql = N'ALTER TABLE dbo.Settlements DROP CONSTRAINT ' + QUOTENAME(keyConstraint.name)
FROM sys.key_constraints keyConstraint
JOIN sys.indexes [index]
    ON [index].object_id = keyConstraint.parent_object_id
    AND [index].index_id = keyConstraint.unique_index_id
JOIN sys.index_columns indexColumn
    ON indexColumn.object_id = [index].object_id
    AND indexColumn.index_id = [index].index_id
JOIN sys.columns [column]
    ON [column].object_id = indexColumn.object_id
    AND [column].column_id = indexColumn.column_id
WHERE keyConstraint.parent_object_id = OBJECT_ID('dbo.Settlements')
  AND keyConstraint.type = 'UQ'
  AND [column].name = 'client_request_id';

IF @dropSql IS NOT NULL
    EXEC sp_executesql @dropSql;

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Settlements')
      AND name = 'UX_Settlements_ClientRequestId'
)
    DROP INDEX UX_Settlements_ClientRequestId ON dbo.Settlements;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.Settlements')
      AND name = 'UX_Settlements_PartnerClientRequestId'
)
    CREATE UNIQUE INDEX UX_Settlements_PartnerClientRequestId
        ON dbo.Settlements (recipientType, recipientId, client_request_id)
        WHERE client_request_id IS NOT NULL;

COMMIT TRANSACTION;
