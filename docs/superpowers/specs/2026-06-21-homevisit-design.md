# Home Visit (Bác Sĩ Gia Đình) — Design Doc

**Ngày:** 2026-06-21
**Phiên bản:** 2.0
**Phạm vi:** Web (React) first; Mobile (Flutter) deferred

---

## 1. Mục Tiêu

Thay thế hoàn toàn hình thức "Offline (khám tại phòng khám)" bằng "HomeVisit (Bác Sĩ Gia Đình)". Bệnh nhân cao cấp có thể đặt bác sĩ đến khám tại nhà với gói phí cố định do platform quy định. Hệ thống dùng mô hình **session-based** (sáng 07-12, chiều 13-17) thay vì slot-based cho HomeVisit, giải quyết bài toán thời gian lấn giờ giữa các cuộc hẹn.

---

## 2. Non-Goals

- Quản lý người thân / hồ sơ sức khỏe theo từng thành viên gia đình (`FamilyMembers`) — phase sau
- Mobile (Flutter) implementation — phase sau
- Real-time tracking bác sĩ trên đường đi — phase sau
- Tích hợp VNPay/Momo cho HomeVisit — phase sau

---

## 3. Mô Hình Session-Based

### 3.1. Session Cố Định

| Session | Giờ | Độ dài |
|---------|:---:|:------:|
| Sáng (MORNING) | 07:00 - 12:00 | 5 tiếng |
| Chiều (AFTERNOON) | 13:00 - 17:00 | 4 tiếng |

- Mỗi bác sĩ tối đa **2 HomeVisit/ngày** (1 sáng, 1 chiều)
- Online và HomeVisit **không share chung time range** trong `DoctorSchedule`
- Bác sĩ dùng `WeeklyScheduleBuilder` để đánh dấu buổi nào dành cho HomeVisit
- `homeVisitFee` do platform quy định, đồng giá cho mọi bác sĩ
- Đã bao gồm phí di chuyển, không tính travelFee riêng

### 3.2. Ví Dụ Lịch Bác Sĩ

```
Thứ 2: 07-12 [Video, Audio, Chat]     → Online
Thứ 2: 13-17 [Video, Audio, Chat]     → Online
Thứ 3: 07-12 [Video, Audio, Chat]     → Online  
Thứ 3: 13-17 [HomeVisit]              → HomeVisit
Thứ 4: 07-12 [HomeVisit]              → HomeVisit
Thứ 4: 13-17 [Video, Audio, Chat]     → Online
Thứ 5: 07-12 [Video, Audio, Chat]     → Online
Thứ 5: 13-17 [Online]                 → Không dùng cho HomeVisit
```

---

## 4. Thay Đổi Database

### 4.1. Doctor — Thay thế field

**Xóa (phase 2 cleanup — giữ nguyên trong phase 1 để migration an toàn):**
- `availableForOffline` (boolean)
- `customCommissionRateOffline` (BigDecimal)
- `customCommissionRateOfflineEffectiveFrom` (LocalDateTime)
- `customCommissionRateOfflineEffectiveTo` (LocalDateTime)

**Thêm:**
- `availableForHomeVisit` boolean default false
- `homeVisitRadiusKm` double default 10 — bán kính tối đa (km)

### 4.2. ConsultationType Enum

```
OFFLINE → HOME_VISIT
```

Bộ giá trị mới: `VIDEO, AUDIO, CHAT, HOME_VISIT`

### 4.3. DoctorSchedule — Thêm ConsultationType

Schedule có `consultationType` = `"HomeVisit"` → schedule đó dành riêng cho HomeVisit.

Khi `getAvailableSlots` chạy với `consultationType=Online` → bỏ qua schedule có `"HomeVisit"`.

### 4.4. HomeVisitDetails (Bảng Mới)

Lưu thông tin khám tại nhà sau khi payment thành công.

```sql
CREATE TABLE HomeVisitDetails (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentId INT NOT NULL UNIQUE REFERENCES Appointments(AppointmentID),
    VisitAddress NVARCHAR(500) NOT NULL,
    VisitLatitude DECIMAL(10,7),
    VisitLongitude DECIMAL(10,7),
    ContactPhone NVARCHAR(20) NOT NULL,
    IsForSelf BIT NOT NULL DEFAULT 1,
    ReceiverName NVARCHAR(100),
    ReceiverAge INT,
    ReceiverGender NVARCHAR(10),
    ReceiverRelationship NVARCHAR(50),
    ReasonForHomeVisit NVARCHAR(500),
    SpecialNotes NVARCHAR(500),
    HomeVisitFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```

### 4.5. HomeVisitBookings (Bảng Mới)

Track session nào đã bị khóa bởi HomeVisit.

```sql
CREATE TABLE HomeVisitBookings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DoctorId NVARCHAR(450) NOT NULL,
    ScheduleId INT NOT NULL REFERENCES DoctorSchedules(ScheduleID),
    BookingDate DATE NOT NULL,
    AppointmentId INT NOT NULL UNIQUE REFERENCES Appointments(AppointmentID),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_Doctor_Session_Date UNIQUE (DoctorId, ScheduleId, BookingDate)
);
```

### 4.6. HomeVisitDrafts (Bảng Mới)

Lưu tạm thông tin HomeVisit trước khi payment (TTL 30 phút).

```sql
CREATE TABLE HomeVisitDrafts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PatientId NVARCHAR(450) NOT NULL,
    DoctorId NVARCHAR(450) NOT NULL,
    AppointmentId INT NOT NULL REFERENCES Appointments(AppointmentID),
    VisitAddress NVARCHAR(500) NOT NULL,
    VisitLatitude DECIMAL(10,7),
    VisitLongitude DECIMAL(10,7),
    ContactPhone NVARCHAR(20) NOT NULL,
    IsForSelf BIT NOT NULL DEFAULT 1,
    ReceiverName NVARCHAR(100),
    ReceiverAge INT,
    ReceiverGender NVARCHAR(10),
    ReceiverRelationship NVARCHAR(50),
    ReasonForHomeVisit NVARCHAR(500),
    SpecialNotes NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL
);
CREATE INDEX IX_HomeVisitDrafts_ExpiresAt ON HomeVisitDrafts(ExpiresAt);
```

### 4.7. CommissionConfig — Service Type mới

Thêm: `CONSULTATION_HOME_VISIT` (rate mặc định: 0.1000 = 10%)

Giữ nguyên: `CONSULTATION_ONLINE`, `PHARMACY_ORDER`

### 4.8. Appointments — ConsultationType values

```
"Online" → vẫn giữ
"Offline" → chuyển thành "HomeVisit" (dùng migration UPDATE)
```

---

## 5. API Endpoints

### 5.1. Backend Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| **GET** | `/api/account/doctors?availableForHomeVisit=true&specialty=X` | Lọc bác sĩ hỗ trợ HomeVisit |
| **GET** | `/api/doctors/{id}/home-visit-sessions` | Lấy danh sách session HomeVisit còn trống (trả về schedule + available dates) |
| **POST** | `/api/consultations/{id}/propose-home-visit` | Bác sĩ đề xuất → tạo Appointment PENDINGPAYMENT + noti patient |
| **POST** | `/api/consultations/{id}/confirm-home-visit` | Patient xác nhận → trả về danh sách session để chọn |
| **POST** | `/api/consultations/{id}/reject-home-visit` | Patient từ chối → xóa proposal, noti doctor |
| **POST** | `/api/home-visit/select-session` | Patient chọn buổi → lưu HomeVisitDraft |
| **POST** | `/api/payment/home-visit/paypal/create` | Tạo PayPal order với homeVisitFee |
| **POST** | `/api/payment/home-visit/paypal/capture` | Capture → tạo HomeVisitDetails + khóa session |
| **GET** | `/api/appointments/{id}/home-visit-details` | Doctor xem chi tiết HomeVisit |
| **GET** | `/api/home-visit/sessions?doctorId=X&date=Y` | Check trạng thái session (cho re-render UI) |

### 5.2. Chi Tiết Endpoint Quan Trọng

#### POST `/api/consultations/{id}/propose-home-visit`
```
Request: {} (doctor đang trong consultation)
Response: { proposalId, message: "Đã gửi đề xuất đến bệnh nhân" }
Backend: Tạo Appointment (status=PENDINGPAYMENT, consultationType=HomeVisit)
         → Gửi WebSocket notification đến patient
```

#### POST `/api/consultations/{id}/confirm-home-visit`
```
Request: {} (patient click "Đồng ý")
Response: { sessions: [{ scheduleId, dayOfWeek, sessionType, 
           startTime, endTime, sessionLabel, availableDates[] }] }
```

#### POST `/api/home-visit/select-session`
```
Request: {
  appointmentId, scheduleId, bookingDate,
  visitAddress, visitLatitude, visitLongitude,
  contactPhone, isForSelf, receiverName, ...,
  reasonForHomeVisit, specialNotes
}
Response: { draftId, expiresAt }
```

#### POST `/api/payment/home-visit/paypal/create`
```
Request: { appointmentId, draftId }
Backend: Tính amount = homeVisitFee (từ config), tạo PayPal order
Response: { orderId }
```

#### POST `/api/payment/home-visit/paypal/capture`
```
Request: { appointmentId, draftId, orderId, paymentMethod }
Backend: Capture PayPal → tạo HomeVisitDetails → tạo HomeVisitBooking (khóa session)
         → Appointment status → SCHEDULED
         → Invoice (amount=homeVisitFee, platformFee=homeVisitFee×rate)
         → CommissionTransaction
         → Xóa HomeVisitDraft
Response: { invoice, appointmentId }
```

---

## 6. Luồng Bác Sĩ Đề Xuất HomeVisit (Chi Tiết)

### 6.1. Sequence Diagram

```
┌──────────┐          ┌──────────┐          ┌────────────┐
│  DOCTOR  │          │  PATIENT │          │  BACKEND   │
│   (FE)   │          │   (FE)   │          │            │
└────┬─────┘          └────┬─────┘          └─────┬──────┘
     │                     │                      │
     │ Click "Đề xuất      │                      │
     │ Bác sĩ Gia Đình"    │                      │
     │────────────────────→│                      │
     │  POST /propose-home-visit                   │
     │─────────────────────────────────────────────→│
     │                     │     App PENDINGPAYMENT │
     │                     │     tạo trong DB       │
     │                     │  WebSocket: proposal   │
     │                     │←───────────────────────│
     │  noti gửi thành công│                      │
     │←────────────────────│                      │
     │                     │  Modal: "Bác sĩ đề    │
     │                     │  xuất HomeVisit"      │
     │                     │  [Đồng ý] [Từ chối]   │
     │                     │                      │
     │                     │ Patient click "Đồng ý"│
     │                     │──────────────────────→│
     │                     │      POST /confirm     │
     │                     │←──────────────────────│
     │                     │  Trả về sessions trống │
     │                     │                      │
     │                     │ Patient chọn buổi     │
     │                     │ + nhập địa chỉ         │
     │                     │──────────────────────→│
     │                     │   POST /select-session │
     │                     │←──────────────────────│
     │                     │  draftId + redirect    │
     │                     │  đến payment           │
     │                     │                      │
     │                     │ Patient pay via PayPal │
     │                     │──────────────────────→│
     │                     │  POST /capture         │
     │                     │←──────────────────────│
     │  Noti: "Bệnh nhân   │  success: invoice      │
     │  đã xác nhận"       │                      │
     │←────────────────────│───────────────────────│
```

### 6.2. WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `home-visit.proposed` | Backend → Patient | `{ appointmentId, doctorName, message }` |
| `home-visit.confirmed` | Backend → Doctor | `{ appointmentId, patientName }` |
| `home-visit.rejected` | Backend → Doctor | `{ appointmentId, reason? }` |
| `home-visit.completed` | Backend → Both | `{ appointmentId, status: 'SCHEDULED' }` |

### 6.3. Patient Từ Chối

```
Patient click "Từ chối" → POST /reject-home-visit
  → Backend: xóa Appointment PENDINGPAYMENT
  → WebSocket: home-visit.rejected → Doctor
  → Online consultation tiếp tục bình thường
```

---

## 7. Luồng Bệnh Nhân Tự Đặt HomeVisit

```
Patient chọn consultationType = HomeVisit
  → HomeVisitForm: nhập địa chỉ, lat/lng, phone, người nhận (validate radius)
  → SpecialtyStep
  → DoctorStep (chỉ hiện bác sĩ availableForHomeVisit=true)
  → SessionPicker (thay DateTimeStep): chỉ hiện 2 nút Sáng/Chiều
    → Chỉ hiện session còn trống (không có HomeVisitBooking)
  → ConfirmStep (hiển thị địa chỉ, session, phí)
  → PaymentStep (PayPal, amount = homeVisitFee)
  → Tạo Appointment + HomeVisitDetails + HomeVisitBooking (khóa session)
```

**Không có DocumentsStep** cho HomeVisit.

---

## 8. Fee & Commission

### 8.1. HomeVisit Fee

```properties
homevisit.default-fee=150.00
```

- Platform quy định 1 giá chung cho mọi bác sĩ
- Giá đã bao gồm phí di chuyển — không tính travel_fee riêng
- Geocoding chỉ dùng để **validate radius**, không dùng để tính phí

### 8.2. Commission

```
homeVisitFee = $150
commissionRate = 10% (CONSULTATION_HOME_VISIT)
platformFee = $150 × 10% = $15
doctorEarning = $150 - $15 = $135
```

Patient pay $150 vào PayPal platform → platform giữ $15 → doctor pendingSettlement += $135

### 8.3. Radius Validation

```
distance = haversine(doctorLat, doctorLng, patientLat, patientLng)
IF distance > doctor.homeVisitRadiusKm → "Địa chỉ ngoài vùng phục vụ của bác sĩ này"
```

Chỉ dùng để lọc bác sĩ hiển thị, không ảnh hưởng đến giá.

---

## 9. Session Availability Logic

### 9.1. Khi Patient Chọn Session

```
GET /api/doctors/{id}/home-visit-sessions
  → Lấy DoctorSchedule có consultationType='HomeVisit' AND available=true
  → Với mỗi schedule, lọc dates:
    - date >= today
    - date không có HomeVisitBooking cho scheduleId+date
    - date không có DoctorScheduleException DAY_OFF
  → Trả về: [{ scheduleId, dayOfWeek, sessionType (MORNING/AFTERNOON),
              startTime, endTime, availableDates: ["2026-06-25", ...] }]
```

### 9.2. Khi getAvailableSlots Cho Online

Thêm vào logic hiện tại: nếu schedule có `consultationType='HomeVisit'` → skip hoàn toàn khi gọi cho Online.

### 9.3. Session Bị Khóa

Khi `HomeVisitBooking` tồn tại cho `scheduleId + bookingDate`:
- Session đó không hiển thị trong danh sách session trống
- Schedule đó không generate Online slots (dù consultationType là Online)

---

## 10. Notification

### 10.1. Notification Types

| Type | Recipient | Trigger |
|------|-----------|---------|
| `HOME_VISIT_PROPOSED` | Patient | Doctor click "Đề xuất" |
| `HOME_VISIT_CONFIRMED` | Doctor | Patient click "Đồng ý" + chọn xong |
| `HOME_VISIT_REJECTED` | Doctor | Patient click "Từ chối" |
| `HOME_VISIT_REMINDER` | Patient | Trước buổi khám (cấu hình) |

### 10.2. Nội Dung

**Patient (PROPOSED):**
> Bác sĩ [tên] đề xuất Bác sĩ Gia Đình cho bạn. Vui lòng xác nhận để chọn lịch phù hợp.

**Doctor (CONFIRMED):**
> Bệnh nhân [tên] đã xác nhận HomeVisit vào [Thứ 4 07-12]. Kiểm tra chi tiết trong danh sách lịch hẹn.

**Patient (REMINDER):**
> Bác sĩ [tên] sẽ đến khám tại nhà bạn vào sáng mai (07-12). Địa chỉ: [địa chỉ].

---

## 11. Error Handling

| Scenario | Xử lý |
|----------|-------|
| Địa chỉ ngoài bán kính bác sĩ | Chặn UI, không cho chọn bác sĩ đó |
| Session đã có người đặt (race condition) | Trả lỗi "Buổi này đã có người đặt. Vui lòng chọn buổi khác" |
| Patient không phản hồi đề xuất | Timeout 5 phút → tự động hủy proposal |
| Patient reject | Hủy Appointment PENDINGPAYMENT, ko tính phí |
| Payment timeout (người dùng không pay) | Appointment PENDINGPAYMENT bị cleanup job xóa sau 30 phút |
| Bác sĩ hủy HomeVisit sau khi confirmed | Hoàn tiền 100% |
| Bệnh nhân hủy > 24h | Hoàn 100% |
| Bệnh nhân hủy ≤ 24h | Mất 100% (chính sách gói cao cấp) |

---

## 12. Admin Management

- **Doctor list:** badge "Home Visit", hiển thị `homeVisitRadiusKm`
- **Commission:** Tab `CONSUMPTION_HOME_VISIT` trong Commission Config
- **Config:** Form cập nhật `homeVisit.default-fee`
- **Báo cáo:** Filter HomeVisit trong doanh thu riêng

---

## 13. Migration Script

```sql
-- 1. Thêm HomeVisit fields cho Doctor
ALTER TABLE Doctors ADD availableForHomeVisit BIT NOT NULL DEFAULT 0;
ALTER TABLE Doctors ADD homeVisitRadiusKm DECIMAL(5,1) NOT NULL DEFAULT 10.0;

-- 2. Tạo HomeVisitDetails
CREATE TABLE HomeVisitDetails (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentId INT NOT NULL UNIQUE REFERENCES Appointments(AppointmentID),
    VisitAddress NVARCHAR(500) NOT NULL,
    VisitLatitude DECIMAL(10,7),
    VisitLongitude DECIMAL(10,7),
    ContactPhone NVARCHAR(20) NOT NULL,
    IsForSelf BIT NOT NULL DEFAULT 1,
    ReceiverName NVARCHAR(100),
    ReceiverAge INT,
    ReceiverGender NVARCHAR(10),
    ReceiverRelationship NVARCHAR(50),
    ReasonForHomeVisit NVARCHAR(500),
    SpecialNotes NVARCHAR(500),
    HomeVisitFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 3. Tạo HomeVisitBookings (track session đã khóa)
CREATE TABLE HomeVisitBookings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DoctorId NVARCHAR(450) NOT NULL,
    ScheduleId INT NOT NULL REFERENCES DoctorSchedules(ScheduleID),
    BookingDate DATE NOT NULL,
    AppointmentId INT NOT NULL UNIQUE REFERENCES Appointments(AppointmentID),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_Doctor_Session_Date UNIQUE (DoctorId, ScheduleId, BookingDate)
);

-- 4. Tạo HomeVisitDrafts (lưu tạm trước payment)
CREATE TABLE HomeVisitDrafts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PatientId NVARCHAR(450) NOT NULL,
    DoctorId NVARCHAR(450) NOT NULL,
    AppointmentId INT NOT NULL REFERENCES Appointments(AppointmentID),
    VisitAddress NVARCHAR(500) NOT NULL,
    VisitLatitude DECIMAL(10,7),
    VisitLongitude DECIMAL(10,7),
    ContactPhone NVARCHAR(20) NOT NULL,
    IsForSelf BIT NOT NULL DEFAULT 1,
    ReceiverName NVARCHAR(100),
    ReceiverAge INT,
    ReceiverGender NVARCHAR(10),
    ReceiverRelationship NVARCHAR(50),
    ReasonForHomeVisit NVARCHAR(500),
    SpecialNotes NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL
);
CREATE INDEX IX_HomeVisitDrafts_ExpiresAt ON HomeVisitDrafts(ExpiresAt);

-- 5. Cập nhật dữ liệu cũ
UPDATE Appointments SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';
UPDATE DoctorSchedules SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';

-- 6. Commission config
INSERT INTO CommissionConfig (ServiceType, CommissionRate, Description, EffectiveFrom)
VALUES ('CONSULTATION_HOME_VISIT', 0.1000, 'Home Visit consultation', GETUTCDATE());
```

---

## 14. Danh Sách File Cần Sửa/Tạo

### Backend (Java)

**Mới:**
| File | Mô tả |
|------|-------|
| `entity/HomeVisitDetails.java` | Entity lưu thông tin khám tại nhà |
| `entity/HomeVisitBooking.java` | Entity track session đã khóa |
| `entity/HomeVisitDraft.java` | Entity lưu tạm trước payment |
| `repository/HomeVisitDetailsRepository.java` | |
| `repository/HomeVisitBookingRepository.java` | |
| `repository/HomeVisitDraftRepository.java` | |
| `dto/request/ProposeHomeVisitRequest.java` | |
| `dto/request/SelectSessionRequest.java` | |
| `dto/request/HomeVisitDetailsRequest.java` | |
| `dto/response/HomeVisitSessionResponse.java` | |
| `dto/response/HomeVisitDetailsResponse.java` | |
| `dto/response/ProposalResponse.java` | |
| `service/consultation/ConsultationProposalService.java` | Interface |
| `service/impl/consultation/ConsultationProposalServiceImpl.java` | Logic đề xuất + confirm |
| `service/HomeVisitSessionService.java` | Interface |
| `service/impl/HomeVisitSessionServiceImpl.java` | Logic session availability |
| `service/HomeVisitBookingService.java` | |
| `service/impl/HomeVisitBookingServiceImpl.java` | |
| `controller/ConsultationProposalController.java` | WebSocket + endpoints |
| `controller/PaymentController.java` (sửa) | Thêm payment cho HomeVisit |

**Sửa:**
| File | Mô tả |
|------|-------|
| `entity/enums/ConsultationType.java` | `OFFLINE → HOME_VISIT` |
| `entity/Appointment.java` | Không cần sửa (dùng consultationType string) |
| `entity/Doctor.java` | Thay `availableForOffline` → `availableForHomeVisit` + `homeVisitRadiusKm` |
| `service/impl/appointment/AppointmentServiceImpl.java` | Sửa `getAvailableSlots` skip HomeVisit schedule |
| `service/impl/payment/FeeCalculatorServiceImpl.java` | Thêm `CONSULTATION_HOME_VISIT` |
| `service/impl/payment/FinanceServiceImpl.java` | Sửa normalize + thêm home-visit payment flow |
| `service/impl/payment/CommissionServiceImpl.java` | Xử lý commission cho HomeVisit |
| `service/impl/admin/AdminCommissionServiceImpl.java` | Thêm service type |
| `service/impl/RegistrationServiceImpl.java` | Sửa field mapping |
| `dto/response/DoctorResponse.java` | `availableForOffline → availableForHomeVisit` |
| `dto/response/DoctorProfileResponse.java` | Tương tự |
| `utility/DoctorServiceHelper.java` | `"offline" → "HomeVisit"` |
| `controller/appointment/AppointmentController.java` | Thêm `home-visit-sessions` endpoint |
| `data-seed.sql` | Update seed |

### Frontend (React)

**Mới:**
| File | Mô tả |
|------|-------|
| `components/consultation/HomeVisitProposalModal.jsx` | Modal đề xuất HomeVisit trong consultation |
| `components/schedule/SessionPicker.jsx` | Thay DateTimeStep cho HomeVisit (chỉ Sáng/Chiều) |
| `components/schedule/HomeVisitForm.jsx` | Form nhập địa chỉ, người nhận |

**Sửa:**
| File | Mô tả |
|------|-------|
| `components/patient-dashboard/Schedule.jsx` | Thêm HomeVisit flow (SessionPicker thay DateTimeStep) |
| `components/schedule/ConsultationStep.jsx` | `"In-Person" → "HomeVisit"` |
| `components/schedule/ConfirmStep.jsx` | Hiển thị session + phí HomeVisit |
| `components/schedule/PaymentStep.jsx` | Hiển thị homeVisitFee |
| `components/schedule/DateTimeStep.jsx` | Skip khi consultationType=HomeVisit |
| `components/doctor/WeeklyScheduleBuilder.jsx` | Icon cho "HomeVisit" |
| `components/doctor/ScheduleFormModal.jsx` | Thêm 'HomeVisit' vào CONSULTATION_TYPES |
| `components/Auth/DoctorRegistration.jsx` | `availableForOffline → availableForHomeVisit` |
| `components/Admin/View/Doctors.jsx` | Badge "Home Visit" |
| `components/Admin/View/CommissionManagement.jsx` | `CONSULTATION_HOME_VISIT` |
| `components/Admin/View/Registrations.jsx` | Sửa field |
| `api/appointmentApi.js` | Thêm endpoints HomeVisit |
| `api/paymentApi.js` | Thêm home-visit payment |
| `api/normalizers.js` | Normalize "HomeVisit" |
| `pages/doctor/appointment/appointmentDetail/tabs/FollowUpTab.jsx` | `Offline → HomeVisit` |

---

## 15. Implementation Order

| Phase | Nội dung | Files |
|:-----:|----------|:-----:|
| 1 | Migration DB + Entity + Repository | 7 mới, 2 sửa |
| 2 | Backend: Session availability logic + getAvailableSlots sửa | 4 mới, 2 sửa |
| 3 | Backend: Consultation proposal flow (WebSocket + endpoints) | 5 mới, 1 sửa |
| 4 | Backend: HomeVisit payment + commission | 2 mới, 4 sửa |
| 5 | Backend: Doctor + registration field mapping | 4 sửa |
| 6 | Frontend: ConsultationProposalModal + SessionPicker | 2 mới |
| 7 | Frontend: HomeVisitForm + ConfirmStep + PaymentStep | 1 mới, 3 sửa |
| 8 | Frontend: Schedule Wizard + Admin | 6 sửa |
| 9 | Notification + WebSocket events | 2 sửa |
| 10 | Testing + data-seed cleanup | — |
