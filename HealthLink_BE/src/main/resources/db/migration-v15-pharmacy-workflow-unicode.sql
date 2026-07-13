-- Existing development data is reset when this migration is adopted. Values that
-- were already persisted as '?' cannot be reconstructed from the database.

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyOrders'
      AND COLUMN_NAME = 'revisionRequestNotes'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyOrders ALTER COLUMN revisionRequestNotes NVARCHAR(1000) NULL;
END;

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyDeliveryContactChangeRequests'
      AND COLUMN_NAME = 'PatientReason'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ALTER COLUMN PatientReason NVARCHAR(500) NULL;
END;

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PharmacyDeliveryContactChangeRequests'
      AND COLUMN_NAME = 'PharmacyReviewNotes'
      AND DATA_TYPE <> 'nvarchar'
)
BEGIN
    ALTER TABLE PharmacyDeliveryContactChangeRequests ALTER COLUMN PharmacyReviewNotes NVARCHAR(500) NULL;
END;
