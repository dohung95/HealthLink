IF OBJECT_ID('PartnerWithdrawalCredentials', 'U') IS NULL
BEGIN
    CREATE TABLE PartnerWithdrawalCredentials (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId NVARCHAR(450) NOT NULL UNIQUE,
        PinHash NVARCHAR(255) NOT NULL,
        FailedAttempts INT NOT NULL CONSTRAINT DF_PartnerWithdrawalCredentials_FailedAttempts DEFAULT 0,
        LockedUntil DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PartnerWithdrawalCredentials_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PartnerWithdrawalCredentials_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_PartnerWithdrawalCredentials_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
END;
