## Plan: Prescription Reminder Until Opened

Build a backend flow that sends a prescription reminder every day while the prescription is still active and the patient has not opened it yet. When the patient taps the notification, the mobile app opens prescription detail and filters items by `MORNING`, `AFTERNOON`, `EVENING`. Reuse the existing notification pipeline and prescription read APIs, but add reminder state, reminder scheduling, daily deduplication, and timing-based filtering.

## Goal

Implement a deterministic reminder flow with these rules:

- A prescription is reminder-eligible while `validUntil` has not passed.
- The system sends at most one reminder per prescription per day.
- Reminders stop after the patient opens the prescription detail for the first time.
- Prescription items are filtered by a normalized `timing` value with exactly three allowed values: `MORNING`, `AFTERNOON`, `EVENING`.

## API Contract

### 1) Mark Prescription As Opened

`PATCH /api/prescriptions/{id}/opened`

Purpose:
- Mark the prescription as opened when the patient lands on the detail screen.
- Store the first open timestamp only once.

Request:
- No body required.
- Authentication required.
- Only the prescription owner should be able to call this endpoint.

Response:
```json
{
   "message": "Prescription marked as opened",
   "prescriptionHeaderId": 123,
   "openedAt": "2026-05-15T08:30:00"
}
```

Rules:
- If `openedAt` is already set, the endpoint must be idempotent and return the existing value.
- Do not change pharmacy order state or prescription status here.

### 2) Get Prescription Detail Filtered By Timing

`GET /api/prescriptions/{id}?timing=MORNING`

Purpose:
- Return prescription detail and only the items that match the requested timing.

Query parameters:
- `timing` is optional.
- Allowed values: `MORNING`, `AFTERNOON`, `EVENING`.
- If omitted, return all items.

Response shape:
```json
{
   "prescriptionHeaderId": 123,
   "appointmentId": 456,
   "patientId": "P001",
   "doctorId": "D001",
   "issueDate": "2026-05-15T08:00:00",
   "validUntil": "2026-05-30T23:59:59",
   "status": "Issued",
   "items": [
      {
         "prescriptionItemId": 1,
         "timing": "MORNING",
         "medicationName": "Amlodipine 5mg"
      }
   ]
}
```

Rules:
- The backend must validate the `timing` query value.
- If `timing` is invalid, return a clear validation error.
- Prefer filtering in backend, not in client.

### 3) Daily Reminder Candidate Query

Backend repository contract for scheduler:

- Find prescriptions where:
   - `validUntil` is not null,
   - `validUntil >= now`,
   - `openedAt` is null,
   - `lastReminderSentAt` is null for today, or earlier than the start of today.
- Stamp `lastReminderSentAt` after a notification is sent successfully.

Atomicity requirement:
- The repository update must be safe against duplicate sends when two scheduler instances run at the same time.
- Prefer a claim/update pattern that updates only if the row is still eligible.

## Implementation Steps

1. Define reminder state and repeat rule.
    - Keep `PrescriptionHeader.validUntil` as the source of truth for activeness.
    - Standardize `PrescriptionItem.timing` to exactly one uppercase value from `MORNING`, `AFTERNOON`, `EVENING`.
    - Use a daily repeat cycle: send once per day while the prescription is active and not opened, then stop when the patient opens the prescription or the prescription expires.
    - Keep notification content separate from item timing; the notification only deep-links into prescription detail.

2. Extend the prescription persistence model.
    - Add `lastReminderSentAt` to `PrescriptionHeader`.
    - Add `openedAt` to `PrescriptionHeader` as the explicit stop condition.
    - Keep reminder state on the header, not on each item.
    - Make `openedAt` immutable after first write.

3. Add repository queries and atomic update operations.
    - Add a query that finds active prescriptions that have not been opened and have not been reminded today.
    - Add a modifying update that stamps `lastReminderSentAt` only after send succeeds.
    - Use a date-aware predicate so a prescription can be reminded again on the next day if it is still unopened and still active.
    - Reuse the same query style already used by appointment reminders.

4. Add a scheduled job for prescription notifications.
    - Add a new scheduler method in the existing `NotificationScheduler`.
    - Run it once per morning.
    - For each candidate prescription, resolve the patient user, build the notification payload, send it through `NotificationService.sendMobilePushNotification`, then stamp `lastReminderSentAt`.
    - Use `NotificationType.NEW_PRESCRIPTION` unless a dedicated reminder type is introduced later.
    - Set `actionUrl` to the prescription detail page so the mobile app can navigate directly.
    - Make the job idempotent for the day by filtering on `lastReminderSentAt` with the current date.

5. Add timing-based prescription detail support.
    - Keep the existing `GET /api/prescriptions/{id}` endpoint as the base detail endpoint.
    - Add backend filtering that returns only items matching the requested timing value.
    - Prefer a query parameter on the existing detail endpoint rather than inventing a separate client-side filtering step.
    - Return the full prescription metadata plus the filtered item subset.

6. Add an explicit opened signal.
    - Define `PATCH /api/prescriptions/{id}/opened`.
    - Set `openedAt` only once.
    - Treat this as the gate that disables future daily notifications for that prescription while it remains active.
    - Keep this behavior separate from pharmacy order transfer or prescription status changes.

7. Tighten validation for prescription item input.
    - Validate `timing` at create time so only the allowed uppercase values are accepted.
    - Normalize legacy or incoming mixed-case values before persistence if backward compatibility is needed.
    - Reject unknown values with a clear validation error instead of silently storing free text.
    - Keep `frequency` and `instructions` as descriptive text fields; they are not the reminder key.

8. Update response models only if needed.
    - Keep `PrescriptionResponse` as the base model because it already includes `validUntil` and the full item list.
    - Add lightweight fields such as `isExpired`, `isOpened`, or `lastReminderSentAt` only if they reduce client logic.
    - Avoid expanding notification payloads unless the mobile app requires extra context for routing.

## Recommended Data Model Changes

- `PrescriptionHeader`
   - add `LocalDateTime lastReminderSentAt`
   - add `LocalDateTime openedAt`
- `PrescriptionItem`
   - keep `String timing`
   - enforce normalization and validation

## Recommended Backend Files

- `HealthLink_BE/src/main/java/com/HealthLink/entity/PrescriptionHeader.java`
   - add repeat-reminder state such as `lastReminderSentAt` and `openedAt`
- `HealthLink_BE/src/main/java/com/HealthLink/entity/PrescriptionItem.java`
   - keep `timing` as the timing discriminator and enforce normalized values
- `HealthLink_BE/src/main/java/com/HealthLink/dto/prescription/PrescriptionItemRequest.java`
   - validate and normalize `timing` on input
- `HealthLink_BE/src/main/java/com/HealthLink/dto/prescription/PrescriptionItemResponse.java`
   - expose normalized timing back to the client
- `HealthLink_BE/src/main/java/com/HealthLink/dto/prescription/PrescriptionResponse.java`
   - reuse for full detail and filtered output
- `HealthLink_BE/src/main/java/com/HealthLink/repository/prescription/PrescriptionHeaderRepository.java`
   - add daily reminder candidate query and atomic stamp/update operations
- `HealthLink_BE/src/main/java/com/HealthLink/service/impl/prescription/PrescriptionServiceImpl.java`
   - add filtered detail mapping and opened-state handling
- `HealthLink_BE/src/main/java/com/HealthLink/controller/prescription/PrescriptionController.java`
   - add timing-filter and opened-state endpoints
- `HealthLink_BE/src/main/java/com/HealthLink/scheduler/NotificationScheduler.java`
   - add the prescription reminder scheduled job
- `HealthLink_BE/src/main/java/com/HealthLink/service/notification/NotificationService.java`
   - reuse existing push dispatch and notification persistence
- `HealthLink_BE/src/main/java/com/HealthLink/entity/enums/NotificationType.java`
   - reuse `NEW_PRESCRIPTION` unless a dedicated reminder type is needed
- `HealthLink_BE/doc/data-seed.md`
   - update seed examples so timing uses only normalized values

## Validation And Test Plan

1. Add or update a narrow backend test around daily reminder candidate selection, especially for nullable `validUntil`, already-opened rows, and same-day deduplication.
2. Validate that prescription creation rejects invalid timing values and stores uppercase normalized values for valid ones.
3. Confirm the scheduled job sends at most one notification per prescription per day and only while the prescription is active and unopened.
4. Verify the detail endpoint returns the correct subset when `MORNING`, `AFTERNOON`, or `EVENING` is requested.
5. Run a focused backend build or test slice for the prescription and notification packages after implementation.

## Implementation Order

1. Add or update the `PrescriptionHeader` fields.
2. Add repository queries and atomic update methods.
3. Add prescription opened endpoint and timing filter endpoint.
4. Add scheduler job and notification payload.
5. Add validation for `timing` normalization.
6. Update seed data and run focused tests.

## Decisions

- Scope includes backend only; frontend navigation and UI grouping are out of scope for this plan, except for the API contract they will consume.
- The reminder policy is daily repeat until the patient opens the prescription or it expires.
- Daily deduplication must be enforced in backend state, not only by scheduler timing, to survive retries and multiple instances.
- `timing` stays a string at the persistence boundary only if validation is strict; if the team wants stronger type safety, an enum is the cleaner long-term option.
- Use existing notification infrastructure instead of adding a new delivery mechanism.

## Further Considerations

1. Should the reminder be sent every morning only, or at a configurable hour? Recommended default: one fixed morning cron for the first release.
2. Should the first open of prescription detail mark the prescription as opened automatically, or should the app call a dedicated `mark opened` endpoint? Recommended default: dedicated endpoint so the behavior is explicit.
3. Should the prescription remain reminder-eligible after opened if the patient closes and reopens it later? Recommended default: no, stop reminders once opened.
