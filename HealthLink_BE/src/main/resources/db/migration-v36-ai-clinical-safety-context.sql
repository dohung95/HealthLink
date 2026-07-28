SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.EncounterClinicalContexts', 'FastingStatus') IS NULL
    ALTER TABLE dbo.EncounterClinicalContexts ADD FastingStatus VARCHAR(32) NULL;

IF COL_LENGTH('dbo.EncounterClinicalContexts', 'PregnancyStatus') IS NULL
    ALTER TABLE dbo.EncounterClinicalContexts ADD PregnancyStatus VARCHAR(32) NULL;

COMMIT TRANSACTION;
