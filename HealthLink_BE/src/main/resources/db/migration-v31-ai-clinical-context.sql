SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.EncounterClinicalContexts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EncounterClinicalContexts (
        AppointmentID INT NOT NULL,
        DoctorSymptoms NVARCHAR(4000) NULL,
        WorkingDiagnosis NVARCHAR(2000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EncounterClinicalContexts_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_EncounterClinicalContexts_UpdatedAt DEFAULT SYSUTCDATETIME(),
        RowVersion BIGINT NOT NULL CONSTRAINT DF_EncounterClinicalContexts_RowVersion DEFAULT 0,
        CONSTRAINT PK_EncounterClinicalContexts PRIMARY KEY (AppointmentID),
        CONSTRAINT FK_EncounterClinicalContexts_Appointment FOREIGN KEY (AppointmentID)
            REFERENCES dbo.Appointments(AppointmentID)
    );
END;

IF OBJECT_ID('dbo.ClinicalContextSnapshots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicalContextSnapshots (
        SnapshotID UNIQUEIDENTIFIER NOT NULL,
        AppointmentID INT NOT NULL,
        ContextVersion BIGINT NOT NULL,
        CanonicalJson NVARCHAR(MAX) NOT NULL,
        Sha256 CHAR(64) NOT NULL,
        CreatedByDoctorID VARCHAR(450) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ClinicalContextSnapshots_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ClinicalContextSnapshots PRIMARY KEY (SnapshotID),
        CONSTRAINT FK_ClinicalContextSnapshots_Appointment FOREIGN KEY (AppointmentID)
            REFERENCES dbo.Appointments(AppointmentID),
        CONSTRAINT FK_ClinicalContextSnapshots_Doctor FOREIGN KEY (CreatedByDoctorID)
            REFERENCES dbo.Doctors(DoctorID)
    );
    CREATE INDEX IX_ClinicalContextSnapshots_Appointment_CreatedAt
        ON dbo.ClinicalContextSnapshots (AppointmentID, CreatedAt DESC);
END;

COMMIT TRANSACTION;
