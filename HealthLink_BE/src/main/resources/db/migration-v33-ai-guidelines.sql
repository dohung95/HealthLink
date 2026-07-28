SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.GuidelineDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GuidelineDocuments (
        DocumentID VARCHAR(160) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        Issuer NVARCHAR(200) NOT NULL,
        Version VARCHAR(100) NOT NULL,
        EffectiveDate DATE NOT NULL,
        Checksum CHAR(64) NOT NULL,
        License VARCHAR(100) NOT NULL,
        CorpusVersion VARCHAR(100) NOT NULL,
        Status VARCHAR(40) NOT NULL,
        RegisteredAt DATETIME2 NOT NULL CONSTRAINT DF_GuidelineDocuments_RegisteredAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_GuidelineDocuments PRIMARY KEY (DocumentID),
        CONSTRAINT UQ_GuidelineDocuments_Identity UNIQUE (Checksum, CorpusVersion),
        CONSTRAINT CK_GuidelineDocuments_Status CHECK (Status IN ('ACTIVE_STUDENT_DEMO', 'RETIRED_STUDENT_DEMO'))
    );
    CREATE INDEX IX_GuidelineDocuments_Citation
        ON dbo.GuidelineDocuments (DocumentID, Version, Checksum, CorpusVersion, Status);
END;

IF OBJECT_ID('dbo.GuidelineChunks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GuidelineChunks (
        ChunkID UNIQUEIDENTIFIER NOT NULL,
        DocumentID VARCHAR(160) NOT NULL,
        SectionPath NVARCHAR(1000) NOT NULL,
        Page INT NOT NULL,
        TextHash CHAR(64) NOT NULL,
        Checksum CHAR(64) NOT NULL,
        CorpusVersion VARCHAR(100) NOT NULL,
        IndexedAt DATETIME2 NOT NULL CONSTRAINT DF_GuidelineChunks_IndexedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_GuidelineChunks PRIMARY KEY (ChunkID),
        CONSTRAINT FK_GuidelineChunks_Document FOREIGN KEY (DocumentID)
            REFERENCES dbo.GuidelineDocuments(DocumentID),
        CONSTRAINT UQ_GuidelineChunks_Identity UNIQUE (DocumentID, SectionPath, Page, TextHash, CorpusVersion),
        CONSTRAINT CK_GuidelineChunks_Page CHECK (Page > 0)
    );
    CREATE INDEX IX_GuidelineChunks_Document ON dbo.GuidelineChunks (DocumentID, CorpusVersion);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.GuidelineDocuments WHERE DocumentID = 'kdigo-ckd-guideline-2024')
    INSERT INTO dbo.GuidelineDocuments (DocumentID, Title, Issuer, Version, EffectiveDate, Checksum, License, CorpusVersion, Status)
    VALUES ('kdigo-ckd-guideline-2024', 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease',
            'Kidney Disease: Improving Global Outcomes (KDIGO)', '2024', '2024-03-13',
            'b18db280f7dc889a1a99447b779c0312cd536f939a5180b38894a5d68e4410c0', 'CC BY-NC-ND 4.0', 'student-demo-2026.1', 'ACTIVE_STUDENT_DEMO');

IF NOT EXISTS (SELECT 1 FROM dbo.GuidelineDocuments WHERE DocumentID = 'who-haemoglobin-cutoffs-2024')
    INSERT INTO dbo.GuidelineDocuments (DocumentID, Title, Issuer, Version, EffectiveDate, Checksum, License, CorpusVersion, Status)
    VALUES ('who-haemoglobin-cutoffs-2024', 'Guideline on haemoglobin cutoffs to define anaemia in individuals and populations',
            'World Health Organization', '2024', '2024-03-05',
            '315a402cb68eaa892b81ae02d41997c3bd4b3bb5d767a320fac544a30dbbab23', 'CC BY-NC-SA 3.0 IGO', 'student-demo-2026.1', 'ACTIVE_STUDENT_DEMO');

IF NOT EXISTS (SELECT 1 FROM dbo.GuidelineDocuments WHERE DocumentID = 'who-hearts-cvd-management-2018')
    INSERT INTO dbo.GuidelineDocuments (DocumentID, Title, Issuer, Version, EffectiveDate, Checksum, License, CorpusVersion, Status)
    VALUES ('who-hearts-cvd-management-2018', 'HEARTS: Technical package for cardiovascular disease management in primary health care: Healthy-lifestyle counselling',
            'World Health Organization', '2018', '2018-05-02',
            'bf0a3285b664683830e0645357d08614b75e3ead120706c47ca7c7f2a88f9dc5', 'CC BY-NC-SA 3.0 IGO', 'student-demo-2026.1', 'ACTIVE_STUDENT_DEMO');

IF NOT EXISTS (SELECT 1 FROM dbo.GuidelineDocuments WHERE DocumentID = 'who-hearts-d-type-2-diabetes-2020')
    INSERT INTO dbo.GuidelineDocuments (DocumentID, Title, Issuer, Version, EffectiveDate, Checksum, License, CorpusVersion, Status)
    VALUES ('who-hearts-d-type-2-diabetes-2020', 'Diagnosis and management of type 2 diabetes (HEARTS-D)',
            'World Health Organization', '2020', '2020-04-22',
            '71b216b19a227e73e0e624274974571a3530e30a0db37a3d10b6d179eefac008', 'CC BY-NC-SA 3.0 IGO', 'student-demo-2026.1', 'ACTIVE_STUDENT_DEMO');

IF NOT EXISTS (SELECT 1 FROM dbo.GuidelineDocuments WHERE DocumentID = 'who-hepatitis-b-guideline-2024')
    INSERT INTO dbo.GuidelineDocuments (DocumentID, Title, Issuer, Version, EffectiveDate, Checksum, License, CorpusVersion, Status)
    VALUES ('who-hepatitis-b-guideline-2024', 'Guidelines for the prevention, diagnosis, care and treatment for people with chronic hepatitis B infection',
            'World Health Organization', '2024', '2024-03-29',
            'e44231194db4a3c7378b9949752c2b1cf1fdb7629793a543a92792cdda0e785c', 'CC BY-NC-SA 3.0 IGO', 'student-demo-2026.1', 'ACTIVE_STUDENT_DEMO');

COMMIT TRANSACTION;
