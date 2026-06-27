-- ============================================================================
-- Migration v7: Home Visit v3.0 — Doctor-Specific Location + Slot-Based Booking
-- ============================================================================
-- Chạy idempotent: an toàn khi chạy lại nhiều lần.
-- ============================================================================

-- 1. Doctor columns (idempotent — entity đã có field, đảm bảo DB column tồn tại)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctors') AND name = 'availableForHomeVisit')
BEGIN
    ALTER TABLE Doctors ADD availableForHomeVisit BIT NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctors') AND name = 'homeVisitRadiusKm')
BEGIN
    ALTER TABLE Doctors ADD homeVisitRadiusKm DECIMAL(6,1) NOT NULL DEFAULT 10.0;
END;

-- 2. HomeVisitDrafts table (idempotent)
IF OBJECT_ID('HomeVisitDrafts', 'U') IS NULL
BEGIN
    CREATE TABLE HomeVisitDrafts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PatientId NVARCHAR(450) NOT NULL,
        DoctorId NVARCHAR(450) NOT NULL,
        AppointmentId INT NULL,
        VisitAddress NVARCHAR(500) NOT NULL,
        VisitLatitude DECIMAL(10,7),
        VisitLongitude DECIMAL(10,7),
        ContactPhone NVARCHAR(20) NOT NULL,
        ReasonForHomeVisit NVARCHAR(500),
        SpecialNotes NVARCHAR(500),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ExpiresAt DATETIME2 NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HomeVisitDrafts_ExpiresAt' AND object_id = OBJECT_ID('HomeVisitDrafts'))
BEGIN
    CREATE INDEX IX_HomeVisitDrafts_ExpiresAt ON HomeVisitDrafts(ExpiresAt);
END;

-- 3. CommissionConfigs — row cho HomeVisit (bảng đã có sẵn nhờ JPA ddl-auto=update)
IF NOT EXISTS (SELECT 1 FROM CommissionConfigs WHERE serviceType = 'CONSULTATION_HOME_VISIT')
BEGIN
    INSERT INTO CommissionConfigs (serviceType, commissionRate, description, effectiveFrom, active)
    VALUES ('CONSULTATION_HOME_VISIT', 0.1000, 'Home Visit consultation', GETUTCDATE(), 1);
END;

-- 4. Backfill null homeVisitRadiusKm cho doctors cũ (idempotent)
UPDATE Doctors SET homeVisitRadiusKm = 10.0 WHERE homeVisitRadiusKm IS NULL;

-- 5. Migration dữ liệu Offline → HomeVisit (trong 1 transaction)
BEGIN TRANSACTION;
    UPDATE Appointments SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';
    UPDATE DoctorSchedules SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';
    UPDATE Consultations SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';
COMMIT;
