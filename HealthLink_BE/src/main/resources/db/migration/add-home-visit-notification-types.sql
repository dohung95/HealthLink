-- Migration: Add HOME_VISIT_* notification types to Notifications CHECK constraint
-- 
-- Lỗi: SQL CHECK constraint "CK__Notificati__type__7B5B524B" 
-- không cho phép các giá trị HOME_VISIT_PROPOSED, HOME_VISIT_CONFIRMED, HOME_VISIT_REJECTED
--
-- Cách chạy: mở SQL Server Management Studio và execute script này trên database Project04

-- =============================================
-- Cách 1: Drop constraint by name (specific to this database)
-- =============================================
IF EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE name = 'CK__Notificati__type__7B5B524B'
)
BEGIN
    ALTER TABLE dbo.Notifications 
    DROP CONSTRAINT CK__Notificati__type__7B5B524B;
    
    ALTER TABLE dbo.Notifications
    ADD CONSTRAINT CK__Notificati__type__7B5B524B 
    CHECK ([type] IN (
        'APPOINTMENT_REMINDER',
        'NEW_PRESCRIPTION',
        'PRESCRIPTION_ISSUED',
        'NEW_PHARMACY_REQUEST',
        'PHARMACY_REQUEST_STATUS',
        'ORDER_STATUS',
        'PAYMENT_REQUIRED',
        'INVOICE_PAID',
        'WALLET_BALANCE_CHANGED',
        'NEW_APPOINTMENT',
        'RESCHEDULE_APPOINTMENT',
        'CANCEL_APPOINTMENT',
        'HOME_VISIT_PROPOSED',
        'HOME_VISIT_CONFIRMED',
        'HOME_VISIT_REJECTED',
        'CANCEL_ORDER',
        'NEW_ORDER',
        'NEW_REGISTRATION',
        'NEW_COMMISSION',
        'ADMIN_SCHEDULE_CHANGE',
        'ADMIN_APPOINTMENT_CANCEL',
        'ADMIN_APPOINTMENT_REASSIGN',
        'SCHEDULE_COMPLIANCE_WARNING',
        'DOCTOR_SCHEDULE_NON_COMPLIANT',
        'SCHEDULE_COMPLIANCE_ACHIEVED',
        'NEW_REVIEW',
        'REVIEW_REPLY'
    ));
    
    PRINT '✅ Constraint CK__Notificati__type__7B5B524B updated successfully';
END
ELSE
BEGIN
    PRINT '⚠️ Constraint CK__Notificati__type__7B5B524B not found. Trying dynamic approach...';
    
    -- Fallback: Find constraint by table and column
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
            ''REVIEW_REPLY''
        ));';
        EXEC sp_executesql @sql;
        PRINT '✅ Constraint ' + @constraintName + ' updated successfully via dynamic SQL';
    END
    ELSE
    BEGIN
        PRINT '❌ No CHECK constraint found on Notifications.type column. Please check manually.';
    END
END
