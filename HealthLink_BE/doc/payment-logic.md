HEALTHLINK - PAYMENT LOGIC HIỆN TẠI

Mục tiêu tài liệu:
- Ghi lại luồng payment hiện tại trong backend.
- Phân biệt rõ doanh thu của app và số tiền của Doctor/Pharmacy.
- Chỉ ra phần đã có và phần chưa được nối vào luồng thực thi.

1. TỔNG QUAN LUỒNG PAYMENT

Hiện tại hệ thống đang tách payment thành 3 lớp logic chính:
- Thanh toán của patient cho dịch vụ.
- Ghi nhận commission của hệ thống sau khi payment thành công.
- Rút tiền của Doctor/Pharmacy về PayPal.

Luồng dữ liệu chính:
- Patient thanh toán thành công.
- Hệ thống tạo `Payment` và cập nhật `Invoice` hoặc `PharmacyOrder`.
- Hệ thống tạo `CommissionTransaction` để lưu commission của app.
- Hệ thống cộng tiền cho Doctor/Pharmacy vào `totalEarnings` và `pendingSettlement`.
- Khi Doctor/Pharmacy rút tiền, hệ thống tạo `Settlement` và trừ vào `pendingSettlement`.

2. LUỒNG THANH TOÁN CHO DOCTOR

2.1. Tạo hóa đơn

Khi appointment đã hoàn tất, hệ thống tạo invoice bằng `FinanceService.generateInvoice(appointmentId)`.

Tiền trong invoice được tính từ:
- `Doctor.consultationFee`
- `PrescriptionHeader.totalAmount` cho tiền thuốc
- `PharmacyOrder.deliveryFee` cho phí giao hàng

Invoice được lưu vào bảng `Invoices` với các trường như:
- `amount`
- `status`
- `consultationFee`
- `medicineFee`
- `deliveryFee`
- `issueDate`
- `dueDate`

2.2. Thanh toán PayPal

API tạo đơn PayPal:
- `FinanceService.createPayPalOrder(...)`

API capture thanh toán:
- `FinanceService.capturePayPalPayment(...)`

Khi capture thành công:
- Tạo bản ghi `Payment`
- Cập nhật `Invoice.status = Paid`
- Cập nhật `Invoice.paidAt`
- Gọi `commissionService.processConsultationCommission(invoice)`

2.3. Ghi nhận commission cho Doctor

Trong `CommissionServiceImpl.processConsultationCommission(...)`:
- Tính platform fee theo cấu hình commission.
- Tạo `CommissionTransaction` với:
	- `sourceType = APPOINTMENT`
	- `recipientType = DOCTOR`
	- `grossAmount`
	- `commissionRate`
	- `commissionAmount`
	- `netAmount`
- Cộng tiền cho Doctor:
	- `Doctor.totalEarnings += netAmount`
	- `Doctor.pendingSettlement += netAmount`
- Ghi snapshot vào `Invoice`:
	- `platformFee`
	- `doctorEarning`
	- `commissionRate`

Kết luận cho Doctor:
- Flow này đã có và đang chạy end-to-end.

3. LUỒNG THANH TOÁN CHO PHARMACY

3.1. Logic đã có trong code

Hệ thống đã có method:
- `CommissionService.processPharmacyOrderCommission(pharmacyOrder)`

Trong method này:
- Tính commission cho đơn thuốc.
- Tạo `CommissionTransaction` với:
	- `sourceType = PHARMACY_ORDER`
	- `recipientType = PHARMACY`
- Cộng tiền cho Pharmacy:
	- `Pharmacy.totalEarnings += netAmount`
	- `Pharmacy.pendingSettlement += netAmount`
- Ghi snapshot vào `PharmacyOrder`:
	- `platformFee`
	- `pharmacyEarning`
	- `commissionRate`

3.2. Phần chưa thấy được nối vào flow payment

Trong luồng capture payment hiện tại, chỉ thấy gọi:
- `commissionService.processConsultationCommission(invoice)`

Chưa thấy call-site nào tự động gọi:
- `commissionService.processPharmacyOrderCommission(pharmacyOrder)`

Kết luận cho Pharmacy:
- Logic tính commission và cộng số dư đã có.
- Nhưng chưa thấy được gắn vào payment API hiện tại để chạy tự động sau thanh toán đơn thuốc.

4. LUỒNG RÚT TIỀN CỦA DOCTOR / PHARMACY

4.1. API rút tiền

Các API hiện có:
- `POST /api/payment/partner/{partnerId}/settle?type=DOCTOR`
- `POST /api/payment/partner/{partnerId}/settle?type=PHARMACY`

4.2. Cách xử lý

Trong `SettlementServiceImpl`:
- Kiểm tra số dư `pendingSettlement`.
- Kiểm tra email PayPal có khớp email đã đăng ký không.
- Tạo `Settlement` với trạng thái `PENDING`.
- Gọi PayPal Payouts API.
- Nếu thành công:
	- cập nhật `Settlement.status = COMPLETED`
	- cập nhật `Settlement.completedAt`
	- trừ số tiền khỏi `pendingSettlement`
- Nếu thất bại:
	- cập nhật `Settlement.status = FAILED`
	- ghi `notes`

4.3. Ý nghĩa số dư

- `totalEarnings`: tổng tiền đã kiếm được từ các giao dịch commission.
- `pendingSettlement`: phần tiền còn đang giữ trong hệ thống, chưa rút.

Khi rút tiền:
- chỉ `pendingSettlement` bị trừ.
- `totalEarnings` không bị giảm.

5. DOANH THU CỦA APP ĐANG ĐƯỢC LƯU Ở ĐÂU

Doanh thu của app là phần commission hệ thống giữ lại.

Các nơi lưu liên quan:
- `CommissionTransaction.commissionAmount`: phí nền tảng giữ lại trên từng giao dịch.
- `Invoice.platformFee`: snapshot commission của giao dịch tư vấn Doctor.
- `PharmacyOrder.platformFee`: snapshot commission của đơn thuốc Pharmacy.

Tổng doanh thu app trong báo cáo admin được tính từ bảng `CommissionTransactions`:
- `totalDoctorCommission` = tổng `commissionAmount` của `sourceType = APPOINTMENT`
- `totalPharmacyCommission` = tổng `commissionAmount` của `sourceType = PHARMACY_ORDER`
- `totalPlatformRevenue` = `totalDoctorCommission + totalPharmacyCommission`

API báo cáo admin hiện có:
- `GET /api/payment/admin/reports/revenue`

6. DOCTOR / PHARMACY CHƯA RÚT ĐƯỢC LƯU Ở ĐÂU

Số tiền của Doctor/Pharmacy chưa rút được lưu tại:
- `Doctor.totalEarnings`
- `Doctor.pendingSettlement`
- `Pharmacy.totalEarnings`
- `Pharmacy.pendingSettlement`

Ý nghĩa:
- `totalEarnings`: tổng tích lũy toàn thời gian.
- `pendingSettlement`: số dư còn lại có thể rút.

7. CÁC BẢNG / TRƯỜNG LIÊN QUAN NHẤT

7.1. App revenue
- `CommissionTransactions.commissionAmount`
- `CommissionTransactions.sourceType`
- `CommissionTransactions.recipientType`
- `Invoices.platformFee`
- `PharmacyOrders.platformFee`

7.2. Partner balance
- `Doctors.totalEarnings`
- `Doctors.pendingSettlement`
- `Pharmacies.totalEarnings`
- `Pharmacies.pendingSettlement`

7.3. Withdrawal history
- `Settlements.grossAmount`
- `Settlements.commissionAmount`
- `Settlements.netAmount`
- `Settlements.status`
- `Settlements.paymentMethod`
- `Settlements.paypalEmail`

8. KẾT LUẬN HIỆN TẠI

- Luồng payment cho Doctor đã hoàn chỉnh hơn: thanh toán thành công sẽ tự động ghi commission và cộng số dư cho Doctor.
- Luồng commission cho Pharmacy đã có implementation, nhưng chưa thấy được nối tự động từ payment flow hiện tại.
- Hệ thống đã phân biệt rõ doanh thu app và tiền của đối tác chưa rút.
- Doanh thu app nằm ở commission, còn tiền đối tác nằm ở `totalEarnings` và `pendingSettlement`.
