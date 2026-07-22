SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.GuidelineDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GuidelineDocuments (
        DocumentID UNIQUEIDENTIFIER NOT NULL,
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
        DocumentID UNIQUEIDENTIFIER NOT NULL,
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

COMMIT TRANSACTION;
