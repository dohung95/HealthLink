IF COL_LENGTH('Appointments', 'followUpSourceAppointmentId') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Appointments_ActiveFollowUpSource')
BEGIN
    CREATE UNIQUE INDEX UX_Appointments_ActiveFollowUpSource
        ON Appointments(followUpSourceAppointmentId)
        WHERE followUpSourceAppointmentId IS NOT NULL AND Status <> 'CANCELLED';
END;
