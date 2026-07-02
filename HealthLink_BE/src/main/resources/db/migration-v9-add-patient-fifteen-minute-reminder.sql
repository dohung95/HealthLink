IF COL_LENGTH('Appointments', 'patientFifteenMinuteReminderSent') IS NULL
BEGIN
    ALTER TABLE Appointments
        ADD patientFifteenMinuteReminderSent bit NOT NULL
            CONSTRAINT DF_Appointments_patientFifteenMinuteReminderSent DEFAULT 0;
END;
