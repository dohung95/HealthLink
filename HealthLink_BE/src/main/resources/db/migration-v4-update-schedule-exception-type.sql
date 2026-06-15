-- Migration v4: Update ScheduleException type values from PascalCase to UPPER_SNAKE_CASE
-- to match the ScheduleExceptionType enum constants (DAY_OFF, MODIFIED, ADD_SLOT)
UPDATE DoctorScheduleExceptions SET exceptionType = 'DAY_OFF' WHERE exceptionType = 'DayOff';
UPDATE DoctorScheduleExceptions SET exceptionType = 'MODIFIED' WHERE exceptionType = 'Modified';
UPDATE DoctorScheduleExceptions SET exceptionType = 'ADD_SLOT' WHERE exceptionType = 'AddSlot';
