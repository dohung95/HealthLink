IF COL_LENGTH('MedicalDocuments', 'structuredResultsJson') IS NULL
BEGIN
    ALTER TABLE MedicalDocuments ADD structuredResultsJson NVARCHAR(MAX) NULL;
    PRINT 'OK: Added MedicalDocuments.structuredResultsJson';
END;

IF COL_LENGTH('MedicalDocuments', 'doctorAssessment') IS NULL
BEGIN
    ALTER TABLE MedicalDocuments ADD doctorAssessment NVARCHAR(MAX) NULL;
    PRINT 'OK: Added MedicalDocuments.doctorAssessment';
END;

IF COL_LENGTH('MedicalDocuments', 'patientSummary') IS NULL
BEGIN
    ALTER TABLE MedicalDocuments ADD patientSummary NVARCHAR(MAX) NULL;
    PRINT 'OK: Added MedicalDocuments.patientSummary';
END;

IF COL_LENGTH('MedicalDocuments', 'aiConfidence') IS NULL
BEGIN
    ALTER TABLE MedicalDocuments ADD aiConfidence FLOAT NULL;
    PRINT 'OK: Added MedicalDocuments.aiConfidence';
END;

IF COL_LENGTH('MedicalDocuments', 'aiWarningsJson') IS NULL
BEGIN
    ALTER TABLE MedicalDocuments ADD aiWarningsJson NVARCHAR(MAX) NULL;
    PRINT 'OK: Added MedicalDocuments.aiWarningsJson';
END;

IF COL_LENGTH('MedicalDocuments', 'aiProcessedAt') IS NULL
BEGIN
    ALTER TABLE MedicalDocuments ADD aiProcessedAt DATETIME2 NULL;
    PRINT 'OK: Added MedicalDocuments.aiProcessedAt';
END;
