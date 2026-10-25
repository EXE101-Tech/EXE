# Nhắc chốt kèo, giữ chỗ có hạn và dự bị

Chủ phòng Premium bật **Nhắc chốt kèo & tìm người thay** khi tạo phòng trên web.
Thành viên miễn phí vẫn tham gia, xác nhận và nhận suất dự bị được. Quy định được
chụp trong `match_trust_sessions.policy.seat_holds_enabled`; phòng cũ mặc định tắt,
không tự gán hạn hoặc thu hồi các chỗ đã duyệt trước đây.

## Quy tắc

- Người xin vào phải đọc và đồng ý quy định giữ chỗ; đây chưa phải cam kết sẽ đến.
- Khi được duyệt, người chơi thấy hạn xác nhận trong thông báo, thẻ phòng và màn điểm danh.
- Thông thường hạn là 2 giờ trước giờ chơi, nhưng người được duyệt luôn có ít nhất
  15 phút khi còn trên 1 giờ, hoặc 5 phút khi còn 30–60 phút. Sát giờ chủ phòng
  cần xem giờ dự kiến đến và duyệt trực tiếp; giữ chỗ sau duyệt có hạn 5 phút.
- Nhắc lúc trước 4 giờ và trước hạn thông thường 30 phút. Chỉ nhắc người chưa
  xác nhận; mỗi mốc chỉ gửi một lần cho mỗi hạn. Chốt tình hình cho chủ phòng
  lúc trước 2 giờ. Không gửi bù những mốc đã qua.
- Hết hạn: `EXPIRED`, mở lại suất, giữ audit và thông báo. Không tạo cam kết,
  không tính hủy sát giờ/vắng không báo, không bắt gửi phản hồi sau buổi.
- Xác nhận rồi thì bỏ hạn giữ chỗ. Bỏ qua thông báo nhắc không mất chỗ.
- Chủ phòng không bị thu hồi quyền/chỗ do chưa xác nhận.
- Đổi điều kiện buổi chơi yêu cầu xác nhận lại và cấp hạn mới theo lịch mới.
- Buổi hủy/gỡ dừng toàn bộ nhắc, thu hồi chỗ và mời tự động.

## Dự bị và lời mời

`POST /gamerooms/{id}/waitlist` nhận `MatchJoinRequest`, gồm đồng ý quy định,
`terms_version` và giờ dự kiến đến nếu còn dưới 30 phút. Danh sách `WAITLISTED`
được ưu tiên theo thứ tự đăng ký. Chỉ mời khi có chỗ thực sự; chưa trả lời nhắc
không tạo suất mới trước khi hết hạn giữ chỗ đã công bố.

Mỗi suất chỉ được giữ bởi một lời mời đang hiệu lực. Người nhận có 15 phút khi
còn trên 1 giờ, hoặc 5 phút khi còn tối đa 1 giờ. Hết hạn/từ chối thì chuyển lượt,
không ảnh hưởng uy tín. `invite-response ACCEPT` trong phòng bật tính năng này
yêu cầu `accepted_policy=true` và `terms_version` mới nhất; nhận chỗ và ghi nhận
cam kết trong cùng transaction. Dưới hoặc đúng 30 phút không gửi lời mời tự động
mới; lời mời đã gửi vẫn có hiệu lực đến hạn đã công bố.

Hết dự bị thì dùng ứng viên cùng khu vực hoạt động, môn và trình độ. Chưa có
ứng viên thì thông báo chủ phòng. Mọi thay đổi sức chứa dùng khóa hàng phòng,
tính cả chỗ đã duyệt và lời mời còn hạn, tránh duyệt chen vào suất đang mời.

Worker hiện có chạy mỗi 60 giây. Hết hạn được kiểm tra lại khi nhận lời mời/xác
nhận nên không thể nhận chỗ trễ bằng cách tránh mở danh sách phòng. Đọc danh sách
cũng đối soát hạn; thời điểm thông báo/hiển thị tự cập nhật phụ thuộc chu kỳ worker
và polling. Chưa bổ sung gửi push ngoài hệ thống thông báo hiện có.

## Triển khai

Chạy `migration_seat_holds_waitlist.sql` trước khi khởi động API cập nhật. Migration
chỉ thêm ba cột và index; không thay đổi membership hoặc cam kết cũ. Không chạy
migration trên database thật trong quá trình phát triển. API cũ không hiểu
`WAITLISTED`; trước khi rollback cần tắt tạo phòng có tính năng này và xử lý
các suất/lời mời đang có hạn.

Kiểm thử: `.venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py" -v`
tại thư mục `server/`; dùng SQLite tạm, không kết nối database ứng dụng thật.
Phạm vi thay đổi là web trong `client/` và API; thư mục `mobile/` giữ nguyên.

Kiểm tra trình duyệt: `.venv/Scripts/python.exe tests/seat_holds_browser.py --artifacts <folder>`
tại `server/`. Script mở Chrome headless, dùng API SQLite tạm và Vite trên loopback,
chặn yêu cầu ra ngoài và tự dừng server khi xong. Thêm `--inspect` để xem DOM trước.
