1. Yêu cầu dành cho Bệnh nhân (Patient)
REQ-1: Quản lý tài khoản và Hồ sơ sức khỏe: Cho phép đăng ký, đăng nhập và cập nhật thông tin cá nhân (FullName, DateOfBirth, bảo hiểm)
. Bệnh nhân có thể quản lý lịch sử y tế (MedicalHistorySummary) và tải lên các tài liệu như kết quả xét nghiệm, X-quang
.
REQ-2: Đặt lịch tư vấn đa hình thức: Bệnh nhân chọn bác sĩ và hình thức tư vấn: Video call, Audio call, Chat
 hoặc Khám tại nhà (Offline at home). Khi đặt lịch khám tại nhà, bệnh nhân phải cung cấp tọa độ vị trí chính xác trên bản đồ.
REQ-3: Tìm kiếm đối tác gần nhất: Hệ thống tích hợp bản đồ để bệnh nhân tìm kiếm bác sĩ gia đình hoặc nhà thuốc đối tác trong phạm vi gần nhất dựa trên định vị thực tế.
REQ-4: Tương tác và Thanh toán:
Xem đơn thuốc điện tử sau khi bác sĩ kê đơn
.
Thanh toán hóa đơn (Invoices) trực tuyến cho các buổi tư vấn hoặc đơn thuốc thông qua cổng thanh toán được tích hợp
.
Gửi đánh giá (Reviews) và số sao cho bác sĩ sau khi hoàn thành buổi khám
.
2. Yêu cầu dành cho Bác sĩ (Doctor)
REQ-5: Quản lý hồ sơ và Lịch làm việc: Cập nhật bằng cấp, chuyên khoa, kinh nghiệm và vị trí (Location)
. Bác sĩ thiết lập khung thời gian rảnh hàng tuần để hệ thống mở lịch đặt
.
REQ-6: Quy trình khám Offline và Dẫn đường:
Đối với lịch khám tại nhà, hệ thống tích hợp bản đồ (Google Maps) để dẫn đường bác sĩ từ vị trí hiện tại đến nhà bệnh nhân.
Bác sĩ có quyền truy cập hồ sơ sức khỏe của bệnh nhân trong quá trình thăm khám để đưa ra chẩn đoán chính xác
.
REQ-7: Kê đơn và Chuyển giao đơn thuốc:
Sau khi thăm khám, bác sĩ nhập chẩn đoán và ghi chú vào hệ thống
.
Sử dụng Thư viện thuốc tích hợp để chọn tên thuốc, liều lượng và hướng dẫn sử dụng
.
Chức năng chuyển đơn: Sau khi hoàn tất, bác sĩ chọn lệnh chuyển đơn thuốc trực tiếp đến hệ thống của đối tác Nhà thuốc để họ phụ trách cung cấp và giao hàng cho bệnh nhân.
3. Yêu cầu dành cho Nhà thuốc (Pharmacy)
REQ-8: Quản lý thông tin nhà thuốc: Nhà thuốc đăng ký tài khoản với các thông tin về tên cơ sở, giấy phép kinh doanh, địa chỉ và tọa độ bản đồ để bệnh nhân và bác sĩ có thể tìm thấy.
REQ-9: Tiếp nhận và Tư vấn đơn thuốc:
Nhận thông báo Realtime khi có đơn thuốc được chuyển từ bác sĩ hoặc yêu cầu từ bệnh nhân.
Hệ thống cho phép dược sĩ thực hiện Video call với bệnh nhân để giải thích đơn thuốc hoặc tìm hiểu thêm tình trạng lâm sàng trước khi giao thuốc.
REQ-10: Cung cấp và Giao hàng:
Dược sĩ xác nhận đơn thuốc, chuẩn bị thuốc theo danh mục bác sĩ đã kê.
Hệ thống hỗ trợ nhà thuốc theo dõi trạng thái giao hàng (Đang chuẩn bị, Đang giao, Đã hoàn thành) để bệnh nhân cập nhật.
4. Yêu cầu dành cho Quản trị viên (Administrator)
REQ-11: Quản lý thực thể và Đối tác: Phê duyệt hồ sơ bác sĩ và nhà thuốc mới sau khi kiểm tra thông tin xác thực
. Có quyền vô hiệu hóa các tài khoản vi phạm chính sách
.
REQ-12: Giám sát và Báo cáo: Theo dõi toàn bộ danh sách cuộc hẹn, trạng thái thanh toán hóa đơn và tổng hợp dữ liệu báo cáo về hoạt động của hệ thống thông qua Dashboard
.
5. Yêu cầu hệ thống chung (System Requirements)
Hóa đơn tự động: Hệ thống tự động tạo hóa đơn dựa trên phí tư vấn của bác sĩ và đơn giá thuốc từ nhà thuốc
.
Thông báo Realtime: Gửi thông báo tức thời cho bác sĩ khi có lịch hẹn mới, cho nhà thuốc khi có đơn thuốc mới, và cho bệnh nhân khi có kết quả hoặc nhắc uống thuốc
.
Bản đồ và Định vị: Tích hợp API bản đồ để tính toán khoảng cách và dẫn đường cho các dịch vụ tại gia (Khám tại nhà, Giao thuốc).
