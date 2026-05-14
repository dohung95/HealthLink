Bạn là senior backend engineer đang làm việc trên dự án HealthLink_BE (Spring Boot). Hãy triển khai các phần realtime notification còn thiếu ở backend, giữ nguyên kiến trúc hiện tại và chỉ sửa trong phạm vi cần thiết.

Mục tiêu nghiệp vụ

1. Khi patient đặt appointment mới, doctor phải nhận notification realtime qua WebSocket/STOMP.
2. Khi doctor chuyển prescription sang pharmacy, pharmacy phải nhận notification realtime qua WebSocket/STOMP.
3. Khi pharmacy cập nhật status của đơn hàng, patient phải nhận notification về trạng thái mới. Có thể dùng WebSocket cho web client và/hoặc lưu notification theo kiến trúc hiện có, nhưng phải đảm bảo patient nhận được thông tin ngay khi backend xử lý xong.
4. Khi appointment bị hủy, doctor phải nhận notification realtime qua WebSocket/STOMP.

Bối cảnh hiện tại trong backend

- Đã có WebSocket config ở:
  [WebSocketConfig.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/config/WebSocketConfig.java)
- Đã có service gửi websocket notification ở:
  [WebSocketNotificationService.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/service/notification/WebSocketNotificationService.java)
- Đã có service điều phối notification ở:
  [NotificationService.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/service/notification/NotificationService.java)
- Đã có enum loại notification ở:
  [NotificationType.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/entity/enums/NotificationType.java)
- Đã có enum kênh notification ở:
  [NotificationChannel.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/entity/enums/NotificationChannel.java)
- Các luồng nghiệp vụ cần gắn notification nằm ở:
  [AppointmentServiceImpl.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/service/impl/appointment/AppointmentServiceImpl.java)
  [PharmacyOrderServiceImpl.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/service/impl/pharmacy/PharmacyOrderServiceImpl.java)

Lưu ý về nghiệp vụ thực tế

- Backend đã có flow “doctor chuyển prescription sang pharmacy” thông qua endpoint:
  `POST /api/pharmacy-orders/transfer`
- Flow này nằm ở:
  [PharmacyOrderController.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/controller/pharmacy/PharmacyOrderController.java)
- Logic tạo PharmacyOrder nằm ở:
  [PharmacyOrderServiceImpl.java](e:/FAI/Projects/HealthLink/HealthLink_BE/src/main/java/com/HealthLink/service/impl/pharmacy/PharmacyOrderServiceImpl.java)
- Không dùng mô tả mơ hồ kiểu “pharmacy tạo đơn mới” nếu nghiệp vụ thực tế là doctor chuyển prescription sang pharmacy.

Yêu cầu triển khai

1. Appointment mới
- Tìm đúng điểm sau khi appointment được tạo thành công trong `createAppointment(...)`.
- Sau khi save appointment, gửi notification cho doctor của appointment.
- Notification phải được persist vào DB qua `NotificationService`.
- Dùng `NotificationType.NEW_APPOINTMENT`.
- Kênh gửi cho doctor là `WEB_SOCKET`.
- Nội dung nên có patient name, thời gian hẹn, loại tư vấn, link điều hướng nếu có.
- Nếu doctor không tồn tại hoặc không map được user, xử lý an toàn và log rõ ràng.

2. Doctor chuyển prescription sang pharmacy
- Tìm đúng điểm sau khi `transferPrescription(...)` tạo `PharmacyOrder` thành công.
- Sau khi save order, gửi notification realtime cho pharmacy.
- Notification phải được persist vào DB qua `NotificationService`.
- Dùng `NotificationType.NEW_ORDER`.
- Kênh gửi cho pharmacy là `WEB_SOCKET`.
- Nội dung nên có order number, patient name, prescription/order context, link điều hướng nếu có.
- Nếu pharmacy không map được user, xử lý an toàn và log rõ ràng.

3. Order status update
- Tìm đúng điểm sau khi `updateOrderStatus(...)` lưu trạng thái mới thành công.
- Gửi notification cho patient của order.
- Notification phải được persist vào DB qua `NotificationService`.
- Dùng `NotificationType.ORDER_STATUS`.
- Nếu hệ thống hiện tại đang ưu tiên patient mobile push, có thể cân nhắc:
  - gửi `MOBILE_PUSH` nếu patient có token active
  - hoặc gửi `WEB_SOCKET` nếu patient đang dùng web client
  - hoặc hỗ trợ cả hai nếu kiến trúc hiện tại cho phép
- Nội dung phải nêu rõ status cũ, status mới, order number, và action URL hợp lý.
- Phải đảm bảo không gửi notification nếu update status thất bại hoặc transaction bị rollback.
- Không tạo duplicate notification nếu status không đổi hoặc request bị retry.

4. Appointment bị hủy
- Tìm đúng điểm sau khi `cancelAppointment(...)` cập nhật trạng thái hủy thành công.
- Sau khi save appointment, gửi notification realtime cho doctor của appointment qua WebSocket/STOMP.
- Notification phải được persist vào DB qua `NotificationService`.
- Dùng `NotificationType.CANCEL_APPOINTMENT`.
- Kênh gửi cho doctor là `WEB_SOCKET`.
- Nội dung nên có patient name, thời gian appointment, lý do hủy, người hủy (patient/doctor), và action URL nếu có.
- Nếu doctor không map được user, xử lý an toàn và log rõ ràng.

Ràng buộc kỹ thuật

- Giữ nguyên logic business hiện tại, không làm hỏng luồng tạo appointment và order.
- Ưu tiên gọi notification sau khi entity đã được save thành công.
- Reuse `NotificationService.sendWebSocketNotification(...)` và `NotificationService.sendMobilePushNotification(...)` thay vì viết logic gửi mới.
- Nếu cần, bổ sung helper method nhỏ để map `User` từ Doctor/Pharmacy/Patient.
- Nếu cần, bổ sung field hoặc mapping tối thiểu cho payload notification response, nhưng không phá contract hiện có.
- Không chỉnh frontend.
- Không thay đổi behavior ngoài 4 luồng nêu trên.
- Không tạo duplicate notification khi retry hoặc khi trạng thái không thay đổi.
- Nếu gửi notification cần phụ thuộc vào transaction, hãy đảm bảo chỉ phát sau khi dữ liệu đã được commit thành công hoặc xử lý theo cách không gây mismatch giữa DB và realtime push.

Những thứ cần kiểm tra trước khi code

- Doctor entity có liên kết tới `User` chưa, lấy user để gửi notification.
- Pharmacy entity có liên kết tới `User` chưa, lấy user để gửi notification.
- Patient entity có liên kết tới `User` chưa, lấy user để gửi notification.
- `NotificationService.sendWebSocketNotification(...)` đang lưu DB trước rồi mới push websocket, giữ nguyên pattern này.
- `NotificationRepository` và entity `Notification` có đủ field cho `actionUrl`, `relatedId`, `appointmentId` chưa.
- Nếu `NotificationType` hoặc `NotificationChannel` thiếu giá trị nào cần dùng, hãy bổ sung cẩn thận và đồng bộ comment/doc.
- Kiểm tra xem endpoint/service hiện tại có đang dùng `@Transactional` theo cách có thể làm notification bị phát trước rollback hay không.

Deliverables mong muốn

1. Code cập nhật trong các service backend cần thiết.
2. Nếu cần, cập nhật enum hoặc helper liên quan.
3. Không phá compile.
4. Có log rõ ràng cho các nhánh gửi notification thành công/thất bại.
5. Nếu có test hiện hữu, bổ sung hoặc cập nhật test cho 4 luồng này.

Tiêu chí hoàn thành

- Appointment mới tạo xong thì doctor nhận được notification realtime.
- Doctor chuyển prescription sang pharmacy xong thì pharmacy nhận được notification realtime.
- Pharmacy update order status xong thì patient nhận được notification tương ứng.
- Appointment bị hủy xong thì doctor nhận được notification realtime.
- Notification đều được lưu vào DB và đi qua service notification hiện tại.
- Không còn call-site nghiệp vụ nào bị bỏ sót cho 4 luồng trên.

Hãy bắt đầu bằng việc xác định chính xác entity nào là recipient cho từng luồng và chèn notification vào đúng điểm sau commit/save của từng nghiệp vụ.