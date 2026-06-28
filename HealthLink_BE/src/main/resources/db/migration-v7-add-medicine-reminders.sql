-- ============================================================
-- Migration v7: Add patient medicine reminder settings, intake
-- checks, and per-day dispatch logs.
--
-- Run this BEFORE starting the app with the new code.
-- JPA ddl-auto=update can create objects, but this script keeps
-- table names, constraints, and defaults explicit.
-- ============================================================

IF OBJECT_ID('MedicineReminderSettings', 'U') IS NULL
BEGIN
    CREATE TABLE MedicineReminderSettings (
        SettingID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PatientID NVARCHAR(450) NOT NULL,
        MorningTime TIME NOT NULL DEFAULT '08:00',
        AfternoonTime TIME NOT NULL DEFAULT '12:00',
        EveningTime TIME NOT NULL DEFAULT '18:00',
        Enabled BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_MedicineReminderSettings_Patient UNIQUE (PatientID),
        CONSTRAINT FK_MedicineReminderSettings_Patient
            FOREIGN KEY (PatientID) REFERENCES Patients(PatientID)
    );
    PRINT 'OK: Created MedicineReminderSettings';
END

IF OBJECT_ID('MedicineIntakeChecks', 'U') IS NULL
BEGIN
    CREATE TABLE MedicineIntakeChecks (
        CheckID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PatientID NVARCHAR(450) NOT NULL,
        PrescriptionHeaderID INT NOT NULL,
        PrescriptionItemID INT NOT NULL,
        IntakeDate DATE NOT NULL,
        Timing NVARCHAR(20) NOT NULL,
        Checked BIT NOT NULL DEFAULT 0,
        CheckedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_MedicineIntakeChecks_Patient_Item_Date_Timing
            UNIQUE (PatientID, PrescriptionItemID, IntakeDate, Timing),
        CONSTRAINT FK_MedicineIntakeChecks_Patient
            FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
        CONSTRAINT FK_MedicineIntakeChecks_Header
            FOREIGN KEY (PrescriptionHeaderID) REFERENCES PrescriptionHeaders(PrescriptionHeaderID),
        CONSTRAINT FK_MedicineIntakeChecks_Item
            FOREIGN KEY (PrescriptionItemID) REFERENCES PrescriptionItems(PrescriptionItemID)
    );
    PRINT 'OK: Created MedicineIntakeChecks';
END

IF OBJECT_ID('MedicineReminderDispatchLogs', 'U') IS NULL
BEGIN
    CREATE TABLE MedicineReminderDispatchLogs (
        DispatchLogID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PatientID NVARCHAR(450) NOT NULL,
        ReminderDate DATE NOT NULL,
        Timing NVARCHAR(20) NOT NULL,
        ScheduledTime TIME NOT NULL,
        SentAt DATETIME2 NOT NULL,
        CONSTRAINT UQ_MedicineReminderDispatchLogs_Patient_Date_Timing
            UNIQUE (PatientID, ReminderDate, Timing),
        CONSTRAINT FK_MedicineReminderDispatchLogs_Patient
            FOREIGN KEY (PatientID) REFERENCES Patients(PatientID)
    );
    PRINT 'OK: Created MedicineReminderDispatchLogs';
END
