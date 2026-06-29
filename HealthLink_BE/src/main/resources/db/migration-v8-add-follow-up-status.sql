-- ============================================================
-- Migration v8: Add follow_up_status to Consultations
--
-- Tracks the payment lifecycle of follow-up appointments.
-- Default is 'NONE'; transitions: NONE → PENDING_PAYMENT → PAID → CONFIRMED.
-- ============================================================

IF COL_LENGTH('Consultations', 'follow_up_status') IS NULL
BEGIN
    ALTER TABLE Consultations
    ADD follow_up_status VARCHAR(20) DEFAULT 'NONE' NOT NULL;
    PRINT 'OK: Added Consultations.follow_up_status';
END
