SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.LabObservationRevisions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LabObservationRevisions (
        RevisionID UNIQUEIDENTIFIER NOT NULL,
        ReportID UNIQUEIDENTIFIER NOT NULL,
        ObservationID UNIQUEIDENTIFIER NOT NULL,
        DoctorID VARCHAR(450) NOT NULL,
        ChangedFieldsJson NVARCHAR(MAX) NOT NULL,
        BeforeHash CHAR(64) NOT NULL,
        AfterHash CHAR(64) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabObservationRevisions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LabObservationRevisions PRIMARY KEY (RevisionID),
        CONSTRAINT FK_LabObservationRevisions_Report FOREIGN KEY (ReportID) REFERENCES dbo.LabReports(ReportID),
        CONSTRAINT FK_LabObservationRevisions_Observation FOREIGN KEY (ObservationID) REFERENCES dbo.LabObservations(ObservationID),
        CONSTRAINT FK_LabObservationRevisions_Doctor FOREIGN KEY (DoctorID) REFERENCES dbo.Doctors(DoctorID)
    );
    CREATE INDEX IX_LabObservationRevisions_Report_Observation_CreatedAt
        ON dbo.LabObservationRevisions (ReportID, ObservationID, CreatedAt);
END;

COMMIT TRANSACTION;
