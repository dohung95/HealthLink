IF COL_LENGTH('PharmacyOrders', 'PatientConfirmationRequestedAt') IS NULL
BEGIN
    ALTER TABLE PharmacyOrders ADD PatientConfirmationRequestedAt DATETIME2 NULL;
END;

IF COL_LENGTH('PharmacyOrders', 'PatientConfirmationReason') IS NULL
BEGIN
    ALTER TABLE PharmacyOrders ADD PatientConfirmationReason NVARCHAR(50) NULL;
END;

IF COL_LENGTH('PharmacyDeliveryContactChangeRequests', 'OldDeliveryFee') IS NULL
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ADD OldDeliveryFee DECIMAL(18,2) NULL;
END;

IF COL_LENGTH('PharmacyDeliveryContactChangeRequests', 'NewDeliveryFee') IS NULL
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ADD NewDeliveryFee DECIMAL(18,2) NULL;
END;

IF COL_LENGTH('PharmacyDeliveryContactChangeRequests', 'OldTotalAmount') IS NULL
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ADD OldTotalAmount DECIMAL(18,2) NULL;
END;

IF COL_LENGTH('PharmacyDeliveryContactChangeRequests', 'NewTotalAmount') IS NULL
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ADD NewTotalAmount DECIMAL(18,2) NULL;
END;
