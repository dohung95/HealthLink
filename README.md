# HealthLink - Yêu Cầu Hệ Thống

## 1. Yêu Cầu Dành cho Bệnh Nhân (Patient)

### REQ-1: Quản Lý Tài Khoản và Hồ Sơ Sức Khỏe
- Cho phép đăng ký, đăng nhập và cập nhật thông tin cá nhân (FullName, DateOfBirth, bảo hiểm)
- Bệnh nhân có thể quản lý lịch sử y tế (MedicalHistorySummary) và tải lên các tài liệu như kết quả xét nghiệm, X-quang

### REQ-2: Đặt Lịch Tư Vấn Đa Hình Thức
- Bệnh nhân chọn bác sĩ và hình thức tư vấn: Video call, Audio call, Chat hoặc Khám tại nhà (Offline at home)
- Khi đặt lịch khám tại nhà, bệnh nhân phải cung cấp tọa độ vị trí chính xác trên bản đồ

### REQ-3: Tìm Kiếm Đối Tác Gần Nhất
- Hệ thống tích hợp bản đồ để bệnh nhân tìm kiếm bác sĩ gia đình hoặc nhà thuốc đối tác trong phạm vi gần nhất

### REQ-4: Tương Tác và Thanh Toán
- Xem đơn thuốc điện tử sau khi bác sĩ kê đơn
- Thanh toán hóa đơn (Invoices) trực tuyến cho các buổi tư vấn hoặc đơn thuốc thông qua cổng thanh toán được tích hợp
- Gửi đánh giá (Reviews) và số sao cho bác sĩ sau khi hoàn thành buổi khám

---

## 2. Yêu Cầu Dành cho Bác Sĩ (Doctor)

### REQ-5: Quản Lý Hồ Sơ và Lịch Làm Việc
- Cập nhật bằng cấp, chuyên khoa, kinh nghiệm và vị trí (Location)
- Bác sĩ thiết lập khung thời gian rảnh hàng tuần để hệ thống mở lịch đặt

### REQ-6: Quy Trình Khám Offline và Dẫn Đường
- Đối với lịch khám tại nhà, hệ thống tích hợp bản đồ (Google Maps) để dẫn đường bác sĩ từ vị trí hiện tại đến nhà bệnh nhân
- Bác sĩ có quyền truy cập hồ sơ sức khỏe của bệnh nhân trong quá trình thăm khám để đưa ra chẩn đoán chính xác

### REQ-7: Kê Đơn và Chuyển Giao Đơn Thuốc
- Sau khi thăm khám, bác sĩ nhập chẩn đoán và ghi chú vào hệ thống
- Sử dụng Thư viện thuốc tích hợp để chọn tên thuốc, liều lượng và hướng dẫn sử dụng
- Chức năng chuyển đơn: Sau khi hoàn tất, bác sĩ chọn lệnh chuyển đơn thuốc trực tiếp đến hệ thống của đối tác Nhà thuốc để họ phụ trách cung cấp

---

## 3. Yêu Cầu Dành cho Nhà Thuốc (Pharmacy)

### REQ-8: Quản Lý Thông Tin Nhà Thuốc
- Nhà thuốc đăng ký tài khoản với các thông tin về tên cơ sở, giấy phép kinh doanh, địa chỉ và tọa độ bản đồ

### REQ-9: Tiếp Nhận và Tư Vấn Đơn Thuốc
- Nhận thông báo Realtime khi có đơn thuốc được chuyển từ bác sĩ hoặc yêu cầu từ bệnh nhân
- Hệ thống cho phép dược sĩ thực hiện Video call với bệnh nhân để giải thích đơn thuốc hoặc tìm hiểu thêm tình trạng lâm sàng trước khi giao thuốc

### REQ-10: Cung Cấp và Giao Hàng
- Dược sĩ xác nhận đơn thuốc, chuẩn bị thuốc theo danh mục bác sĩ đã kê
- Hệ thống hỗ trợ nhà thuốc theo dõi trạng thái giao hàng (Đang chuẩn bị, Đang giao, Đã hoàn thành) để bệnh nhân cập nhật

---

## 4. Yêu Cầu Dành cho Quản Trị Viên (Administrator)

### REQ-11: Quản Lý Thực Thể và Đối Tác
- Phê duyệt hồ sơ bác sĩ và nhà thuốc mới sau khi kiểm tra thông tin xác thực
- Có quyền vô hiệu hóa các tài khoản vi phạm chính sách

### REQ-12: Giám Sát và Báo Cáo
- Theo dõi toàn bộ danh sách cuộc hẹn, trạng thái thanh toán hóa đơn
- Tổng hợp dữ liệu báo cáo về hoạt động của hệ thống

---

## 5. Yêu Cầu Hệ Thống Chung (System Requirements)

### Hóa Đơn Tự Động
- Hệ thống tự động tạo hóa đơn dựa trên phí tư vấn của bác sĩ và đơn giá thuốc từ nhà thuốc

### Thông Báo Realtime
- Gửi thông báo tức thời cho bác sĩ khi có lịch hẹn mới
- Thông báo cho nhà thuốc khi có đơn thuốc mới
- Thông báo cho bệnh nhân khi có kết quả hoặc nhắc nhở

### Bản Đồ và Định Vị
- Tích hợp API bản đồ để tính toán khoảng cách và dẫn đường cho các dịch vụ tại gia (Khám tại nhà, Giao thuốc)
