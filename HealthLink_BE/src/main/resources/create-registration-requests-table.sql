-- Create RegistrationRequests table for Doctor and Pharmacy registration
-- Run this script on HealthLink_DB database

CREATE TABLE RegistrationRequests (
    RequestID BIGINT IDENTITY(1,1) PRIMARY KEY,
    RegistrationType NVARCHAR(20) NOT NULL,  -- 'DOCTOR' or 'PHARMACY'
    Email NVARCHAR(256) NOT NULL,
    PhoneNumber NVARCHAR(20),
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',  -- 'Pending', 'Approved', 'Rejected'
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    ReviewedAt DATETIME2,
    ReviewedBy NVARCHAR(450),
    RejectionReason NVARCHAR(1000),

    -- Doctor Fields
    FullName NVARCHAR(200),
    Qualifications NVARCHAR(500),
    SpecialtyId INT,
    Specialty NVARCHAR(100),
    YearsOfExperience INT,
    LanguageSpoken NVARCHAR(200),
    Location NVARCHAR(500),
    Bio NVARCHAR(2000),
    ConsultationFee DECIMAL(18,2),
    ClinicName NVARCHAR(200),
    ClinicAddress NVARCHAR(500),
    AvailableForVideo BIT DEFAULT 1,
    AvailableForAudio BIT DEFAULT 1,
    AvailableForChat BIT DEFAULT 1,
    AvailableForOffline BIT DEFAULT 1,

    -- Pharmacy Fields
    PharmacyName NVARCHAR(200),
    LicenseNumber NVARCHAR(100),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    District NVARCHAR(100),
    Ward NVARCHAR(100),
    OpenTime TIME,
    CloseTime TIME,
    Open24Hours BIT DEFAULT 0,
    WorkingDays NVARCHAR(50),
    DeliveryAvailable BIT DEFAULT 0,
    DeliveryRadius FLOAT,
    DeliveryFee DECIMAL(18,2),
    Description NVARCHAR(1000)
);

-- Create index for common queries
CREATE INDEX IX_RegistrationRequests_Status ON RegistrationRequests(Status);
CREATE INDEX IX_RegistrationRequests_Type ON RegistrationRequests(RegistrationType);
CREATE INDEX IX_RegistrationRequests_Email ON RegistrationRequests(Email);
CREATE INDEX IX_RegistrationRequests_CreatedAt ON RegistrationRequests(CreatedAt DESC);

PRINT 'RegistrationRequests table created successfully!';
