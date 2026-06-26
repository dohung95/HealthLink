-- ============================================================
-- Migration v6: Add HomeVisit proposal lifecycle fields to Consultations
--
-- Run this BEFORE starting the app with the new code.
-- JPA ddl-auto=update can create the columns, but this script backfills
-- existing rows and keeps the naming/defaults explicit.
-- ============================================================

IF COL_LENGTH('Consultations', 'HomeVisitProposalStatus') IS NULL
BEGIN
    ALTER TABLE Consultations
    ADD HomeVisitProposalStatus NVARCHAR(20) NULL;
    PRINT 'OK: Added Consultations.HomeVisitProposalStatus';
END

IF COL_LENGTH('Consultations', 'HomeVisitProposedAt') IS NULL
BEGIN
    ALTER TABLE Consultations
    ADD HomeVisitProposedAt DATETIME2 NULL;
    PRINT 'OK: Added Consultations.HomeVisitProposedAt';
END

IF COL_LENGTH('Consultations', 'HomeVisitRespondedAt') IS NULL
BEGIN
    ALTER TABLE Consultations
    ADD HomeVisitRespondedAt DATETIME2 NULL;
    PRINT 'OK: Added Consultations.HomeVisitRespondedAt';
END

UPDATE Consultations
   SET HomeVisitProposalStatus = 'NONE'
 WHERE HomeVisitProposalStatus IS NULL;
