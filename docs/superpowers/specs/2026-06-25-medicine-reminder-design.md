# Medicine Reminder Design

Status: approved for planning
Date: 2026-06-25
Project: HealthLink

## Summary

Add a patient-facing medicine reminder feature that helps patients manage daily medication intake until each prescription expires. The feature provides configurable reminder times for morning, afternoon, and evening, sends one notification per due timing, and gives patients a todo-style checklist grouped by active prescriptions.

The design extends the existing prescription reminder and notification flow instead of replacing it. HealthLink already has prescription timing support, active prescription queries, notification delivery, reminder metadata, and patient prescription UI. The new work adds patient-level reminder settings and per-day intake checklist state.

## Existing Context

Backend:

- `PrescriptionHeader.validUntil` determines whether a prescription is still active.
- `PrescriptionItem.timing` already supports `MORNING`, `AFTERNOON`, `EVENING`, including comma-separated multi-timing values.
- `NotificationScheduler` currently sends prescription reminders at fixed cron times: 08:00, 12:00, and 18:00.
- `PrescriptionReminderLog` currently records that a reminder was sent for one prescription header, date, and timing.
- `NotificationService` can persist and dispatch WebSocket notifications with metadata.

Frontend:

- `PatientPrescriptionView` already renders patient prescriptions.
- `NotificationBell` already identifies medication reminders from notification metadata.
- `NotificationContext` handles real-time patient notifications and browser notifications.
- There is a placeholder `Reminders.jsx`, but no real daily medicine checklist yet.

## Goals

- Allow each patient to customize reminder times for morning, afternoon, and evening.
- Build a daily checklist from all active prescriptions for the selected timing.
- Group checklist items by prescription.
- Allow patients to check or uncheck each medicine item for the current day and timing.
- Skip sending a reminder if the patient has already completed that timing checklist before the scheduled time.
- Send only one reminder for a patient and timing per day.
- Provide both a full Patient Dashboard page and a quick modal opened from reminder notifications.
- Reset the checklist naturally each day without carrying over incomplete items.

## Non-Goals

- No missed-dose history or adherence analytics.
- No repeated reminder escalation after the first notification.
- No per-prescription or per-medicine custom reminder time.
- No doctor, pharmacy, or admin management UI for reminder settings.
- No medicine refill reminder logic.

## User Decisions

- Reminder times are customizable per patient.
- Reminder times apply globally to the patient for `MORNING`, `AFTERNOON`, and `EVENING`.
- The system sends only one notification at the configured time.
- The checklist shows all medicines due for that timing from all active prescriptions, grouped by prescription.
- If the checklist is complete before the reminder time, no notification is sent.
- The UI includes both a dashboard page and a quick modal.
- Incomplete checklist items do not become missed history and do not carry over to the next day.

## Data Model

### MedicineReminderSetting

Stores patient-level reminder preferences.

Fields:

- `settingId`
- `patient`
- `morningTime`
- `afternoonTime`
- `eveningTime`
- `enabled`
- `createdAt`
- `updatedAt`

Defaults when no row exists:

- `morningTime`: `08:00`
- `afternoonTime`: `12:00`
- `eveningTime`: `18:00`
- `enabled`: `true`

The service creates the row lazily when the patient first updates settings. The read endpoint returns default values without persisting a row.

### MedicineIntakeCheck

Stores checklist state for a patient, medicine item, date, and timing.

Fields:

- `checkId`
- `patient`
- `prescriptionHeader`
- `prescriptionItem`
- `intakeDate`
- `timing`
- `checked`
- `checkedAt`
- `createdAt`
- `updatedAt`

Unique key:

- `patientId + prescriptionItemId + intakeDate + timing`

This allows a medicine with `MORNING,EVENING` timing to be checked separately for each timing.

Only patient actions create or update rows. There is no daily reset job; querying a new `intakeDate` naturally returns an unchecked checklist unless rows already exist for that date.

### MedicineReminderDispatchLog

Stores one reminder dispatch per patient, date, and timing.

Fields:

- `dispatchLogId`
- `patient`
- `reminderDate`
- `timing`
- `scheduledTime`
- `sentAt`

Unique key:

- `patientId + reminderDate + timing`

This is separate from `PrescriptionReminderLog` because the new reminder is patient/timing based and can cover multiple prescriptions in one notification. `PrescriptionReminderLog` remains available for existing behavior until removed by a separate cleanup.

### Schema Updates

Add a SQL schema script under `HealthLink_BE/src/main/resources/db` following the existing migration script style. The script creates the three tables above, with foreign keys to patients, prescription headers, and prescription items, plus the unique constraints described here.

## Backend API

Base path:

`/api/medicine-reminders`

### Get Settings

`GET /api/medicine-reminders/settings`

Returns the authenticated patient's reminder settings, falling back to defaults when no persisted row exists.

Response:

```json
{
  "morningTime": "07:30",
  "afternoonTime": "12:30",
  "eveningTime": "19:00",
  "enabled": true
}
```

### Update Settings

`PUT /api/medicine-reminders/settings`

Updates the authenticated patient's reminder settings.

Request:

```json
{
  "morningTime": "07:30",
  "afternoonTime": "12:30",
  "eveningTime": "19:00",
  "enabled": true
}
```

Validation:

- Times must be valid `HH:mm` local times.
- All three times are required.
- The three timing values must be distinct to avoid confusing duplicate due windows.

### Get Today Checklist

`GET /api/medicine-reminders/today?timing=MORNING`

Builds today's checklist for the authenticated patient and selected timing.

Response shape:

```json
{
  "date": "2026-06-25",
  "timing": "MORNING",
  "scheduledTime": "07:30",
  "checkedCount": 2,
  "totalCount": 4,
  "complete": false,
  "prescriptions": [
    {
      "prescriptionHeaderId": 124,
      "doctorName": "Dr. Nguyen",
      "validUntil": "2026-06-30T23:59:00",
      "items": [
        {
          "prescriptionItemId": 1001,
          "medicationName": "Amlodipine",
          "dosage": "5 mg",
          "quantity": 1,
          "unit": "tablet",
          "instructions": "after food",
          "notes": "",
          "checked": false,
          "checkedAt": null
        }
      ]
    }
  ]
}
```

The service includes prescriptions where `validUntil >= now`, matching current reminder behavior.

### Toggle One Checklist Item

`PATCH /api/medicine-reminders/intake-checks`

Request:

```json
{
  "prescriptionItemId": 1001,
  "timing": "MORNING",
  "intakeDate": "2026-06-25",
  "checked": true
}
```

Behavior:

- Authenticate the patient.
- Verify the item belongs to one of that patient's prescriptions.
- Verify the prescription is still active for the requested date/time.
- Verify the item supports the requested timing.
- Create or update the `MedicineIntakeCheck` row.
- Set `checkedAt` when checked is true; clear `checkedAt` when checked is false.
- Return the updated item state or refreshed checklist summary.

### Complete Timing Checklist

`PATCH /api/medicine-reminders/today/{timing}/complete`

Marks every current active item in the selected timing as checked for today. This endpoint is required because the UI includes a "Mark all as taken" action.

## Scheduler Behavior

Replace the three fixed prescription reminder cron methods with a polling job that runs every five minutes.

Pseudo-flow:

```text
Every 5 minutes:
  now = current local time
  today = now.toLocalDate()

  for each enabled patient reminder setting:
    for each timing in MORNING, AFTERNOON, EVENING:
      scheduledTime = setting time for timing
      if now is not within the due window for scheduledTime:
        continue
      if dispatch log exists for patient + today + timing:
        continue
      checklist = build today's checklist for patient + timing
      if checklist has no items:
        continue
      if checklist is complete:
        continue
      send notification
      create MedicineReminderDispatchLog
```

Due window:

- Use this exact due window: `scheduledTime <= now < scheduledTime + 5 minutes`.
- The dispatch log unique key prevents duplicate sends.

Notification:

- Use the existing `NEW_PRESCRIPTION` type for the first implementation to preserve compatibility with current frontend filtering.
- Distinguish medicine reminders through metadata: `action = "OPEN_MEDICINE_REMINDER"` and a populated `timing` value.

Notification metadata:

```json
{
  "timing": "MORNING",
  "reminderDate": "2026-06-25",
  "scheduledTime": "07:30",
  "prescriptionCount": 2,
  "medicationCount": 4,
  "action": "OPEN_MEDICINE_REMINDER"
}
```

Notification copy:

```text
Morning medication reminder
You have 4 medicine(s) to take this morning from 2 active prescription(s).
```

If the patient completes the checklist after receiving the notification, the system does not send another reminder that day for that timing.

## Frontend Design

### Dashboard Page

Add a patient dashboard page named `Medicine Reminder`.

Behavior:

- Shows tabs or segmented controls for `Morning`, `Afternoon`, and `Evening`.
- Shows each timing's configured time.
- Fetches the selected timing checklist from `GET /api/medicine-reminders/today`.
- Groups medicine rows by prescription.
- Lets the patient check or uncheck each row.
- Provides a settings entry to edit the three timing values and enabled state.
- Provides "Mark all as taken" when there are unchecked rows.
- Handles loading, empty, and error states.

Text mockup:

```text
Medicine Reminder

[ Morning 07:30 ] [ Afternoon 12:30 ] [ Evening 19:00 ]     Settings

Today - Thursday, 25/06/2026
Morning progress: 2/4

Prescription #124 - Dr. Nguyen - valid until 30/06/2026
[ ] Amlodipine 5mg        1 tablet        after food
[x] Vitamin D             1 capsule       with milk

Prescription #127 - Dr. Tran - valid until 02/07/2026
[ ] Cetirizine 10mg       1 tablet        before sleep

[Mark all as taken]
```

Empty state:

```text
No medicines scheduled for this timing.
```

Complete state:

```text
All morning medicines are marked as taken.
```

### Quick Modal

Open a quick checklist modal when a medicine reminder notification is clicked.

Behavior:

- Uses notification metadata timing/date to fetch the checklist.
- Shows the same item completion controls in a compact layout.
- Offers "Open full reminder page" and "Mark all as taken".

Text mockup:

```text
Morning medicines

2 prescriptions - 4 medicines
[ ] Amlodipine 5mg
[x] Vitamin D
[ ] Cetirizine 10mg

[Open full reminder page] [Mark all as taken]
```

### Navigation

Add a Patient Dashboard navigation entry for `Medicine Reminder`. The existing placeholder `Reminders.jsx` can be replaced or routed to the new implementation if it is unused.

### API Client

Add a small `medicineReminderApi` client module in the frontend, following the style of `prescriptionApi.js` and `notificationApi.js`.

Normalize field aliases only if backend responses need compatibility with existing FE naming patterns.

## Edge Cases

- Expired prescriptions are not shown and do not trigger reminders.
- Prescriptions expiring later today remain active while `validUntil >= now`.
- Multi-timing medicines appear in each matching timing tab and are checked independently.
- If `enabled=false`, checklist still works, but scheduler sends no reminder.
- If the patient changes reminder time after a reminder was already sent today, the same timing is not sent again that day.
- If the patient checks all items, then unchecks one after the scheduled reminder window, no new reminder is sent that day.
- If settings do not exist, the API and scheduler use default times.
- If two timing settings are equal, validation rejects the update to avoid duplicate notification confusion.

## Testing

Backend tests:

- Build checklist from active prescriptions and matching timing.
- Exclude expired prescriptions.
- Include multi-timing items in each matching timing.
- Toggle one intake check on and off.
- Reject toggling an item not owned by the patient.
- Complete all items for a timing.
- Scheduler sends when the custom time is due and checklist is incomplete.
- Scheduler skips when checklist is complete before the custom time.
- Scheduler skips when dispatch log already exists for patient/date/timing.
- Scheduler uses default times when settings are missing.

Frontend verification:

- Dashboard loads morning, afternoon, and evening tabs.
- Checkbox updates optimistic UI or refreshes checklist after API success.
- Settings save and reload correctly.
- Empty, loading, and error states render without layout shift.
- Notification click opens the quick modal for the correct timing.
- "Open full reminder page" navigates to the dashboard page with the selected timing.

## OpenAPI

Update `docs/openapi/healthlink-openapi.json` surgically after backend API implementation. Do not hand-read or rewrite the entire file. Add paths and schemas for settings, checklist response, intake check request, and complete timing response.

## Implementation Boundaries

Keep changes scoped to:

- Backend medicine reminder entities, repositories, DTOs, controller, service, scheduler integration, tests, and schema script.
- Frontend medicine reminder API client, patient dashboard route/navigation, checklist page, quick modal, and notification click handling.
- OpenAPI contract updates for the new endpoints.

Avoid unrelated refactors to prescription, pharmacy, appointment, or notification UI code except where needed to route medicine reminder notifications to the new checklist.
