-- ============================================================
-- Migration V1: Rename referencePrice → price in Medicines table
-- 
-- Why: referencePrice was misleading (sounded optional/reference).
--      The unified system selling price is now simply called 'price'.
--
-- Run this BEFORE starting the app with the new code.
-- JPA ddl-auto=update will map field 'price' → column 'price'.
-- ============================================================

IF EXISTS (SELECT 1 FROM sys.columns 
           WHERE object_id = OBJECT_ID('Medicines') 
           AND name = 'referencePrice')
BEGIN
    EXEC sp_rename 'Medicines.referencePrice', 'price', 'COLUMN';
    PRINT 'OK: Renamed Medicines.referencePrice → price';
END
ELSE
BEGIN
    PRINT 'INFO: Column Medicines.referencePrice does not exist (already renamed?)';
END
