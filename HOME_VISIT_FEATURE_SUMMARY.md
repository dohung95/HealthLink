# HealthLink - Tổng hợp chức năng Home Visit

> Tài liệu này tổng hợp luồng Home Visit đã triển khai trong project HealthLink, từ Backend đến Frontend. Mục tiêu là giúp dễ nắm luồng đặt lịch khám tại nhà, định vị bản đồ, tính phí di chuyển, thanh toán PayPal và lưu thông tin lịch hẹn.

---

## 1. Mục tiêu chức năng Home Visit

Home Visit là luồng đặt lịch để bác sĩ đến khám tại nhà cho bệnh nhân. Patient có thể:

- Đặt lịch Home Visit cho chính mình.
- Đặt lịch Home Visit cho người thân.
- Nhập thông tin người được khám.
- Nhập địa chỉ khám tại nhà.
- Tìm vị trí trên bản đồ theo địa chỉ.
- Chọn hoặc chỉnh vị trí trên map.
- Hệ thống tính khoảng cách di chuyển.
- Hệ thống tính phí di chuyển.
- Thanh toán PayPal trước khi lịch hẹn được tạo.
- Sau thanh toán thành công, appointment mới được lưu vào database.

---

## 2. Luồng tổng quan

```text
Patient chọn Home Visit
        ↓
Chọn bác sĩ
        ↓
Chọn ngày + slot Home Visit
        ↓
Nhập thông tin Home Visit
        ↓
Nhập địa chỉ / chọn vị trí trên map
        ↓
FE gọi BE estimateFee
        ↓
BE tính khoảng cách + phí di chuyển
        ↓
Patient xác nhận thông tin
        ↓
Qua bước Payment
        ↓
BE tạo PayPal order với amount = doctor consultation fee + travel fee
        ↓
Patient thanh toán PayPal
        ↓
BE capture PayPal
        ↓
BE tạo Appointment + HomeVisitDetails + Invoice + Payment
```

---

## 3. Database / Entity liên quan

### 3.1. Bảng `Appointments`

Entity:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\entity\Appointment.java
```

Các field quan trọng:

| Field | Ý nghĩa |
|---|---|
| `AppointmentID` | ID lịch hẹn |
| `PatientID` | Bệnh nhân đặt lịch |
| `DoctorID` | Bác sĩ được đặt |
| `AppointmentTime` | Thời gian bắt đầu |
| `EndTime` | Thời gian kết thúc |
| `ConsultationType` | `Online` hoặc `HomeVisit` |
| `Status` | `SCHEDULED`, `CANCELLED`, `COMPLETED`, ... |
| `Fee` | Tổng phí appointment |
| `Symptoms` | Lý do / triệu chứng |
| `Notes` | Ghi chú |

Với Home Visit, `Fee` nên là:

```text
doctor.consultationFee + travelFee
```

---

### 3.2. Bảng `HomeVisitDetails`

Entity:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\entity\HomeVisitDetails.java
```

Các field chính:

| Field | Ý nghĩa |
|---|---|
| `HomeVisitDetailID` | ID chi tiết Home Visit |
| `AppointmentID` | Liên kết 1-1 với Appointment |
| `VisitAddress` | Địa chỉ khám do patient nhập |
| `VisitCity` | Thành phố / tỉnh |
| `ContactPhone` | Số điện thoại liên hệ |
| `ReasonForHomeVisit` | Lý do khám tại nhà |
| `SpecialNotes` | Ghi chú thêm |
| `IsForSelf` | Đặt cho chính mình hay người thân |
| `ReceiverName` | Tên người được khám |
| `ReceiverAge` | Tuổi người được khám |
| `ReceiverGender` | Giới tính |
| `ReceiverRelationship` | Quan hệ với patient |
| `ReceiverPhone` | Số điện thoại người được khám |
| `VisitLatitude` | Vĩ độ vị trí khám |
| `VisitLongitude` | Kinh độ vị trí khám |
| `DistanceKm` | Khoảng cách di chuyển |
| `EstimatedTravelMinutes` | Thời gian di chuyển ước tính |
| `VisitDurationMinutes` | Thời lượng khám tại nhà |
| `TravelBufferBeforeMinutes` | Thời gian đệm trước khi khám |
| `TravelBufferAfterMinutes` | Thời gian đệm sau khi khám |
| `HomeVisitFee` | Phí khám tại nhà / phí bác sĩ |
| `TravelFee` | Phí di chuyển |

---

## 4. Backend - Config Home Visit

File config:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\resources\application.properties
```

Các config đang dùng:

```properties
home-visit.base-latitude=10.80792776715601
home-visit.base-longitude=106.66348621046572
home-visit.max-distance-km=5
home-visit.base-fee=10.00
home-visit.free-distance-km=0
home-visit.travel-fee-per-km=1.50
home-visit.average-speed-kmh=25
```

Ý nghĩa:

| Config | Ý nghĩa |
|---|---|
| `home-visit.base-latitude` | Vĩ độ điểm xuất phát, ví dụ phòng khám |
| `home-visit.base-longitude` | Kinh độ điểm xuất phát |
| `home-visit.max-distance-km` | Khoảng cách phục vụ tối đa |
| `home-visit.base-fee` | Phí Home Visit cơ bản nếu dùng config |
| `home-visit.free-distance-km` | Số km miễn phí, hiện là `0` tức không miễn phí |
| `home-visit.travel-fee-per-km` | Phí di chuyển mỗi km, đơn vị USD |
| `home-visit.average-speed-kmh` | Tốc độ trung bình để fallback tính thời gian |

> Lưu ý: Theo nghiệp vụ mới, tổng tiền thanh toán nên dùng `doctor.consultationFee + travelFee`, không nên chỉ dùng `home-visit.base-fee + travelFee`.

---

## 5. Backend - DTO Home Visit

### 5.1. `AppointmentRequest`

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\request\AppointmentRequest.java
```

Các field Home Visit:

```java
private String visitAddress;
private String visitCity;
private String contactPhone;
private String reasonForHomeVisit;
private String specialNotes;

private Boolean isForSelf;
private String receiverName;
private Integer receiverAge;
private String receiverGender;
private String receiverRelationship;
private String receiverPhone;

private Double visitLatitude;
private Double visitLongitude;
```

---

### 5.2. `AppointmentResponse`

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\response\AppointmentResponse.java
```

Các field Home Visit response:

```java
private String visitAddress;
private String visitCity;
private String contactPhone;
private String reasonForHomeVisit;
private String specialNotes;

private Boolean isForSelf;
private String receiverName;
private Integer receiverAge;
private String receiverGender;
private String receiverRelationship;
private String receiverPhone;

private Double distanceKm;
private Integer estimatedTravelMinutes;
private Integer visitDurationMinutes;
private Integer travelBufferBeforeMinutes;
private Integer travelBufferAfterMinutes;
private BigDecimal homeVisitFee;
private BigDecimal travelFee;
```

---

### 5.3. `HomeVisitEstimateRequest`

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\request\HomeVisitEstimateRequest.java
```

Dùng để FE gửi tọa độ cần tính phí:

```java
private Double visitLatitude;
private Double visitLongitude;
```

---

### 5.4. `HomeVisitEstimateResponse`

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\response\HomeVisitEstimateResponse.java
```

Dùng để trả kết quả estimate:

```java
private Double distanceKm;
private Integer estimatedTravelMinutes;
private BigDecimal homeVisitFee;
private BigDecimal travelFee;
private BigDecimal totalFee;
private Boolean serviceable;
private String message;
```

---

### 5.5. `HomeVisitGeocodeResponse`

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\response\HomeVisitGeocodeResponse.java
```

Dùng để trả kết quả tìm địa chỉ:

```java
private String displayName;
private Double latitude;
private Double longitude;
```

---

## 6. Backend - Controller Home Visit

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\controller\appointment\HomeVisitController.java
```

Base path:

```text
/api/home-visit
```

### 6.1. Scan thông tin từ file

```http
POST /api/home-visit/scan-info
```

Input:

```text
multipart/form-data file
```

Chức năng:

- Nhận ảnh/PDF/DOCX.
- Gửi qua Gemini để đọc thông tin người được khám.
- Trả về các field như tên, tuổi, giới tính, số điện thoại, quan hệ, địa chỉ.

---

### 6.2. Tìm địa chỉ / Geocoding

```http
GET /api/home-visit/geocode?address=...
```

Chức năng:

- Nhận địa chỉ dạng text.
- Gọi Nominatim/OpenStreetMap để tìm tọa độ.
- Giới hạn kết quả trong Việt Nam bằng `countrycodes=vn`.
- Trả danh sách kết quả cho FE chọn.

Response ví dụ:

```json
[
  {
    "displayName": "Lê Lợi, Bến Nghé, Quận 1, Hồ Chí Minh, Việt Nam",
    "latitude": 10.77,
    "longitude": 106.70
  }
]
```

---

### 6.3. Estimate phí di chuyển

```http
POST /api/home-visit/estimate
```

Body:

```json
{
  "visitLatitude": 10.77,
  "visitLongitude": 106.70
}
```

Chức năng:

- Gọi service tính route distance.
- Tính phí di chuyển.
- Kiểm tra có nằm trong vùng phục vụ không.

Response ví dụ:

```json
{
  "distanceKm": 4.2,
  "estimatedTravelMinutes": 15,
  "homeVisitFee": 10.00,
  "travelFee": 6.30,
  "totalFee": 16.30,
  "serviceable": true,
  "message": "This address is within our home visit service area."
}
```

> Theo nghiệp vụ mới, `totalFee` trong estimate có thể chỉ mang tính tham khảo nếu service vẫn dùng `baseFee`. Khi thanh toán thật, BE nên tính lại bằng `doctor.consultationFee + travelFee`.

---

## 7. Backend - Service tính địa chỉ, khoảng cách, phí

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\service\homevisit\HomeVisitLocationService.java
```

### 7.1. Method `geocode(String address)`

Chức năng:

- Kiểm tra địa chỉ không rỗng.
- Gọi Nominatim:

```text
https://nominatim.openstreetmap.org/search?q=...&format=json&limit=5&countrycodes=vn&addressdetails=1
```

- Trả về danh sách `HomeVisitGeocodeResponse`.

Lưu ý:

- Không nên gọi liên tục từng ký tự như autocomplete Google Map.
- Nên để user nhập xong rồi bấm Search.

---

### 7.2. Method `estimate(Double visitLatitude, Double visitLongitude)`

Chức năng:

1. Kiểm tra tọa độ.
2. Gọi OSRM để tính đường đi thực tế.
3. Nếu OSRM lỗi thì fallback bằng khoảng cách đường chim bay.
4. Làm tròn khoảng cách.
5. Tính `serviceable` theo `maxDistanceKm`.
6. Tính `travelFee`.
7. Trả về `HomeVisitEstimateResponse`.

Logic phí hiện tại:

```java
double chargeableKm = Math.max(0, roundedDistance - freeDistanceKm);

BigDecimal travelFee = travelFeePerKm
        .multiply(BigDecimal.valueOf(chargeableKm))
        .setScale(2, RoundingMode.HALF_UP);
```

Với config:

```properties
home-visit.free-distance-km=0
home-visit.travel-fee-per-km=1.50
```

Nghĩa là:

```text
travelFee = distanceKm * 1.50 USD
```

---

### 7.3. Giới hạn phục vụ

Logic:

```java
boolean serviceable = roundedDistance <= maxDistanceKm;
```

Nếu:

```properties
home-visit.max-distance-km=5
```

Thì chỉ nhận Home Visit trong phạm vi route distance tối đa 5km.

---

### 7.4. OSRM route distance

Method:

```java
private RouteDistance getRouteDistanceFromOsrm(Double visitLatitude, Double visitLongitude)
```

Gọi API:

```text
https://router.project-osrm.org/route/v1/driving/{baseLng},{baseLat};{visitLng},{visitLat}?overview=false
```

OSRM trả:

- `distance`: mét.
- `duration`: giây.

Service đổi thành:

- km.
- phút.

---

## 8. Backend - AppointmentServiceImpl

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\service\impl\appointment\AppointmentServiceImpl.java
```

### 8.1. Validate Home Visit

Method:

```java
private void validateHomeVisitRequest(AppointmentRequest request)
```

Kiểm tra:

- `visitAddress` bắt buộc.
- `contactPhone` bắt buộc.
- `reasonForHomeVisit` bắt buộc.
- `isForSelf` bắt buộc.
- Nếu đặt cho người thân:
  - `receiverName` bắt buộc.
  - `receiverRelationship` bắt buộc.
  - `receiverAge` phải > 0.

---

### 8.2. Normalize consultation type

Method:

```java
private String normalizeConsultationTypeForBooking(String consultationType)
```

Các type cũ như:

```text
video, audio, chat, online, consultation
```

được normalize thành:

```text
Online
```

Các type:

```text
homevisit, home visit, home-visit, family doctor, home
```

được normalize thành:

```text
HomeVisit
```

---

### 8.3. Tạo Appointment Home Visit

Trong `createAppointment`, nếu `consultationType = HomeVisit` thì:

1. Gọi `homeVisitLocationService.estimate(...)`.
2. Kiểm tra `serviceable`.
3. Tạo `Appointment`.
4. Tạo `HomeVisitDetails`.
5. Lưu các field:
   - địa chỉ,
   - tọa độ,
   - khoảng cách,
   - thời gian đi,
   - phí khám,
   - phí di chuyển.

Điểm cần nhớ:

```text
Appointment.fee nên là doctor.consultationFee + travelFee
HomeVisitDetails.homeVisitFee nên là doctor.consultationFee
HomeVisitDetails.travelFee nên là estimate.travelFee
```

---

### 8.4. Hủy lịch Home Visit

Hiện rule đã tách:

```text
Online: cancel trước ít nhất 2 giờ
Home Visit: cancel trước ít nhất 6 giờ
```

Config:

```properties
booking.cancel-min-hours-online=2
booking.cancel-min-hours-home-visit=6
```

Helper:

```java
private int getCancelMinHours(String consultationType)
```

---

## 9. Backend - Payment / PayPal

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\service\impl\payment\FinanceServiceImpl.java
```

---

### 9.1. Tạo PayPal order

Method:

```java
public Map<String, Object> createAppointmentPayPalOrder(AppointmentPayPalOrderRequest request)
```

Luồng:

1. Check patient access.
2. Load patient.
3. Load doctor.
4. Normalize consultation type.
5. Check doctor support type.
6. Tính amount.
7. Gọi PayPal `/v2/checkout/orders`.
8. Trả về `orderId`, `amount`, `currency`, `approvalUrl`.

Với Home Visit, amount phải là:

```text
doctor.consultationFee + travelFee
```

Helper quan trọng:

```java
private BigDecimal resolveAppointmentCheckoutAmount(
        Doctor doctor,
        String consultationType,
        Double visitLatitude,
        Double visitLongitude
)
```

Logic đúng nên là:

```java
if (TYPE_HOME_VISIT.equalsIgnoreCase(normalizedType)) {
    HomeVisitEstimateResponse estimate = homeVisitLocationService.estimate(
            visitLatitude,
            visitLongitude
    );

    BigDecimal consultationFee = resolveDoctorConsultationFee(doctor);
    BigDecimal travelFee = estimate.getTravelFee() != null
            ? estimate.getTravelFee()
            : BigDecimal.ZERO;

    return consultationFee.add(travelFee)
            .setScale(2, RoundingMode.HALF_UP);
}
```

---

### 9.2. Capture PayPal payment

Method:

```java
public InvoiceResponse captureAppointmentPayPalPayment(AppointmentPayPalCaptureRequest request)
```

Luồng:

1. Load doctor.
2. Normalize type.
3. Tính `expectedAmount`.
4. Capture PayPal order.
5. Validate PayPal amount khớp `expectedAmount`.
6. Tạo Appointment.
7. Tạo Invoice.
8. Tạo Payment.
9. Gửi notification.

Với Home Visit, `expectedAmount` cũng phải tính bằng:

```text
doctor.consultationFee + travelFee
```

Nếu `createOrder` và `capture` tính khác nhau sẽ lỗi:

```text
PayPal captured amount does not match appointment checkout amount.
```

---

## 10. Frontend - API Home Visit

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\api\homeVisitApi.js
```

Các API:

### 10.1. Scan info

```js
scanInfo(file)
```

Gọi:

```http
POST /api/home-visit/scan-info
```

---

### 10.2. Geocode address

```js
geocodeAddress(address)
```

Gọi:

```http
GET /api/home-visit/geocode?address=...
```

---

### 10.3. Estimate fee

```js
estimateFee({ visitLatitude, visitLongitude })
```

Gọi:

```http
POST /api/home-visit/estimate
```

---

## 11. Frontend - Booking Schedule

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\patient-dashboard\Schedule.jsx
```

---

### 11.1. State Home Visit

State chính:

```js
const [homeVisitInfo, setHomeVisitInfo] = useState({
  visitAddress: '',
  visitCity: '',
  contactPhone: '',
  reasonForHomeVisit: '',
  specialNotes: '',
  isForSelf: true,
  receiverName: '',
  receiverAge: '',
  receiverGender: '',
  receiverRelationship: '',
  receiverPhone: '',
  visitLatitude: null,
  visitLongitude: null,
});
```

Sau khi estimate, nên có thêm:

```js
distanceKm
estimatedTravelMinutes
homeVisitFee
travelFee
totalFee
serviceable
```

---

### 11.2. Step config

Nếu `consultationType === 'HomeVisit'`, luồng thêm step:

```text
Home Visit
```

và bỏ step upload document nếu đã thiết kế như vậy.

---

### 11.3. Chuẩn bị paymentDraft

Trong `handleSchedule`, khi qua Payment:

- Build `bookingData`.
- Với Home Visit, thêm:
  - `visitAddress`
  - `visitCity`
  - `contactPhone`
  - `reasonForHomeVisit`
  - `specialNotes`
  - `isForSelf`
  - `receiverName`
  - `receiverAge`
  - `receiverGender`
  - `receiverRelationship`
  - `receiverPhone`
  - `visitLatitude`
  - `visitLongitude`

Payment draft nên có:

```js
amount: doctorFee + travelFee
homeVisitEstimate: {
  distanceKm,
  estimatedTravelMinutes,
  homeVisitFee: doctorFee,
  travelFee,
  totalFee: doctorFee + travelFee,
}
```

Cách ổn định nhất:

- Trước khi set `paymentDraft`, gọi lại `homeVisitApi.estimateFee(...)`.
- Không chỉ tin `homeVisitInfo.travelFee` vì state có thể bị stale/reset.

---

## 12. Frontend - HomeVisitStep

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\schedule\HomeVisitStep.jsx
```

---

### 12.1. Chọn người được khám

Có 2 mode:

```text
For myself
For someone else
```

Nếu `For myself`:

- Lấy thông tin từ `patientProfile`.
- Tự điền tên, tuổi, giới tính, phone, address nếu có.

Nếu `For someone else`:

- Hiện form nhập thông tin người được khám.
- Có thể scan file để auto-fill bằng Gemini.

---

### 12.2. Các field form

| Field | Ý nghĩa |
|---|---|
| `Receiver name` | Tên người được khám |
| `Age` | Tuổi |
| `Gender` | Giới tính |
| `Relationship` | Quan hệ với patient |
| `Receiver phone` | Số điện thoại người được khám |
| `Visit address` | Địa chỉ thực tế bác sĩ cần đến |
| `City / Province` | Thành phố / tỉnh |
| `Contact phone` | Số điện thoại liên hệ |
| `Reason for home visit` | Lý do khám tại nhà |
| `Special notes` | Ghi chú thêm |

---

### 12.3. Địa chỉ và map

FE dùng:

```text
Leaflet + OpenStreetMap
```

Các component phụ trong cùng file:

```jsx
LocationPicker
MapRecenter
```

`LocationPicker`:

- Lắng nghe click trên map.
- Cập nhật `visitLatitude`, `visitLongitude`.

`MapRecenter`:

- Khi chọn kết quả geocode, map tự nhảy đến vị trí đó.

---

### 12.4. Tìm địa chỉ

Luồng:

```text
User nhập địa chỉ
→ bấm Search
→ FE gọi homeVisitApi.geocodeAddress
→ hiện danh sách kết quả
→ user chọn kết quả
→ FE cập nhật lat/lng
→ map nhảy tới vị trí
```

Lưu ý quan trọng:

```text
Không nên ghi đè visitAddress bằng displayName của map
```

Vì `displayName` có thể mất số nhà.

Cách đúng:

```js
visitAddress: prev.visitAddress,
visitLatitude: result.latitude,
visitLongitude: result.longitude,
mapDisplayAddress: result.displayName,
```

Trong đó:

| Field | Dùng để làm gì |
|---|---|
| `visitAddress` | Địa chỉ bác sĩ đọc để tìm nhà |
| `mapDisplayAddress` | Địa chỉ map trả về để tham khảo |
| `visitLatitude/visitLongitude` | Tính khoảng cách và phí |

---

### 12.5. Estimate travel fee

Khi user bấm:

```text
Estimate travel fee
```

FE gọi:

```js
homeVisitApi.estimateFee({
  visitLatitude,
  visitLongitude,
})
```

Sau đó set:

```js
distanceKm
estimatedTravelMinutes
homeVisitFee
travelFee
totalFee
serviceable
```

Nếu `serviceable = false`, không cho Next.

---

### 12.6. Validate trước khi Next

HomeVisitStep kiểm tra:

- Có `visitAddress`.
- Có `contactPhone`.
- Có `reasonForHomeVisit`.
- Nếu đặt cho người thân:
  - có `receiverName`.
  - có `receiverRelationship`.
  - `receiverAge > 0`.
- Có `visitLatitude`, `visitLongitude`.
- Đã estimate phí.
- Địa chỉ nằm trong vùng phục vụ.

---

## 13. Frontend - PaymentStep

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\schedule\PaymentStep.jsx
```

---

### 13.1. Hiển thị payment summary

Nếu là Home Visit, PaymentStep hiển thị:

- Doctor.
- Home visit fee.
- Travel fee.
- Distance.
- Total.

Logic:

```js
const isHomeVisit = bookingDraft?.consultationType === 'HomeVisit';
const homeVisitEstimate = bookingDraft?.homeVisitEstimate;
```

Display invoice:

```js
const displayInvoice = paidInvoice || {
  invoiceNumber: 'Pending checkout',
  amount: bookingDraft?.amount ?? selectedDoctor?.consultationFee ?? 0,
  consultationFee: isHomeVisit
    ? homeVisitEstimate?.homeVisitFee
    : bookingDraft?.amount ?? selectedDoctor?.consultationFee ?? 0,
  travelFee: homeVisitEstimate?.travelFee,
  distanceKm: homeVisitEstimate?.distanceKm,
  estimatedTravelMinutes: homeVisitEstimate?.estimatedTravelMinutes,
  status: 'Pending',
};
```

---

### 13.2. PayPal button

PaymentStep dùng:

```js
loadPayPalSdk(clientId)
```

và render:

```js
paypal.Buttons({
  createOrder,
  onApprove,
  onCancel,
  onError,
})
```

`createOrder` gọi:

```js
paymentApi.createAppointmentPayPalOrder(bookingDraft)
```

`onApprove` gọi:

```js
paymentApi.captureAppointmentPayPalPayment(
  bookingDraft,
  data.orderID,
  'EWallet'
)
```

---

## 14. Frontend - Payment API

File:

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\api\paymentApi.js
```

Function:

```js
toAppointmentPaymentPayload(bookingDraft, extra = {})
```

Payload gửi lên BE gồm:

```js
patientId,
doctorId,
appointmentTime,
consultationType,
symptoms,
notes,
visitAddress,
visitCity,
contactPhone,
reasonForHomeVisit,
specialNotes,
isForSelf,
receiverName,
receiverAge,
receiverGender,
receiverRelationship,
receiverPhone,
visitLatitude,
visitLongitude,
currency,
orderId,
paymentMethod
```

Quan trọng:

```text
FE không cần gửi amount cho BE tin tuyệt đối.
BE tự tính amount thật bằng doctor.consultationFee + travelFee.
```

---

## 15. Quy tắc phí Home Visit

Theo nghiệp vụ hiện tại nên hiểu như sau:

```text
Total payment = Doctor consultation fee + Travel fee
```

Trong đó:

```text
Travel fee = distanceKm * travelFeePerKm
```

Vì:

```properties
home-visit.free-distance-km=0
```

nên không miễn phí km đầu.

Ví dụ:

```text
Doctor consultation fee = $150.00
Distance = 4.2 km
Travel fee per km = $1.50
Travel fee = 4.2 * 1.5 = $6.30
Total = 150 + 6.3 = $156.30
```

---

## 16. Quy tắc khoảng cách phục vụ

Nên giới hạn theo:

```text
route distance theo đường đi thực tế
```

Không nên giới hạn bằng bán kính vì bác sĩ di chuyển theo đường thật.

Trong service hiện tại:

```java
RouteDistance routeDistance = getRouteDistanceFromOsrm(...);
```

Nếu OSRM thành công:

```text
distanceKm = khoảng cách đường đi thực tế
```

Nếu OSRM lỗi:

```text
fallback = khoảng cách đường chim bay
```

Giới hạn:

```java
boolean serviceable = roundedDistance <= maxDistanceKm;
```

---

## 17. Những điểm cần chú ý / lỗi hay gặp

### 17.1. Payment chỉ lấy consultationFee, không cộng travelFee

Nguyên nhân thường gặp:

- `homeVisitInfo.travelFee` bị `0` khi qua Payment.
- Chưa gọi lại `estimateFee` trước khi set `paymentDraft`.
- BE `createAppointmentPayPalOrder` vẫn dùng `resolveDoctorConsultationFee(doctor)`.
- BE `captureAppointmentPayPalPayment` vẫn dùng `resolveDoctorConsultationFee(doctor)`.
- PayPal button giữ order cũ do component chưa reset.

Cách kiểm tra:

```js
console.log('Home visit checkout amount:', {
  doctorFee,
  travelFee,
  totalAmount,
  latestHomeVisitEstimate,
  homeVisitInfo,
});
```

---

### 17.2. Địa chỉ bị mất số nhà

Nguyên nhân:

```js
visitAddress: result.displayName
```

Cách đúng:

```js
visitAddress: prev.visitAddress,
mapDisplayAddress: result.displayName,
visitLatitude: result.latitude,
visitLongitude: result.longitude,
```

---

### 17.3. Estimate trả travelFee = 0

Kiểm tra:

- `home-visit.travel-fee-per-km` có đang bằng 0 không.
- `distanceKm` có đang bằng 0 không.
- `free-distance-km` có quá lớn không.
- OSRM có trả route đúng không.
- Tọa độ base và tọa độ patient có quá gần nhau không.

---

### 17.4. PayPal UI đúng nhưng popup PayPal sai

Lỗi nằm ở BE `FinanceServiceImpl`.

Kiểm tra:

```java
createAppointmentPayPalOrder
captureAppointmentPayPalPayment
resolveAppointmentCheckoutAmount
```

---

### 17.5. Payment UI sai nhưng PayPal popup đúng

Lỗi nằm ở FE `PaymentStep.jsx`, phần `displayInvoice` hoặc `paymentDraft.amount`.

---

## 18. Checklist test Home Visit

### Test địa chỉ

- Nhập địa chỉ có số nhà.
- Bấm Search.
- Chọn kết quả map.
- Kiểm tra `visitAddress` vẫn còn số nhà.
- Kiểm tra `mapDisplayAddress` chỉ để tham khảo.

### Test estimate

- Bấm Estimate travel fee.
- Kiểm tra hiển thị:
  - distance,
  - travel time,
  - travel fee,
  - total.

### Test payment

- Qua Confirm.
- Qua Payment.
- Kiểm tra:

```text
Home visit fee = doctor.consultationFee
Travel fee = estimate.travelFee
Total = homeVisitFee + travelFee
```

### Test PayPal

- Bấm PayPal.
- Kiểm tra PayPal popup amount.
- Thanh toán sandbox.
- Capture thành công.
- Appointment được tạo sau thanh toán.
- Invoice amount đúng.
- Payment amount đúng.

### Test database

Kiểm tra:

- `Appointments.Fee` đúng tổng tiền.
- `HomeVisitDetails.HomeVisitFee` đúng phí bác sĩ.
- `HomeVisitDetails.TravelFee` đúng phí di chuyển.
- `HomeVisitDetails.DistanceKm` đúng khoảng cách.
- `HomeVisitDetails.VisitAddress` còn số nhà.

---

## 19. Các file chính đã đụng tới

### Backend

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\resources\application.properties
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\entity\HomeVisitDetails.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\request\AppointmentRequest.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\request\HomeVisitEstimateRequest.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\response\AppointmentResponse.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\response\HomeVisitEstimateResponse.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\dto\response\HomeVisitGeocodeResponse.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\controller\appointment\HomeVisitController.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\service\homevisit\HomeVisitLocationService.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\service\impl\appointment\AppointmentServiceImpl.java
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_BE\src\main\java\com\HealthLink\service\impl\payment\FinanceServiceImpl.java
```

### Frontend

```text
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\api\homeVisitApi.js
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\api\paymentApi.js
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\patient-dashboard\Schedule.jsx
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\schedule\HomeVisitStep.jsx
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\schedule\PaymentStep.jsx
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\components\Css\ScheduleWizard.css
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\src\main.jsx
D:\hoc_tap\bai_hoc\sem4\eproject\HealthLink\HealthLink_FE\package.json
```

---

## 20. Gợi ý cải thiện tiếp theo

1. Tách rõ `doctorConsultationFee` và `travelFee` trong invoice.
2. Thêm field `TravelFee` vào invoice nếu muốn báo cáo tài chính chi tiết.
3. Lưu `mapDisplayAddress` nếu muốn doctor xem cả địa chỉ map.
4. Tính khoảng trống lịch bác sĩ có tính cả thời gian di chuyển.
5. Với production, không nên dùng OSRM public demo lâu dài; nên self-host hoặc dùng provider có SLA.
6. Với địa chỉ Việt Nam, nên bắt user kiểm tra marker trước khi thanh toán.
7. Có thể thêm reverse geocoding khi user click map để hiện địa chỉ gợi ý.

---

## 21. Tóm tắt ngắn gọn

Home Visit hiện gồm 5 phần lớn:

```text
1. Form thông tin người được khám
2. Map + geocode địa chỉ
3. Estimate khoảng cách + phí di chuyển
4. Thanh toán PayPal với tổng phí
5. Tạo Appointment + HomeVisitDetails sau thanh toán
```

Rule tiền đúng nên là:

```text
Total = Doctor consultation fee trong database + Travel fee tính theo km
```

Rule khoảng cách đúng nên là:

```text
Dùng route distance theo đường đi thực tế, fallback bán kính nếu OSRM lỗi
```

Rule địa chỉ đúng nên là:

```text
visitAddress giữ nguyên địa chỉ user nhập để bác sĩ tìm nhà
mapDisplayAddress chỉ dùng tham khảo từ map
lat/lng dùng để tính phí
```
