SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.CdsDecisions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CdsDecisions (
        DecisionID UNIQUEIDENTIFIER NOT NULL,
        RunID UNIQUEIDENTIFIER NOT NULL,
        DoctorID VARCHAR(450) NOT NULL,
        DecisionStatus VARCHAR(40) NOT NULL,
        OriginalOutputHash CHAR(64) NOT NULL,
        EditedOutputJson NVARCHAR(MAX) NULL,
        EditedOutputHash CHAR(64) NULL,
        Reason NVARCHAR(2000) NULL,
        DecidedAt DATETIME2 NOT NULL,
        ApplyStatus VARCHAR(32) NOT NULL,
        AppliedAt DATETIME2 NULL,
        TargetMedicalDocumentID INT NULL,
        ApplyIdempotencyKey VARCHAR(128) NULL,
        BeforeHash CHAR(64) NULL,
        AfterHash CHAR(64) NULL,
        Version BIGINT NOT NULL CONSTRAINT DF_CdsDecisions_Version DEFAULT 0,
        CONSTRAINT PK_CdsDecisions PRIMARY KEY (DecisionID),
        CONSTRAINT UQ_CdsDecisions_Run UNIQUE (RunID),
        CONSTRAINT FK_CdsDecisions_Run FOREIGN KEY (RunID)
            REFERENCES dbo.CdsSuggestionRuns(RunID),
        CONSTRAINT FK_CdsDecisions_Doctor FOREIGN KEY (DoctorID)
            REFERENCES dbo.Doctors(DoctorID),
        CONSTRAINT FK_CdsDecisions_TargetDocument FOREIGN KEY (TargetMedicalDocumentID)
            REFERENCES dbo.MedicalDocuments(DocumentID),
        CONSTRAINT CK_CdsDecisions_DecisionStatus CHECK
            (DecisionStatus IN ('PENDING', 'APPROVED_AS_IS', 'APPROVED_WITH_EDITS', 'REJECTED')),
        CONSTRAINT CK_CdsDecisions_ApplyStatus CHECK
            (ApplyStatus IN ('NOT_APPLIED', 'APPLIED', 'APPLY_FAILED'))
    );

    CREATE INDEX IX_CdsDecisions_Doctor_DecidedAt
        ON dbo.CdsDecisions (DoctorID, DecidedAt DESC);
END;

IF OBJECT_ID('dbo.CdsAuditEvents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CdsAuditEvents (
        EventID UNIQUEIDENTIFIER NOT NULL,
        RunID UNIQUEIDENTIFIER NOT NULL,
        DecisionID UNIQUEIDENTIFIER NULL,
        ActorType VARCHAR(32) NOT NULL,
        ActorID VARCHAR(450) NOT NULL,
        EventType VARCHAR(64) NOT NULL,
        EventTimestamp DATETIME2 NOT NULL,
        CorrelationID VARCHAR(64) NOT NULL,
        MetadataJson NVARCHAR(MAX) NOT NULL,
        PreviousHash CHAR(64) NULL,
        EventHash CHAR(64) NOT NULL,
        CONSTRAINT PK_CdsAuditEvents PRIMARY KEY (EventID),
        CONSTRAINT FK_CdsAuditEvents_Run FOREIGN KEY (RunID)
            REFERENCES dbo.CdsSuggestionRuns(RunID),
        CONSTRAINT FK_CdsAuditEvents_Decision FOREIGN KEY (DecisionID)
            REFERENCES dbo.CdsDecisions(DecisionID)
    );

    CREATE INDEX IX_CdsAuditEvents_Run_Timestamp
        ON dbo.CdsAuditEvents (RunID, EventTimestamp, EventID);
END;

COMMIT TRANSACTION;
