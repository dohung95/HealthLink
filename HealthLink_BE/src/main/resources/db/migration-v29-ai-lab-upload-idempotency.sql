SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.LabReportUploadIdempotencies', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LabReportUploadIdempotencies (
        UploadId UNIQUEIDENTIFIER NOT NULL,
        AppointmentID INT NOT NULL,
        DoctorID VARCHAR(450) NOT NULL,
        IdempotencyKey NVARCHAR(200) NOT NULL,
        ReportID UNIQUEIDENTIFIER NOT NULL,
        JobID UNIQUEIDENTIFIER NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabReportUploadIdempotencies_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LabReportUploadIdempotencies PRIMARY KEY (UploadId),
        CONSTRAINT UQ_LabReportUploadIdempotencies_Scope_Key UNIQUE (AppointmentID, DoctorID, IdempotencyKey),
        CONSTRAINT FK_LabReportUploadIdempotencies_Appointment FOREIGN KEY (AppointmentID) REFERENCES dbo.Appointments(AppointmentID),
        CONSTRAINT FK_LabReportUploadIdempotencies_Doctor FOREIGN KEY (DoctorID) REFERENCES dbo.Doctors(DoctorID),
        CONSTRAINT FK_LabReportUploadIdempotencies_Report FOREIGN KEY (ReportID) REFERENCES dbo.LabReports(ReportID),
        CONSTRAINT FK_LabReportUploadIdempotencies_Job FOREIGN KEY (JobID) REFERENCES dbo.AiJobs(JobID)
    );
END;

COMMIT TRANSACTION;
