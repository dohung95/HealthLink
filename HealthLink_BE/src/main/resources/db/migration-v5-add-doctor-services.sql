-- Migration v5: Normalize doctor services into dedicated table
--
-- Replaces 4 boolean columns (availableForVideo/Audio/Chat/Offline)
-- + unused DoctorConsultationTypes table with normalized
-- DoctorServices table.
--
-- Run BEFORE starting the app with new code.
-- ============================================================

-- 1. Create DoctorServices table
CREATE TABLE DoctorServices (
    doctor_id    VARCHAR(450) NOT NULL,
    service_type VARCHAR(20)  NOT NULL,
    available    BIT          NOT NULL DEFAULT 1,
    PRIMARY KEY (doctor_id, service_type),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(DoctorID) ON DELETE CASCADE
);

-- 2. Insert ONLINE for all existing doctors
INSERT INTO DoctorServices (doctor_id, service_type, available)
SELECT DoctorID, 'ONLINE', 1 FROM Doctors;

-- 3. Insert HOME_VISIT for all existing doctors
INSERT INTO DoctorServices (doctor_id, service_type, available)
SELECT DoctorID, 'HOME_VISIT', 1 FROM Doctors;

-- 4. Drop old columns from Doctors table
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('Doctors')
           AND name = 'availableForVideo')
BEGIN
    ALTER TABLE Doctors DROP COLUMN availableForVideo;
    PRINT 'OK: Dropped Doctors.availableForVideo';
END

IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('Doctors')
           AND name = 'availableForAudio')
BEGIN
    ALTER TABLE Doctors DROP COLUMN availableForAudio;
    PRINT 'OK: Dropped Doctors.availableForAudio';
END

IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('Doctors')
           AND name = 'availableForChat')
BEGIN
    ALTER TABLE Doctors DROP COLUMN availableForChat;
    PRINT 'OK: Dropped Doctors.availableForChat';
END

IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('Doctors')
           AND name = 'availableForOffline')
BEGIN
    ALTER TABLE Doctors DROP COLUMN availableForOffline;
    PRINT 'OK: Dropped Doctors.availableForOffline';
END

-- 5. Drop unused element collection table
IF EXISTS (SELECT 1 FROM sys.objects
           WHERE object_id = OBJECT_ID('DoctorConsultationTypes')
           AND type = 'U')
BEGIN
    DROP TABLE DoctorConsultationTypes;
    PRINT 'OK: Dropped DoctorConsultationTypes table';
END
GO
