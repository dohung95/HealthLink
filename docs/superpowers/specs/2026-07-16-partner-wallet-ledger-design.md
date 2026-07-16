# Partner Wallet Ledger Design

## Mục tiêu

Chuẩn hóa lịch sử ví Doctor và Pharmacy thành một dòng thời gian tài chính dễ hiểu, trong đó tiền vào, tiền rút, tiền trả lại do payout thất bại và tiền bị thu hồi do patient refund là các sự kiện độc lập. UI không hiển thị `CommissionTransaction.SETTLED` như một khoản cộng tiền và không liên kết số tiền rút tùy ý với từng commission transaction.

## Mô hình nghiệp vụ

- `EARNING / PENDING`: khoản thu nhập đã ghi nhận nhưng chưa tác động số dư vì appointment/order chưa hoàn thành.
- `EARNING / VESTED`: khoản thu nhập đã được cộng vào số dư khả dụng đúng một lần.
- `WITHDRAWAL / PROCESSING`: yêu cầu rút đã giữ chỗ và trừ số dư khả dụng; PayPal chưa xác nhận kết quả cuối.
- `WITHDRAWAL / COMPLETED`: PayPal xác nhận payout thành công; không thay đổi số dư lần nữa.
- `WITHDRAWAL / FAILED`: PayPal xác nhận payout thất bại; entry rút giữ nguyên để audit.
- `RETURN / RETURNED`: entry dương được tạo đúng một lần để trả số tiền của withdrawal thất bại về ví.
- `REFUND / REFUNDED`: entry âm do hệ thống hoàn tiền cho patient; số dư partner được phép âm.

Tiền trong ví là số dư tổng có tính thay thế lẫn nhau. Withdrawal không phân bổ vào các CTX cụ thể. Khi số dư âm do `REFUNDED`, các khoản `VESTED` mới tiếp tục cộng vào số dư và tự bù phần âm trước khi partner có thể rút tiếp.

## Dữ liệu và tính nhất quán

Tạo `PartnerWalletEntry` làm ledger bất biến về chuyển động số dư, với type, status, signed amount, partner, các reference tùy chọn và `idempotencyKey` duy nhất. CTX, STL và Payment vẫn là dữ liệu nguồn nghiệp vụ; ledger cung cấp lịch sử ví thống nhất cho partner và audit số dư.

Mọi thay đổi số dư và ledger tương ứng phải chạy trong cùng database transaction với pessimistic lock trên Doctor/Pharmacy. `PENDING` không đổi số dư; `VESTED`, giữ chỗ withdrawal, `RETURNED` và `REFUNDED` mỗi loại chỉ áp dụng số dư đúng một lần thông qua idempotency key.

## Payout PayPal

Khi gửi withdrawal, hệ thống tạo STL và ledger entry `PROCESSING`, trừ số dư khả dụng, rồi gọi PayPal ngoài transaction giữ lock. `payoutBatchId` được lưu ở cột riêng. Trạng thái PayPal chưa kết thúc không được ánh xạ thành `COMPLETED`.

Job reconciliation truy vấn các STL `PROCESSING` có batch ID và cập nhật chính withdrawal entry. Chỉ khi PayPal xác nhận thất bại mới cập nhật `FAILED`, cộng lại số dư và tạo `RETURNED`. Timeout hoặc kết quả không xác định phải giữ `PROCESSING` để tránh vừa hoàn tiền vào ví vừa để payout bên PayPal tiếp tục chạy.

## API và UI

Thêm endpoint partner wallet history có phân trang và filter theo search, type, status và date range. Các endpoint CTX/STL cũ được giữ tương thích cho admin và mobile.

Danh sách web Doctor và Pharmacy dùng ledger endpoint:

- Pending: dấu `+`, warning, icon đồng hồ.
- Vested: dấu `+`, success, icon check.
- Withdrawal: dấu `-`, amount/icon/accent đỏ; completed dùng badge trung tính `Withdrawn`.
- Failed withdrawal: số tiền âm làm mờ/gạch và badge đỏ.
- Returned: dấu `+`, icon quay lại ví, badge `Returned`.
- Refunded: dấu `-`, màu đỏ, mô tả patient refund.

Filter type gồm `All`, `Earnings`, `Withdrawals`, `Adjustments`; `RETURN` và `REFUND` thuộc Adjustments. Không hiển thị CTX `SETTLED` trong partner history.

## Migration và tương thích

Migration backfill idempotent tạo ledger entries từ CTX/STL hiện có. CTX `PENDING` và `VESTED` trở thành earning entries; CTX `REFUNDED` chỉ tạo refund entry âm khi `VestedAt` chứng minh khoản đó từng vào ví; CTX `SETTLED` không tạo entry dương. STL tạo withdrawal entries theo trạng thái hiện có. Không suy diễn `RETURNED` cho các STL `FAILED` cũ nếu không chứng minh được số dư từng bị giữ chỗ.

`pendingSettlement` tiếp tục là số dư khả dụng authoritative trong giai đoạn này và được phép âm. API có thể đặt tên response là `availableBalance` nhưng giữ `pendingBalance` như alias tương thích.

## Tiêu chí chấp nhận

- Không còn cặp CTX `SETTLED` dấu cộng và STL `COMPLETED` dấu trừ gây nhầm trong partner UI.
- Một withdrawal chỉ có một item chính được cập nhật `PROCESSING → COMPLETED/FAILED`.
- Failed payout tạo đúng một `RETURNED` entry và hoàn số dư đúng một lần kể cả khi reconciliation retry.
- Patient refund có thể làm số dư âm; thu nhập vested tiếp theo bù số âm; withdrawal bị khóa khi số dư không đủ điều kiện.
- Doctor và Pharmacy web có cùng mapping, filter và hành vi phân trang.
