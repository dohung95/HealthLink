SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.settlements', 'client_request_id') IS NULL
    ALTER TABLE dbo.settlements ADD client_request_id VARCHAR(100) NULL;

DECLARE @clientRequestConstraint sysname;

SELECT @clientRequestConstraint = keyConstraint.name
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
WHERE keyConstraint.parent_object_id = OBJECT_ID('dbo.settlements')
  AND keyConstraint.type = 'UQ'
GROUP BY keyConstraint.name
HAVING COUNT(*) = 1 AND MAX(CASE WHEN [column].name = 'client_request_id' THEN 1 ELSE 0 END) = 1;

IF @clientRequestConstraint IS NOT NULL
    EXEC('ALTER TABLE dbo.settlements DROP CONSTRAINT ' + QUOTENAME(@clientRequestConstraint));

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.settlements')
      AND name = 'UX_Settlements_ClientRequestId'
)
    DROP INDEX UX_Settlements_ClientRequestId ON dbo.settlements;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.settlements')
      AND name = 'UX_Settlements_PartnerClientRequestId'
)
    CREATE UNIQUE INDEX UX_Settlements_PartnerClientRequestId
        ON dbo.settlements (recipient_type, recipient_id, client_request_id)
        WHERE client_request_id IS NOT NULL;

COMMIT TRANSACTION;
