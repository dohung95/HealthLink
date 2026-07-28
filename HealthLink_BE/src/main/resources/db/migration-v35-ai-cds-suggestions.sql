SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.CdsSuggestionRuns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CdsSuggestionRuns (
        RunID UNIQUEIDENTIFIER NOT NULL, SnapshotID UNIQUEIDENTIFIER NOT NULL, Status VARCHAR(40) NOT NULL,
        RuleSetVersion VARCHAR(100) NOT NULL, CorpusVersion VARCHAR(100) NOT NULL, PromptVersion VARCHAR(100) NOT NULL,
        ModelName VARCHAR(200) NOT NULL, ModelDigest CHAR(64) NOT NULL, ErrorCode VARCHAR(80) NULL,
        ValidatedOutputJson NVARCHAR(MAX) NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CdsSuggestionRuns_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CdsSuggestionRuns PRIMARY KEY (RunID),
        CONSTRAINT FK_CdsSuggestionRuns_Snapshot FOREIGN KEY (SnapshotID) REFERENCES dbo.ClinicalContextSnapshots(SnapshotID)
    );
    CREATE INDEX IX_CdsSuggestionRuns_Snapshot_CreatedAt ON dbo.CdsSuggestionRuns (SnapshotID, CreatedAt DESC);
END;
COMMIT TRANSACTION;
