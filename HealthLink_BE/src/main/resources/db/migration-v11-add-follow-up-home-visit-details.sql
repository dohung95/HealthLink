-- Migration v11: store temporary HomeVisit details for follow-up payment

IF COL_LENGTH('dbo.Consultations', 'FollowUpVisitAddress') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpVisitAddress NVARCHAR(1000) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpVisitCity') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpVisitCity NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpContactPhone') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpContactPhone VARCHAR(50) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpReasonForHomeVisit') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpReasonForHomeVisit NVARCHAR(2000) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpSpecialNotes') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpSpecialNotes NVARCHAR(2000) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpIsForSelf') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpIsForSelf BIT NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpReceiverName') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpReceiverName NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpReceiverAge') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpReceiverAge INT NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpReceiverGender') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpReceiverGender VARCHAR(20) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpReceiverRelationship') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpReceiverRelationship NVARCHAR(100) NULL;

IF COL_LENGTH('dbo.Consultations', 'FollowUpReceiverPhone') IS NULL
    ALTER TABLE dbo.Consultations ADD FollowUpReceiverPhone VARCHAR(50) NULL;
