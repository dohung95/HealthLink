SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.GuidelineChunks')
      AND name = 'UQ_GuidelineChunks_Identity'
)
BEGIN
    ALTER TABLE dbo.GuidelineChunks DROP CONSTRAINT [UQ_GuidelineChunks_Identity];
END;

COMMIT TRANSACTION;
