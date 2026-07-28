SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.AiJobs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AiJobs (
        JobID UNIQUEIDENTIFIER NOT NULL,
        JobType VARCHAR(64) NOT NULL,
        ResourceType VARCHAR(64) NOT NULL,
        ResourceID VARCHAR(100) NOT NULL,
        Status VARCHAR(32) NOT NULL CONSTRAINT CK_AiJobs_Status CHECK (Status IN (
            'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'CANCELLED')),
        AttemptCount INT NOT NULL CONSTRAINT DF_AiJobs_AttemptCount DEFAULT 0,
        MaxAttempts INT NOT NULL CONSTRAINT DF_AiJobs_MaxAttempts DEFAULT 3,
        CorrelationID UNIQUEIDENTIFIER NOT NULL,
        LastErrorCode VARCHAR(80) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AiJobs_CreatedAt DEFAULT SYSUTCDATETIME(),
        StartedAt DATETIME2 NULL,
        FinishedAt DATETIME2 NULL,
        NextAttemptAt DATETIME2 NULL,
        RowVersion BIGINT NOT NULL CONSTRAINT DF_AiJobs_RowVersion DEFAULT 0,
        CONSTRAINT PK_AiJobs PRIMARY KEY (JobID)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.AiJobs') AND name = 'IX_AiJobs_Status_CreatedAt'
)
    CREATE INDEX IX_AiJobs_Status_CreatedAt ON dbo.AiJobs (Status, CreatedAt);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.AiJobs') AND name = 'UX_AiJobs_Idempotency'
)
    CREATE UNIQUE INDEX UX_AiJobs_Idempotency
        ON dbo.AiJobs (JobType, ResourceType, ResourceID, CorrelationID);

COMMIT TRANSACTION;
