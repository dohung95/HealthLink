-- Migration: Add FOLLOW_UP_* notification types to Notifications CHECK constraint
-- 
-- Lỗi: SQL CHECK constraint "CK__Notificati__type__70DDC3D8"
-- không cho phép các giá trị FOLLOW_UP_PAYMENT_REQUEST, FOLLOW_UP_PAID,
-- FOLLOW_UP_CONFIRMED, FOLLOW_UP_DENIED
--
-- Cách chạy: mở SQL Server Management Studio và execute script này trên database Project04

-- =============================================
-- Dynamic approach: Find constraint by table and column
-- =============================================
DECLARE @constraintName NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

SELECT @constraintName = cc.name
FROM sys.check_constraints cc
JOIN sys.columns c ON cc.parent_column_id = c.column_id
JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name = 'Notifications' AND c.name = 'type';

IF @constraintName IS NOT NULL
BEGIN
    SET @sql = 'ALTER TABLE dbo.Notifications DROP CONSTRAINT ' + @constraintName + ';

    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT ' + @constraintName + '
    CHECK ([type] IN (
        ''APPOINTMENT_REMINDER'',
        ''NEW_PRESCRIPTION'',
        ''PRESCRIPTION_ISSUED'',
        ''NEW_PHARMACY_REQUEST'',
        ''PHARMACY_REQUEST_STATUS'',
        ''ORDER_STATUS'',
        ''PAYMENT_REQUIRED'',
        ''INVOICE_PAID'',
        ''WALLET_BALANCE_CHANGED'',
        ''NEW_APPOINTMENT'',
        ''RESCHEDULE_APPOINTMENT'',
        ''CANCEL_APPOINTMENT'',
        ''HOME_VISIT_PROPOSED'',
        ''HOME_VISIT_CONFIRMED'',
        ''HOME_VISIT_REJECTED'',
        ''CANCEL_ORDER'',
        ''NEW_ORDER'',
        ''NEW_REGISTRATION'',
        ''NEW_COMMISSION'',
        ''ADMIN_SCHEDULE_CHANGE'',
        ''ADMIN_APPOINTMENT_CANCEL'',
        ''ADMIN_APPOINTMENT_REASSIGN'',
        ''SCHEDULE_COMPLIANCE_WARNING'',
        ''DOCTOR_SCHEDULE_NON_COMPLIANT'',
        ''SCHEDULE_COMPLIANCE_ACHIEVED'',
        ''NEW_REVIEW'',
        ''REVIEW_REPLY'',
        ''FOLLOW_UP_PAYMENT_REQUEST'',
        ''FOLLOW_UP_PAID'',
        ''FOLLOW_UP_CONFIRMED'',
        ''FOLLOW_UP_DENIED''
    ));';
    EXEC sp_executesql @sql;
    PRINT '✅ Constraint ' + @constraintName + ' updated with FOLLOW_UP_* types';
END
ELSE
BEGIN
    PRINT '❌ No CHECK constraint found on Notifications.type column. Please check manually.';
END
