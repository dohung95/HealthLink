SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.LabReports', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LabReports (
        ReportID UNIQUEIDENTIFIER NOT NULL,
        AppointmentID INT NOT NULL,
        HealthRecordID INT NULL,
        MedicalDocumentID INT NULL,
        ObjectKey NVARCHAR(1024) NOT NULL,
        OriginalFileName NVARCHAR(512) NOT NULL,
        MimeType VARCHAR(100) NOT NULL,
        FileSize BIGINT NOT NULL,
        Sha256 CHAR(64) NOT NULL,
        PageCount INT NOT NULL,
        Status VARCHAR(32) NOT NULL CONSTRAINT CK_LabReports_Status CHECK (Status IN (
            'UPLOADED', 'OCR_PENDING', 'OCR_RUNNING', 'NEEDS_VERIFICATION', 'VERIFIED', 'OCR_FAILED', 'CANCELLED')),
        UploadedByDoctorID VARCHAR(450) NOT NULL,
        UploadedAt DATETIME2 NOT NULL CONSTRAINT DF_LabReports_UploadedAt DEFAULT SYSUTCDATETIME(),
        VerifiedByDoctorID VARCHAR(450) NULL,
        VerifiedAt DATETIME2 NULL,
        RowVersion BIGINT NOT NULL CONSTRAINT DF_LabReports_RowVersion DEFAULT 0,
        CONSTRAINT PK_LabReports PRIMARY KEY (ReportID),
        CONSTRAINT FK_LabReports_Appointments FOREIGN KEY (AppointmentID) REFERENCES dbo.Appointments(AppointmentID),
        CONSTRAINT FK_LabReports_HealthRecords FOREIGN KEY (HealthRecordID) REFERENCES dbo.HealthRecords(HealthRecordID),
        CONSTRAINT FK_LabReports_MedicalDocuments FOREIGN KEY (MedicalDocumentID) REFERENCES dbo.MedicalDocuments(DocumentID),
        CONSTRAINT FK_LabReports_UploadedByDoctor FOREIGN KEY (UploadedByDoctorID) REFERENCES dbo.Doctors(DoctorID),
        CONSTRAINT FK_LabReports_VerifiedByDoctor FOREIGN KEY (VerifiedByDoctorID) REFERENCES dbo.Doctors(DoctorID)
    );
END;

IF OBJECT_ID('dbo.LabObservations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LabObservations (
        ObservationID UNIQUEIDENTIFIER NOT NULL,
        ReportID UNIQUEIDENTIFIER NOT NULL,
        RowOrder INT NOT NULL,
        TestNameRaw NVARCHAR(500) NOT NULL,
        TestNameNormalized NVARCHAR(500) NULL,
        LoincCode VARCHAR(32) NULL,
        ValueText NVARCHAR(500) NOT NULL,
        NumericValue DECIMAL(18, 6) NULL,
        Comparator VARCHAR(8) NULL,
        UnitRaw NVARCHAR(100) NULL,
        UnitUcum VARCHAR(100) NULL,
        ReferenceLow DECIMAL(18, 6) NULL,
        ReferenceHigh DECIMAL(18, 6) NULL,
        ReferenceText NVARCHAR(500) NULL,
        AbnormalFlag VARCHAR(32) NULL,
        OcrConfidence DECIMAL(5, 4) NULL,
        VerificationStatus VARCHAR(16) NOT NULL CONSTRAINT CK_LabObservations_VerificationStatus CHECK (VerificationStatus IN (
            'UNVERIFIED', 'VERIFIED', 'REJECTED')),
        DoctorCorrected BIT NOT NULL CONSTRAINT DF_LabObservations_DoctorCorrected DEFAULT 0,
        SourcePage INT NULL,
        SourceBoundingBoxJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabObservations_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabObservations_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LabObservations PRIMARY KEY (ObservationID),
        CONSTRAINT FK_LabObservations_LabReports FOREIGN KEY (ReportID) REFERENCES dbo.LabReports(ReportID),
        CONSTRAINT UQ_LabObservations_Report_RowOrder UNIQUE (ReportID, RowOrder)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.LabReports') AND name = 'IX_LabReports_AppointmentID_UploadedAt'
)
    CREATE INDEX IX_LabReports_AppointmentID_UploadedAt ON dbo.LabReports (AppointmentID, UploadedAt DESC);

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.LabObservations') AND name = 'IX_LabObservations_ReportID_RowOrder'
)
    CREATE INDEX IX_LabObservations_ReportID_RowOrder ON dbo.LabObservations (ReportID, RowOrder);

COMMIT TRANSACTION;
