Prompt: Triển khai Backend Giai đoạn 3 - HealthLink (Finance & PayPal Integration)
Vai trò: Bạn là một Senior Backend Engineer sử dụng Java Spring Boot 3.x. Nhiệm vụ: Thiết lập mã nguồn cho Giai đoạn 3: Hóa đơn tự động và Tích hợp Thanh toán của dự án HealthLink
. Toàn bộ code phải tuân thủ cấu trúc package phân chia theo module nghiệp vụ tại com.HealthLink và sử dụng cơ sở dữ liệu SQL Server
.
Yêu cầu tiên quyết: Đọc kỹ file ENTITIES.md mục 12 (Invoice)
và mục 23 (Payment)
để nắm rõ cấu trúc và các hằng số trạng thái.

---

1. Định nghĩa Entity (Package: com.HealthLink.entity)
   Hãy triển khai các thực thể JPA sau dựa trên tệp ENTITIES.md:
   Invoice (Entity 12): Quản lý hóa đơn
   . Lưu ý các trường: invoiceNumber (unique, format: INV-YYYYMMDD-XXXX), consultationFee, medicineFee, deliveryFee, và tổng amount
   . Sử dụng các hằng số trạng thái: STATUS_PENDING, STATUS_PAID, STATUS_CANCELLED
   .
   Payment (Entity 23): Quản lý giao dịch thanh toán
   . Sử dụng hằng số GATEWAY_PAYPAL = "PayPal" cho trường paymentGateway
   . Lưu trữ transactionId từ PayPal và metadata (chuỗi JSON phản hồi từ API PayPal)
   .
   Mối quan hệ: Thiết lập quan hệ OneToOne giữa Appointment và Invoice, và OneToMany giữa Invoice và Payment
   .
2. Định nghĩa Repository (Package: com.HealthLink.repository.payment)
   Tạo các interface trong folder con payment:
   InvoiceRepository: Bổ sung method tìm kiếm theo invoiceNumber và danh sách hóa đơn theo patientId
   .
   PaymentRepository: Bổ sung method tìm kiếm giao dịch theo transactionId để đối soát dữ liệu từ PayPal
   .
3. Xử lý Nghiệp vụ (Package: com.HealthLink.service.payment)
   Viết FinanceService (Interface & Implementation) trong folder con payment xử lý các logic sau
   :
   Tạo Hóa đơn tự động (Task 3.1):
   Hệ thống tự động tổng hợp chi phí khi buổi khám hoàn tất: consultationFee (từ Doctor), medicineFee (từ PrescriptionHeader), và deliveryFee (từ PharmacyOrder)
   .
   Tự động tính toán tổng số tiền cuối cùng sau khi trừ discount hoặc cộng tax (nếu có)
   .
   Tích hợp PayPal (Task 3.2):
   Sử dụng PayPal Checkout SDK để tạo đơn hàng (Create Order).
   Xây dựng logic "Capture Payment" sau khi người dùng phê duyệt trên giao diện PayPal.
   Khi giao dịch thành công (STATUS_SUCCESS), hệ thống cập nhật paidAt cho Invoice và chuyển trạng thái hóa đơn sang Paid
   .
4. Điều phối API (Package: com.HealthLink.controller.payment)
   Xây dựng REST Controllers trong folder con payment cung cấp các endpoint:
   GET /api/payment/invoices/{id}: Xem chi tiết hóa đơn và trạng thái thanh toán
   .
   POST /api/payment/paypal/create: Khởi tạo giao dịch PayPal và trả về orderID cho Frontend.
   POST /api/payment/paypal/capture: Tiếp nhận orderID để hoàn tất thanh toán và cập nhật cơ sở dữ liệu.
   GET /api/payment/history/patient/{patientId}: Truy xuất lịch sử thanh toán của bệnh nhân
   .
5. Ràng buộc kỹ thuật & Cấu trúc
   DTO (Package: com.HealthLink.dto.payment): Sử dụng các lớp InvoiceResponse và PayPalRequest để trao đổi dữ liệu qua API
   .
   Exception (Package: com.HealthLink.exception): Xử lý các lỗi chuyên biệt như InvoiceNotFoundException hoặc PayPalIntegrationException.
   Precision: Sử dụng kiểu dữ liệu BigDecimal(10,2) cho toàn bộ các trường số tiền để đảm bảo độ chính xác theo đúng đặc tả hệ thống
   .
   PayPal Gateway: Đảm bảo sử dụng đúng hằng số GATEWAY_PAYPAL và phương thức thanh toán METHOD_EWALLET hoặc METHOD_CARD khi lưu bản ghi Payment
   .
