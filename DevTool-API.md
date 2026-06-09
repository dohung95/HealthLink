# DevTool API

Các API công cụ phát triển, dùng để mở khóa consultation và bật reminder thủ công (không cần đợi scheduler).

**Điều kiện:** Chỉ hoạt động ở Spring profile `dev` / `test`, yêu cầu role `ADMIN`.

---

## 1. Mở khóa consultation

Force-start consultation từ appointment, **bỏ qua kiểm tra thời gian hẹn**.

```
POST /api/dev-tools/appointments/{appointmentId}/start-consultation
```

| Field | Type | Description |
|-------|------|-------------|
| `appointmentId` | path variable (Integer) | ID của appointment muốn start |

**Request body:** Không có.

**Response:** `ConsultationResponse` (DTO chứa thông tin consultation vừa tạo).

**Cơ chế:** Gọi `ConsultationService.startByAppointmentForTesting(appointmentId)` với flag `ignoreAppointmentTime = true`, bypass hàm `assertCanStart()`.

---

## 2. Bật reminder thủ công

Trigger một notification job ngay lập tức, chạy đúng logic nhưng dùng thời gian giả lập thay vì `LocalDateTime.now()`.

```
POST /api/dev-tools/notifications/trigger
```

**Request body:**

```json
{
  "job": "PATIENT_APPOINTMENT_REMINDER",
  "timing": null
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `job` | String | **Có** | Tên job — xem danh sách dưới |
| `timing` | String | Chỉ bắt buộc với `PRESCRIPTION_REMINDER` | Buổi uống thuốc |

**Response:**

```json
{
  "message": "Triggered PATIENT_APPOINTMENT_REMINDER"
}
```

### Danh sách job

| job | timing bắt buộc | Mô tả | Logic tìm kiếm |
|-----|----------------|-------|-----------------|
| `DAILY_APPOINTMENT_DIGEST` | — | Gửi digest tất cả lịch hẹn trong ngày cho từng bệnh nhân | Appointments trong khoảng `[startOfDay, endOfDay]` theo `now` |
| `PATIENT_APPOINTMENT_REMINDER` | — | Nhắc nhở bệnh nhân trước giờ hẹn 1 tiếng | Appointments trong window `[now + 1h, now + 1h + 5ph]` |
| `DOCTOR_APPOINTMENT_REMINDER` | — | Nhắc nhở bác sĩ trước giờ hẹn 30 phút | Appointments trong window `[now + 30ph, now + 35ph]` |
| `FOLLOW_UP_REMINDER` | — | Nhắc nhở follow-up đến hạn trong ngày | Consultations có follow-up date trong `[startOfDay, endOfDay]` |
| `PRESCRIPTION_REMINDER` | `MORNING` / `AFTERNOON` / `EVENING` | Nhắc uống thuốc theo buổi | Prescriptions còn hiệu lực + chưa gửi reminder hôm đó cho timing này |

### Ví dụ các request

**Patient reminder:**
```json
{
  "job": "PATIENT_APPOINTMENT_REMINDER"
}
```

**Doctor reminder:**
```json
{
  "job": "DOCTOR_APPOINTMENT_REMINDER"
}
```

**Prescription reminder buổi sáng:**
```json
{
  "job": "PRESCRIPTION_REMINDER",
  "timing": "MORNING"
}
```

**Follow-up reminder:**
```json
{
  "job": "FOLLOW_UP_REMINDER"
}
```

**Daily digest:**
```json
{
  "job": "DAILY_APPOINTMENT_DIGEST"
}
```

---

## File tham chiếu

| File | Vai trò |
|------|---------|
| `HealthLink_BE/src/main/java/com/HealthLink/controller/dev/DevToolController.java` | Controller định nghĩa 2 endpoint |
| `HealthLink_BE/src/main/java/com/HealthLink/service/impl/consultation/ConsultationServiceImpl.java` | `startByAppointmentForTesting()` — logic bypass thời gian |
| `HealthLink_BE/src/main/java/com/HealthLink/scheduler/NotificationScheduler.java` | Các method `send*()` được devtool gọi trực tiếp |
| `HealthLink_BE/src/test/java/com/HealthLink/controller/dev/DevToolControllerTest.java` | Unit test |
