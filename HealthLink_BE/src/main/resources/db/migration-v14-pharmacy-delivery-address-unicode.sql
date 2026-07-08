IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyConsultationRequests'
      AND COLUMN_NAME = 'deliveryAddress'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyConsultationRequests ALTER COLUMN deliveryAddress NVARCHAR(500) NULL;
END;

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyOrders'
      AND COLUMN_NAME = 'deliveryAddress'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyOrders ALTER COLUMN deliveryAddress NVARCHAR(500) NULL;
END;

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyDeliveryContactChangeRequests'
      AND COLUMN_NAME = 'OldDeliveryAddress'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ALTER COLUMN OldDeliveryAddress NVARCHAR(500) NULL;
END;

IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyDeliveryContactChangeRequests'
      AND COLUMN_NAME = 'NewDeliveryAddress'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ALTER COLUMN NewDeliveryAddress NVARCHAR(500) NOT NULL;
END;
