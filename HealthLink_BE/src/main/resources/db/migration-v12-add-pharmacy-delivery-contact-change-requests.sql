IF OBJECT_ID('PharmacyDeliveryContactChangeRequests', 'U') IS NULL
BEGIN
    CREATE TABLE PharmacyDeliveryContactChangeRequests (
        RequestID INT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
        OldDeliveryAddress NVARCHAR(500) NULL,
        OldDeliveryLatitude FLOAT NULL,
        OldDeliveryLongitude FLOAT NULL,
        OldDeliveryPhoneNumber NVARCHAR(30) NULL,
        OldDeliveryAddressSource NVARCHAR(50) NULL,
        NewDeliveryAddress NVARCHAR(500) NOT NULL,
        NewDeliveryLatitude FLOAT NULL,
        NewDeliveryLongitude FLOAT NULL,
        NewDeliveryPhoneNumber NVARCHAR(30) NOT NULL,
        NewDeliveryAddressSource NVARCHAR(50) NULL,
        PatientReason NVARCHAR(500) NULL,
        PharmacyReviewNotes NVARCHAR(500) NULL,
        RequestedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ReviewedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT FK_PharmacyDeliveryContactChangeRequests_Order
            FOREIGN KEY (OrderID) REFERENCES PharmacyOrders(OrderID)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PharmacyDeliveryContactChangeRequests_Order_Status'
      AND object_id = OBJECT_ID('PharmacyDeliveryContactChangeRequests')
)
BEGIN
    CREATE INDEX IX_PharmacyDeliveryContactChangeRequests_Order_Status
    ON PharmacyDeliveryContactChangeRequests(OrderID, Status);
END;
