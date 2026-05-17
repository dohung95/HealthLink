HEALTHLINK - POSTMAN TEST PLAN

Mục tiêu
- Xác minh các API payment chạy đúng theo luồng nghiệp vụ hiện tại.
- Xác minh các API notification hoạt động đúng với xác thực, phân quyền và dữ liệu user.
- Dùng Postman để chạy smoke test, functional test và regression test cho backend.

Phạm vi
- Payment APIs: invoice, PayPal create/capture, refund, partner balance, settlement, admin revenue report, commission config.
- Notification APIs: lấy thông báo, đếm unread, đánh dấu đã đọc, đăng ký/xóa FCM token.

Không nằm trong phạm vi chính của plan này
- WebSocket realtime test bằng client riêng ngoài Postman.
- Kiểm thử hiệu năng, load test, security test chuyên sâu.

1. POSTMAN SETUP

1.1. Collection đề xuất
- HealthLink - Payment API
- HealthLink - Notification API
- HealthLink - Auth Helpers

1.2. Environment variables cần có
- baseUrl
- accessToken
- adminToken
- doctorToken
- pharmacyToken
- patientToken
- appointmentId
- invoiceId
- paymentId
- paypalOrderId
- doctorId
- pharmacyId
- recipientId
- notificationId
- fcmToken
- fcmToken2
- settlementAmount
- refundReason
- fromDate
- toDate

1.3. Pre-request script nên có
- Tự set biến timestamp nếu cần sinh dữ liệu.
- Tự chèn token từ biến môi trường vào header Authorization.
- Với request tạo dữ liệu, có thể dùng script để lưu ID trả về vào environment variables.

1.4. Test script chung nên có
- Status code phải đúng theo kỳ vọng.
- Response time dưới ngưỡng chấp nhận nội bộ.
- Body không được null.
- Các field quan trọng phải tồn tại và có kiểu dữ liệu đúng.
- Với flow tạo mới, lưu ID từ response sang biến môi trường để dùng cho bước sau.

1.5. Pre-request script dùng chung
```javascript
const token = pm.environment.get('accessToken');
if (token) {
	pm.request.headers.upsert({
		key: 'Authorization',
		value: `Bearer ${token}`
	});
}

const nowIso = new Date().toISOString();
pm.environment.set('requestTimestamp', nowIso);
```

1.6. Test script dùng chung
```javascript
const expectedStatus = Number(pm.environment.get('expectedStatus') || 200);

pm.test(`Status code is ${expectedStatus}`, function () {
	pm.response.to.have.status(expectedStatus);
});

pm.test('Response time is acceptable', function () {
	pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test('Response body is not empty', function () {
	const json = pm.response.json();
	pm.expect(json).to.not.be.null;
});

try {
	const json = pm.response.json();

	if (json.invoiceId) {
		pm.environment.set('invoiceId', json.invoiceId);
	}
	if (json.orderId) {
		pm.environment.set('paypalOrderId', json.orderId);
	}
	if (json.paymentId) {
		pm.environment.set('paymentId', json.paymentId);
	}
	if (json.notificationId) {
		pm.environment.set('notificationId', json.notificationId);
	}
} catch (error) {
	console.log('Response is not JSON:', error);
}
```

2. CHUẨN BỊ DỮ LIỆU TRƯỚC KHI TEST

2.1. Dữ liệu payment tối thiểu
- Có ít nhất 1 appointment ở trạng thái Completed để tạo invoice.
- Có ít nhất 1 doctor hợp lệ với `paypalEmail`, `pendingSettlement`, `totalEarnings`.
- Có ít nhất 1 pharmacy hợp lệ với `paypalEmail`, `pendingSettlement`, `totalEarnings`.
- Có ít nhất 1 invoice chưa PAID để test PayPal create/capture.
- Có ít nhất 1 payment đã tạo để test refund.
- Có ít nhất 1 pharmacy order đã được thanh toán hoặc được gán commission nếu muốn test pharmacy commission.

2.2. Dữ liệu notification tối thiểu
- Có ít nhất 1 user bệnh nhân đã đăng nhập.
- Có ít nhất 1 FCM token hợp lệ cho user bệnh nhân.
- Có ít nhất 1 notification tồn tại để test mark-as-read.

2.3. Tài khoản / role
- Admin token cho endpoint admin.
- Doctor token cho các API bác sĩ nếu cần xác nhận truy cập.
- Pharmacy token cho các API nhà thuốc nếu cần xác nhận truy cập.
- Patient token cho notification APIs và các flow thanh toán của patient.

2.4. Bộ dữ liệu seed dùng trong plan
- Appointment hoàn tất để generate invoice: `appointmentId = 11`, `patientId = user-p01`, `doctorId = user-d01`.
- Invoice pending để test PayPal trực tiếp: `invoiceId = 6` hoặc `invoiceId = 8`.
- Payment đã tồn tại để test refund: `paymentId = 1`.
- Partner để test balance và settlement: `doctorId = user-d01`, `pharmacyId = user-ph01`.
- Notification để test mark-as-read: `notificationId = 1`.
- FCM token để test register/remove: `fcmToken = fcm-patient01-ios-001`.
- FCM token phụ: `fcmToken2 = fcm-patient02-android-001`.

2.5. JSON body và URL mẫu theo dữ liệu seed
Generate invoice:
```http
POST /api/payment/invoices/generate/11
```

Create PayPal order:
```json
{
	"invoiceId": 6,
	"currency": "USD"
}
```

Capture PayPal payment:
```json
{
	"orderId": "{{paypalOrderId}}",
	"invoiceId": 6,
	"paymentMethod": "Card"
}
```

Refund payment:
```http
POST /api/payment/refund/1?refundReason=Refund%20for%20duplicate%20payment
```

Partner balance doctor:
```http
GET /api/payment/partner/user-d01/balance?type=DOCTOR
```

Partner balance pharmacy:
```http
GET /api/payment/partner/user-ph01/balance?type=PHARMACY
```

Partner settlement doctor:
```json
{
	"amount": 50.00,
	"paypalEmail": "dr.john.smith@healthlink.com",
	"notes": "Withdraw May earnings"
}
```

Partner settlement pharmacy:
```json
{
	"amount": 40.00,
	"paypalEmail": "cvs.manhattan@pharmacy.com",
	"notes": "Withdraw pharmacy earnings"
}
```

Admin revenue report:
```http
GET /api/payment/admin/reports/revenue?from=2024-05-01T00:00:00&to=2024-05-31T23:59:59&includeDetails=true
```

Admin settlements list:
```http
GET /api/payment/admin/settlements/all?status=PENDING
```

Admin commission config:
```json
{
	"serviceType": "CONSULTATION_ONLINE",
	"commissionRate": 0.1500,
	"minCommission": 1.00,
	"description": "Online consultation fee"
}
```

Get notifications:
```http
GET /api/notifications?page=0&size=20
```

Mark notification as read:
```http
PATCH /api/notifications/1/read
```

Register FCM token:
```json
{
	"token": "fcm-patient01-ios-001",
	"deviceName": "iPhone 15 Pro",
	"platform": "IOS"
}
```

Remove FCM token:
```json
{
	"token": "fcm-patient01-ios-001"
}
```

3. PAYMENT API TEST PLAN

3.1. Generate invoice

Endpoint
- POST /api/payment/invoices/generate/{appointmentId}

Mục tiêu
- Tạo invoice cho appointment đã hoàn tất.

Precondition
- Appointment phải tồn tại.
- Appointment status phải là Completed.
- Invoice cho appointment đó chưa tồn tại.

Happy path
- Gửi appointmentId hợp lệ.
- Kỳ vọng HTTP 200.
- Response có `invoiceId`, `invoiceNumber`, `amount`, `status = Pending`.
- Lưu `invoiceId` vào environment variable.

Negative cases
- appointmentId không tồn tại -> 400.
- appointment chưa Completed -> 400.
- invoice đã tồn tại -> 400.

3.2. Get invoice by id

Endpoint
- GET /api/payment/invoices/{id}

Mục tiêu
- Lấy chi tiết invoice và kiểm tra trường commission.

Precondition
- `invoiceId` hợp lệ.

Happy path
- Gửi invoiceId hợp lệ với token phù hợp.
- Kỳ vọng HTTP 200.
- Response có các field cơ bản: `invoiceId`, `invoiceNumber`, `amount`, `status`, `paidAt`.
- Nếu là admin/doctor/pharmacy thì có thể thấy `platformFee`, `doctorEarning`, `commissionRate`.

Negative cases
- Invoice không tồn tại -> 404 hoặc lỗi tương ứng của hệ thống.
- Token thiếu hoặc role không hợp lệ -> 401/403.

3.3. Get patient payment history

Endpoint
- GET /api/payment/history/patient/{patientId}

Mục tiêu
- Xem lịch sử hóa đơn của bệnh nhân.

Happy path
- Gửi patientId hợp lệ.
- Kỳ vọng HTTP 200.
- Response là danh sách invoice.

Negative cases
- patientId không tồn tại -> response lỗi theo chuẩn hệ thống.

3.4. Create PayPal order

Endpoint
- POST /api/payment/paypal/create

Body mẫu
{
	"invoiceId": 123,
	"currency": "USD"
}

Mục tiêu
- Tạo order PayPal cho invoice chưa thanh toán.

Precondition
- Invoice tồn tại và chưa PAID.

Happy path
- Gửi request hợp lệ.
- Kỳ vọng HTTP 200.
- Response có `orderId`, `status`, `links`.
- Lưu `paypalOrderId` vào environment variable.

Negative cases
- invoiceId không tồn tại -> 404.
- invoice đã PAID -> 400.
- request body thiếu invoiceId -> 400 validation error.

3.5. Capture PayPal payment

Endpoint
- POST /api/payment/paypal/capture

Body mẫu
{
	"orderId": "PAYPAL_ORDER_ID",
	"invoiceId": 123,
	"paymentMethod": "Card"
}

Mục tiêu
- Xác nhận thanh toán thành công, tạo Payment, cập nhật Invoice, kích hoạt commission cho Doctor.

Precondition
- Có orderId hợp lệ từ bước create.
- Invoice chưa PAID.

Happy path
- Gửi request hợp lệ.
- Kỳ vọng HTTP 200.
- Invoice chuyển sang `Paid`.
- Payment mới được tạo với status `Success`.
- Commission của Doctor được ghi nhận.
- Có thể kiểm tra lại bằng GET invoice để thấy `platformFee`, `doctorEarning`, `commissionRate`.

Negative cases
- orderId đã được xử lý trước đó -> 400.
- invoice đã PAID -> 400.
- PayPal capture trả status lỗi -> API trả lỗi tích hợp PayPal.

3.6. Refund payment

Endpoint
- POST /api/payment/refund/{paymentId}

Query params
- refundReason

Mục tiêu
- Hoàn tiền cho payment đã tồn tại.

Precondition
- paymentId tồn tại.
- Có quyền Admin.

Happy path
- Gửi paymentId hợp lệ với admin token.
- Kỳ vọng HTTP 200.
- Payment đổi sang trạng thái refunded.
- Invoice được cập nhật tương ứng.

Negative cases
- token không phải Admin -> 403.
- paymentId không tồn tại -> lỗi not found.

3.7. Partner balance

Endpoint
- GET /api/payment/partner/{partnerId}/balance?type=DOCTOR
- GET /api/payment/partner/{partnerId}/balance?type=PHARMACY

Mục tiêu
- Xác minh số dư hiện tại của partner.

Precondition
- partnerId hợp lệ.

Happy path
- Kỳ vọng HTTP 200.
- Response có `pendingBalance`, `totalEarnings`, `eligibleForWithdrawal`, `withdrawalStatus`.
- `pendingBalance` phản ánh số tiền chưa rút.

Negative cases
- type sai -> 400.
- partnerId không tồn tại -> 400 hoặc not found.
- dùng token của user khác -> 403.

3.8. Partner commission transactions

Endpoint
- GET /api/payment/partner/{partnerId}/transactions

Mục tiêu
- Xem lịch sử commission của partner.

Happy path
- Kỳ vọng HTTP 200.
- Response là danh sách transaction mới nhất trước.
- Kiểm tra các field: `transactionNumber`, `sourceType`, `grossAmount`, `commissionAmount`, `netAmount`, `status`.

Negative cases
- partnerId không thuộc user hiện tại -> 403.

3.9. Request settlement cho partner

Endpoint
- POST /api/payment/partner/{partnerId}/settle?type=DOCTOR
- POST /api/payment/partner/{partnerId}/settle?type=PHARMACY

Body mẫu
{
	"amount": 50.00,
	"paypalEmail": "partner@example.com",
	"notes": "Withdraw earnings"
}

Mục tiêu
- Partner rút tiền về PayPal.

Precondition
- `pendingSettlement` >= 10.
- `paypalEmail` khớp hồ sơ.
- Số tiền rút không vượt quá số dư.

Happy path
- Kỳ vọng HTTP 201.
- Settlement tạo mới với status `PENDING` rồi chuyển `COMPLETED` nếu PayPal accept.
- `pendingSettlement` giảm đúng bằng số tiền rút.
- Lịch sử settlement có bản ghi mới.

Negative cases
- số dư dưới 10 -> 400 / insufficient balance.
- amount lớn hơn pending -> 400.
- paypalEmail không khớp -> 400.
- type sai -> 400.

3.10. Settlement history

Endpoint
- GET /api/payment/partner/{partnerId}/settlements

Mục tiêu
- Xem lịch sử rút tiền của partner.

Happy path
- Kỳ vọng HTTP 200.
- Response là danh sách settlement mới nhất trước.

3.11. Partner settlement endpoints

Endpoint
- POST /api/payment/partner/{partnerId}/settle?type=DOCTOR
- POST /api/payment/partner/{partnerId}/settle?type=PHARMACY
- GET /api/payment/partner/{partnerId}/settlements

Mục tiêu
- Kiểm tra endpoint rút tiền và lịch sử settlement cho partner.

Happy path
- Doctor/Pharmacy withdraw trả về HTTP 201.
- History trả về danh sách settlement.

Negative cases
- partner không tồn tại -> not found.
- request amount không hợp lệ -> validation error.

3.12. Admin revenue report

Endpoint
- GET /api/payment/admin/reports/revenue

Query params
- from
- to
- includeDetails

Mục tiêu
- Xác minh doanh thu app được tổng hợp từ commission transaction.

Happy path
- Kỳ vọng HTTP 200.
- Response có `totalDoctorCommission`, `totalPharmacyCommission`, `totalPlatformRevenue`, `transactionCount`.
- Nếu `includeDetails=true`, response có danh sách transaction.

Negative cases
- from/to sai định dạng -> 400.

3.13. Admin settlements list

Endpoint
- GET /api/payment/admin/settlements/all?status=PENDING

Mục tiêu
- Xác minh admin xem toàn bộ settlement.

Happy path
- Kỳ vọng HTTP 200.
- Response là danh sách settlement.
- Filter theo status hoạt động đúng.

3.14. Admin commission config

Endpoint
- PATCH /api/payment/admin/configs

Body mẫu
{
	"serviceType": "CONSULTATION_ONLINE",
	"commissionRate": 0.1500,
	"minCommission": 1.00,
	"description": "Online consultation fee"
}

Mục tiêu
- Cập nhật tỷ lệ commission cho service type.

Happy path
- Kỳ vọng HTTP 200.
- Response phản ánh rate mới.

Negative cases
- serviceType không có cấu hình active -> 400.
- thiếu field bắt buộc -> validation error.

3.15. Admin commission report nhóm cũ

Endpoint
- GET /api/admin/reports/daily
- GET /api/admin/reports/monthly
- GET /api/admin/reports/yearly
- GET /api/admin/reports/custom

Mục tiêu
- Xác minh các báo cáo doanh thu theo ngày/tháng/năm/khoảng thời gian.

Happy path
- Kỳ vọng HTTP 200.
- Response có cấu trúc doanh thu platform fee.

4. NOTIFICATION API TEST PLAN

4.1. Get notifications

Endpoint
- GET /api/notifications?page=0&size=20

Mục tiêu
- Lấy danh sách thông báo của user đang đăng nhập.

Precondition
- User đã đăng nhập.

Happy path
- Kỳ vọng HTTP 200.
- Response là Page có `content` là danh sách notification.
- Kiểm tra notification thuộc đúng user.

Negative cases
- thiếu token -> 401.

4.2. Get unread count

Endpoint
- GET /api/notifications/unread-count

Mục tiêu
- Lấy số lượng thông báo chưa đọc để hiển thị badge.

Happy path
- Kỳ vọng HTTP 200.
- Response có key `unreadCount`.

4.3. Mark notification as read

Endpoint
- PATCH /api/notifications/{id}/read

Mục tiêu
- Đánh dấu thông báo đã đọc.

Precondition
- Notification tồn tại và thuộc về user đang đăng nhập.

Happy path
- Kỳ vọng HTTP 200.
- Response message xác nhận đã đọc.
- Gọi lại unread count phải giảm.

Negative cases
- notificationId không tồn tại -> lỗi not found.
- user đọc notification của người khác -> 403.

4.4. Register FCM token

Endpoint
- POST /api/notifications/fcm-token

Body mẫu
{
	"token": "FCM_TOKEN_VALUE",
	"deviceName": "iPhone 15",
	"platform": "IOS"
}

Mục tiêu
- Lưu token thiết bị cho user mobile.

Happy path
- Kỳ vọng HTTP 200.
- Response message xác nhận đăng ký token.
- Gọi lại với cùng token phải idempotent, không tạo bản ghi trùng.

Negative cases
- token rỗng -> validation error.
- token trùng cho cùng user -> không tạo bản ghi mới.

4.5. Remove FCM token

Endpoint
- DELETE /api/notifications/fcm-token

Body mẫu
{
	"token": "FCM_TOKEN_VALUE"
}

Mục tiêu
- Vô hiệu hóa token khi user đăng xuất.

Happy path
- Kỳ vọng HTTP 200.
- Token chuyển sang trạng thái inactive.

Negative cases
- token không tồn tại -> response vẫn an toàn, không phá luồng.

5. TEST DATA AND FLOW ORDER

5.1. Thứ tự khuyến nghị để chạy trên Postman
1. Login lấy token cho admin, doctor, pharmacy, patient.
2. Tạo FCM token cho patient.
3. Dùng appointment `11` để generate invoice mới nếu cần flow end-to-end.
4. Generate invoice.
5. Create PayPal order.
6. Capture PayPal payment.
7. Verify invoice, partner balance, commission transactions.
8. Request settlement cho doctor hoặc pharmacy.
9. Verify settlement history và pendingSettlement giảm.
10. Chạy notification read/unread/token APIs.
11. Chạy admin report để đối chiếu doanh thu.

5.2. Checkpoints cần đối chiếu
- Invoice status phải chuyển từ Pending sang Paid sau capture.
- Payment phải được tạo với status Success.
- CommissionTransaction phải xuất hiện sau thanh toán.
- `totalEarnings` và `pendingSettlement` của partner phải tăng sau commission.
- `pendingSettlement` phải giảm sau settlement thành công.
- `totalPlatformRevenue` phải bằng tổng commission của doctor + pharmacy.

6. EXPECTED HTTP STATUS

- 200: đọc dữ liệu, capture payment thành công, get report, mark read, register/remove token.
- 201: tạo settlement chủ động qua endpoint /settle.
- 400: validation lỗi, tham số sai, số dư không đủ, trạng thái invoice/payment không hợp lệ.
- 401: thiếu token.
- 403: sai role hoặc truy cập tài nguyên của người khác.
- 404: id không tồn tại nếu service/map lỗi theo chuẩn not found.

7. GỢI Ý ASSERTION TRONG POSTMAN

7.1. Payment assertions
- `invoiceId` tồn tại trong response.
- `status` của invoice là `Paid` sau capture.
- `orderId` tồn tại sau create PayPal order.
- `transactionId` tồn tại trong Payment.
- `pendingBalance` của partner lớn hơn hoặc bằng 0.
- `totalPlatformRevenue` bằng tổng của doctor và pharmacy commission.

7.2. Notification assertions
- `content` trả về là mảng phân trang.
- `unreadCount` là số nguyên không âm.
- Sau PATCH read, unread count giảm hoặc giữ nguyên nếu đã đọc trước đó.

8. CHÚ Ý KHI CHẠY TEST

- Luôn dùng token đúng role cho từng nhóm API.
- Không dùng cùng một PayPal orderId để capture hai lần.
- Với settlement, đảm bảo `paypalEmail` khớp hồ sơ partner.
- Nếu test refund, nên chạy trên payment riêng biệt để tránh ảnh hưởng số liệu commission khác.
- Với notification REST APIs, nên đăng nhập đúng user đã có notification và FCM token.

9. KẾT LUẬN

Test plan này bao phủ toàn bộ các flow payment và notification đang có trong backend:
- tạo invoice
- tạo và capture PayPal
- commission cho Doctor/Pharmacy
- settlement rút tiền về PayPal
- báo cáo doanh thu admin
- lấy thông báo, đếm unread, mark read, quản lý FCM token

Khi chạy theo đúng thứ tự, Postman có thể dùng làm bộ smoke test và regression test cho toàn bộ nhóm API này.
