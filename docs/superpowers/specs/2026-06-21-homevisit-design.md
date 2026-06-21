# Home Visit (Bác Sĩ Gia Đình) — Design Doc

**Ngày:** 2026-06-21
**Phiên bản:** 1.0
**Phạm vi:** Web (React) first; Mobile (Flutter) deferred

---

## 1. Mục Tiêu

Thay thế hoàn toàn hình thức "Offline (khám tại phòng khám)" bằng "HomeVisit (khám tại nhà)". Bệnh nhân có thể đặt bác sĩ đến khám tại địa chỉ nhà riêng, với hệ thống lọc bác sĩ theo bán kính phục vụ và tính phí đi lại.

---

## 2. Non-Goals

- Quản lý người thân / hồ sơ sức khỏe theo từng thành viên gia đình (`FamilyMembers`) — để ở phase sau
- Mobile (Flutter) implementation — phase sau
- Real-time tracking bác sĩ trên đường đi — phase sau
- Tích hợp VNPay/Momo cho HomeVisit — phase sau

---

## 3. Thay Đổi Database

### 3.1. Doctor — Thay thế field

**Xóa (phase 2 cleanup — giữ nguyên trong phase 1 để migration an toàn):**
- `availableForOffline` (boolean)
- `customCommissionRateOffline` (BigDecimal)
- `customCommissionRateOfflineEffectiveFrom` (LocalDateTime)
- `customCommissionRateOfflineEffectiveTo` (LocalDateTime)

**Phase 1:** Giữ các field `customCommissionRateOffline*` trong DB nhưng không dùng (reserved). HomeVisit dùng `CommissionConfig` global. Phase 2 sẽ xóa hoặc rename thành `customCommissionRateHomeVisit` nếu cần custom rate cho doctor.

**Thêm:**
- `availableForHomeVisit` boolean default false
- `homeVisitFee` decimal(10,2) default 0 — phí dịch vụ khám tại nhà
- `homeVisitRadiusKm` double default 10 — bán kính tối đa (km)

### 3.2. ConsultationType Enum

```
OFFLINE → HOME_VISIT
```

Bộ giá trị mới: `VIDEO, AUDIO, CHAT, HOME_VISIT`

### 3.3. HomeVisitDetails (Bảng Mới)

```sql
CREATE TABLE HomeVisitDetails (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentId INT NOT NULL UNIQUE,  -- FK → Appointments
    VisitAddress NVARCHAR(500) NOT NULL,
    VisitLatitude DECIMAL(10,7),
    VisitLongitude DECIMAL(10,7),
    ContactPhone NVARCHAR(20) NOT NULL,
    IsForSelf BIT NOT NULL DEFAULT 1,
    ReceiverName NVARCHAR(100),        -- NULL if IsForSelf=1
    ReceiverAge INT,
    ReceiverGender NVARCHAR(10),
    ReceiverRelationship NVARCHAR(50),
    ReasonForHomeVisit NVARCHAR(500),
    SpecialNotes NVARCHAR(500),
    HomeVisitFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    TravelFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```

### 3.4. CommissionConfig — Service Type mới

Thêm: `CONSULTATION_HOME_VISIT` (rate mặc định: 0.1000 = 10%)

Giữ nguyên: `CONSULTATION_ONLINE`, `PHARMACY_ORDER`

### 3.5. Appointments — ConsultationType values

```
"Online" → vẫn giữ
"Offline" → chuyển thành "HomeVisit" (dùng migration UPDATE)
```

---

## 4. API Endpoints

### 4.1. Backend Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| **GET** | `/api/account/doctors?availableForHomeVisit=true&specialty=X` | Lọc bác sĩ hỗ trợ HomeVisit |
| **POST** | `/api/home-visit/details` | Lưu thông tin HomeVisit tạm (trước payment) |
| **GET** | `/api/home-visit/details/{holdId}` | Lấy thông tin HomeVisit đã nhập |
| **POST** | `/api/appointments/calculate-fare` | Tính phí tạm |
| **POST** | `/api/payment/appointments/paypal/create` | Sửa: nhận thêm homeVisitDetails object |
| **POST** | `/api/payment/appointments/paypal/capture` | Sửa: tạo HomeVisitDetails cùng Appointment |
| **GET** | `/api/appointments/{id}/home-visit-details` | Doctor xem chi tiết HomeVisit |
| **PUT** | `/api/appointments/{id}/cancel` | Sửa: hoàn phí travel fee theo policy |

### 4.2. Chi Tiết Endpoint Quan Trọng

#### POST `/api/home-visit/details`
```
Request:
{
  "doctorId": "uuid",
  "patientId": "uuid",
  "visitAddress": "123 Main St, ...",
  "visitLatitude": 10.762622,
  "visitLongitude": 106.660172,
  "contactPhone": "+84901234567",
  "isForSelf": true,
  "receiverName": null,
  "receiverAge": null,
  "receiverGender": null,
  "receiverRelationship": null,
  "reasonForHomeVisit": "Khó di chuyển",
  "specialNotes": "Gọi trước 30 phút"
}

Cơ chế lưu tạm: Dùng bảng `HomeVisitDrafts` trong SQL Server với TTL 30 phút.
- `Id` (INT PK), `PatientId`, `DoctorId`, `Data` (JSON/columns), `CreatedAt`, `ExpiresAt`
- Cleanup job chạy định kỳ xóa draft hết hạn
- Khi payment capture thành công → xóa draft

Response: 200 OK `{ "holdId": "draft-uuid", "expiresAt": "2026-06-21T15:30:00Z" }`
```

#### POST `/api/appointments/calculate-fare`
```
Request:
{
  "doctorId": "uuid",
  "patientLatitude": 10.762622,
  "patientLongitude": 106.660172
}

Response:
{
  "consultationFee": 50.00,
  "homeVisitFee": 20.00,
  "travelFee": 15.50,
  "total": 85.50,
  "distanceKm": 5.2,
  "withinRadius": true,
  "doctorRadiusKm": 10
}
```

#### POST `/api/payment/appointments/paypal/create` (sửa)
```
Request (thêm so với cũ):
{
  ...existingFields,
  "homeVisitDetails": { ... }   // only when consultationType = "HomeVisit"
}
```

---

## 5. Fee Calculation & Geocoding

### 5.1. Travel Fee Formula

```
distance = haversine(doctorLat, doctorLng, patientLat, patientLng)
IF distance > doctor.homeVisitRadiusKm → throw InvalidHomeVisitRadiusException
travelFee = distance × TRAVEL_COST_PER_KM

Cấu hình qua `application.properties`:
```properties
homevisit.travel-cost-per-km=2.0
```
```

### 5.2. Geocoding Implementation

- **Frontend:** Google Maps Autocomplete → lấy `lat/lng` từ địa chỉ đã chọn
- **Backend Fallback:** Google Maps Geocoding API (nếu frontend không gửi được lat/lng)
- **API Key:** Thêm `google.maps.api-key` vào `application.properties`

### 5.3. Validation Flow

```
Patient nhập địa chỉ → Geocode → lat/lng
→ Gọi GET /api/account/doctors?availableForHomeVisit=true
→ Frontend filter: doctor.homeVisitRadiusKm >= calculated distance
→ Chỉ hiển thị bác sĩ trong vùng phục vụ
```

---

## 6. Booking Wizard — Luồng Mới

### 6.1. Step Flow

```
Online:    Specialty → Doctor → DateTime → Documents → Confirm → Payment
HomeVisit: Address → Specialty → Doctor → DateTime → Documents → Confirm → Payment
```

### 6.2. Step Details

| Bước | Component | Mô tả |
|------|-----------|-------|
| 0 | **HomeVisitForm** (mới) | Nhập địa chỉ, lat/lng, người nhận, lý do. Validate radius |
| 1 | **SpecialtyStep** | Không đổi |
| 2 | **DoctorStep** | Chỉ hiện bác sĩ `availableForHomeVisit=true` & trong radius. Hiển thị `homeVisitFee` |
| 3 | **DateTimeStep** | `consultationType=HomeVisit` → chỉ lấy slot HomeVisit |
| 4 | **DocumentsStep** | Không đổi |
| 5 | **ConfirmStep** | Thêm dòng "Địa chỉ khám", "Người nhận", "Phí khám tại nhà", "Phí đi lại" |
| 6 | **PaymentStep** | Breakdown fees. Hiển thị tổng |

### 6.3. HomeVisitForm Component (Mới)

```
Props: onAddressSubmit(addressData), onBack
State: visitAddress, placeId, lat/lng, contactPhone,
       isForSelf, receiverName/age/gender/relationship,
       reasonForHomeVisit, specialNotes

Behaviors:
- Google Places Autocomplete cho địa chỉ
- Khi chọn địa chỉ → tự động fill lat/lng
- Validate khoảng cách so với bác sĩ
```

---

## 7. Payment Flow — Sửa Đổi

### 7.1. FeeCalculatorService (Backend)

```java
FeeBreakdown calculateHomeVisitTotal(String doctorId, Double patientLat, Double patientLng):
  doctor = getDoctor(doctorId)
  distance = haversine(doctor.lat, doctor.lng, patientLat, patientLng)
  if distance > doctor.homeVisitRadiusKm → throw
  travelFee = distance * TRAVEL_COST_PER_KM (2.0 USD)
  total = doctor.consultationFee + doctor.homeVisitFee + travelFee
  return FeeBreakdown(total, doctor.consultationFee, doctor.homeVisitFee, travelFee, distance)
```

### 7.2. PaymentStep UI (Frontend)

Hiển thị breakdown:
```
Consultation fee:     $50.00
Home visit fee:      $20.00
Travel fee (5.2km):   $15.50
--------------------------------
Total:                $85.50
```

### 7.3. Capture Payment — Tạo HomeVisitDetails

Khi capture với `consultationType=HomeVisit`:

```java
Appointment appointment = createAppointment(data, "HomeVisit");
HomeVisitDetails details = createHomeVisitDetails(data.getHomeVisitDetails(), appointment);
Invoice invoice = createInvoice(appointment, breakdown);
// Invoice tái sử dụng: consultationFee = phí khám, deliveryFee = travelFee
```

### 7.4. Commission

`CONSULTATION_HOME_VISIT` rate mặc định 10%. Cấu hình qua `CommissionConfig` (giống cơ chế Online/Offline hiện tại).

---

## 8. Notification

### 8.1. Notification Types

| Type | Recipient | Thời điểm |
|------|-----------|-----------|
| `HOME_VISIT_BOOKED` | Doctor | Khi có lịch HomeVisit mới |
| `HOME_VISIT_REMINDER` | Patient | Trước giờ khám (cấu hình) |
| `HOME_VISIT_CANCELLED` | Cả 2 | Khi hủy lịch |

### 8.2. Nội dung

**Doctor (BOOKED):**
> Bạn có lịch khám tại nhà mới. Bệnh nhân: [tên]. Địa chỉ: [địa chỉ]. Thời gian: [giờ] [ngày]. Ghi chú: [specialNotes]

**Patient (REMINDER):**
> Bác sĩ [tên] sẽ đến khám tại nhà bạn lúc [giờ] ngày [ngày]. Địa chỉ: [địa chỉ]. Số liên hệ: [sđt bác sĩ]

---

## 9. Error Handling

| Scenario | Xử lý |
|----------|-------|
| Địa chỉ ngoài bán kính | Block UI, hiển thị khoảng cách tối đa |
| Geocoding thất bại | Cho nhập tay lat/lng, hoặc fallback text |
| Bác sĩ hủy | Hoàn 100% (consultation + homeVisit + travel) |
| Bệnh nhân hủy >24h | Hoàn 100% |
| Bệnh nhân hủy ≤24h | Hoàn consultation, mất homeVisit + travel |
| Tạo HomeVisitDetails thất bại | Rollback appointment + invoice (transactional) |

---

## 10. Admin Management

- **Doctor list:** badge "Home Visit", hiển thị `homeVisitFee`, `homeVisitRadiusKm`
- **Commission:** Tab `CONSULTATION_HOME_VISIT` trong Commission Config
- **Báo cáo:** Filter HomeVisit trong doanh thu

---

## 11. Migration Script

```sql
-- 1. Thêm HomeVisit fields cho Doctor
ALTER TABLE Doctors ADD availableForHomeVisit BIT NOT NULL DEFAULT 0;
ALTER TABLE Doctors ADD homeVisitFee DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE Doctors ADD homeVisitRadiusKm DECIMAL(5,1) NOT NULL DEFAULT 10.0;

-- 1b. Bảng lưu tạm HomeVisit draft trước payment (TTL 30 phút)
CREATE TABLE HomeVisitDrafts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PatientId NVARCHAR(450) NOT NULL,
    DoctorId NVARCHAR(450) NOT NULL,
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

-- 2. Tạo HomeVisitDetails
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
    TravelFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 3. Cập nhật dữ liệu cũ
UPDATE Appointments SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';
UPDATE DoctorSchedules SET ConsultationType = 'HomeVisit' WHERE ConsultationType = 'Offline';

-- 4. Commission config
INSERT INTO CommissionConfig (ServiceType, CommissionRate, Description, EffectiveFrom)
VALUES ('CONSULTATION_HOME_VISIT', 0.1000, 'Home Visit consultation', GETUTCDATE());
```

---

## 12. Danh Sách File Cần Sửa/Tạo

### Backend (Java)

**Mới:**
- `entity/HomeVisitDetails.java`
- `entity/HomeVisitDraft.java`
- `repository/HomeVisitDetailsRepository.java`
- `repository/HomeVisitDraftRepository.java`
- `dto/request/HomeVisitDetailsRequest.java`
- `dto/request/FareCalculationRequest.java`
- `dto/response/FareCalculationResponse.java`
- `dto/response/HomeVisitDetailsResponse.java`
- `exception/InvalidHomeVisitRadiusException.java`
- `service/HomeVisitService.java` + `service/impl/HomeVisitServiceImpl.java`
- `service/HomeVisitDraftService.java` + `service/impl/HomeVisitDraftServiceImpl.java`
- `controller/HomeVisitController.java`

**Sửa:**
- `entity/enums/ConsultationType.java`
- `entity/Doctor.java`
- `service/impl/appointment/AppointmentServiceImpl.java`
- `service/impl/payment/FeeCalculatorServiceImpl.java`
- `service/impl/payment/FinanceServiceImpl.java`
- `service/impl/admin/AdminCommissionServiceImpl.java`
- `service/impl/RegistrationServiceImpl.java`
- `service/admin/AdminDoctorService.java`
- `dto/response/DoctorResponse.java`, `DoctorProfileResponse.java`
- `dto/commission/admin/AdminPartnerCommissionDto.java`
- `dto/registration/DoctorRegistrationRequest.java`, `RegistrationRequestResponse.java`
- `dto/admin/AdminDoctorDto.java`, `AdminDoctorDetailDto.java`
- `controller/appointment/AppointmentController.java`
- `data-seed.sql`

### Frontend (React)

**Mới:**
- `components/schedule/HomeVisitForm.jsx`

**Sửa:**
- `components/schedule/ConsultationStep.jsx`
- `components/schedule/ConfirmStep.jsx`
- `components/schedule/DateTimeStep.jsx`
- `components/schedule/PaymentStep.jsx`
- `components/patient-dashboard/Schedule.jsx`
- `components/doctor/ScheduleFormModal.jsx`
- `components/doctor/WeeklyScheduleBuilder.jsx`
- `api/appointmentApi.js`
- `api/paymentApi.js`
- `api/normalizers.js`
- `components/Auth/DoctorRegistration.jsx`
- `components/Admin/View/Doctors.jsx`
- `components/Admin/View/CommissionManagement.jsx`
- `components/Admin/View/Registrations.jsx`
- `pages/doctor/appointment/appointmentDetail/tabs/FollowUpTab.jsx`
- `hooks/doctor/useFollowUp.js`

---

## 13. Testing Strategy

- **Unit:** `FeeCalculatorService` — haversine, travel fee, radius validation
- **Unit:** `HomeVisitService` — CRUD, validation
- **Integration:** Booking + Payment capture với HomeVisitDetails
- **Frontend:** HomeVisitForm validation, fee breakdown display
- **Migration:** Verify dữ liệu cũ Offline → HomeVisit đúng

---

## 14. Implementation Order

| Phase | Nội dung |
|:-----:|----------|
| 1 | Migration DB + Entity + Repository |
| 2 | Backend: normalize + validation + fee calculation |
| 3 | Backend: API endpoints + payment flow |
| 4 | Backend: commission + admin |
| 5 | Frontend: HomeVisitForm + Address step |
| 6 | Frontend: Booking flow integration |
| 7 | Frontend: Doctor dashboard + Admin |
| 8 | Notification |
| 9 | Testing + cleanup |
