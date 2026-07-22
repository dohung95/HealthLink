SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.ClinicalRuleEvaluations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicalRuleEvaluations (
        EvaluationID UNIQUEIDENTIFIER NOT NULL,
        SnapshotID UNIQUEIDENTIFIER NOT NULL,
        RuleSetVersion VARCHAR(100) NOT NULL,
        FindingsJson NVARCHAR(MAX) NOT NULL,
        InputHash CHAR(64) NOT NULL,
        EvaluatedAt DATETIME2 NOT NULL CONSTRAINT DF_ClinicalRuleEvaluations_EvaluatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ClinicalRuleEvaluations PRIMARY KEY (EvaluationID),
        CONSTRAINT FK_ClinicalRuleEvaluations_Snapshot FOREIGN KEY (SnapshotID)
            REFERENCES dbo.ClinicalContextSnapshots(SnapshotID)
    );
    CREATE INDEX IX_ClinicalRuleEvaluations_Snapshot_EvaluatedAt
        ON dbo.ClinicalRuleEvaluations (SnapshotID, EvaluatedAt DESC);
END;

COMMIT TRANSACTION;
