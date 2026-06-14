IF COL_LENGTH('PharmacyConsultationRequests', 'deliveryType') IS NULL
BEGIN
    ALTER TABLE PharmacyConsultationRequests ADD deliveryType NVARCHAR(50) NULL;
END;

IF COL_LENGTH('PharmacyConsultationRequests', 'deliveryAddress') IS NULL
BEGIN
    ALTER TABLE PharmacyConsultationRequests ADD deliveryAddress NVARCHAR(500) NULL;
END;

IF COL_LENGTH('PharmacyConsultationRequests', 'deliveryLatitude') IS NULL
BEGIN
    ALTER TABLE PharmacyConsultationRequests ADD deliveryLatitude FLOAT NULL;
END;

IF COL_LENGTH('PharmacyConsultationRequests', 'deliveryLongitude') IS NULL
BEGIN
    ALTER TABLE PharmacyConsultationRequests ADD deliveryLongitude FLOAT NULL;
END;

IF COL_LENGTH('PharmacyConsultationRequests', 'deliveryPhoneNumber') IS NULL
BEGIN
    ALTER TABLE PharmacyConsultationRequests ADD deliveryPhoneNumber NVARCHAR(30) NULL;
END;

IF COL_LENGTH('PharmacyConsultationRequests', 'deliveryAddressSource') IS NULL
BEGIN
    ALTER TABLE PharmacyConsultationRequests ADD deliveryAddressSource NVARCHAR(50) NULL;
END;

IF COL_LENGTH('PharmacyOrders', 'deliveryPhoneNumber') IS NULL
BEGIN
    ALTER TABLE PharmacyOrders ADD deliveryPhoneNumber NVARCHAR(30) NULL;
END;

IF COL_LENGTH('PharmacyOrders', 'deliveryAddressSource') IS NULL
BEGIN
    ALTER TABLE PharmacyOrders ADD deliveryAddressSource NVARCHAR(50) NULL;
END;
