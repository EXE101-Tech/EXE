# SportGo – kiểm kê API và các phần còn thiếu

Đã đối chiếu màn hình React, service ở `client/src/shared/services/api.js`, các router FastAPI và schema database. Ứng dụng hiện giữ `/` làm landing/giới thiệu công khai thật; màn hình nghiệp vụ không dùng danh sách mẫu `INITIAL_*` nữa.

## Luồng đã nối với API/database

| Khu vực | API đang dùng | Ghi chú |
|---|---|---|
| Email/mật khẩu, hồ sơ | `/api/auth/login`, `/register`, `/logout`, `/me` GET/PUT, `/me/stats` | Không còn token giả. Google login chưa làm theo yêu cầu hiện tại. |
| Danh sách sân, môn thể thao | `/api/courts`, `/venues`, `/venues/{id}`, `/nearby`, `/sports` | Chi tiết sân tải sân con thật, giá và chủ sân từ API. |
| Đặt sân | `/api/bookings/availability`, `/bookings`, `/bookings/batch`, `/bookings/{id}`, `/bookings/{id}/cancel` | Chọn nhiều khung giờ được lưu trong một transaction; API kiểm tra giao nhau, sân còn hoạt động và giờ đã qua. Trang lịch sử `/my-bookings` đọc/hủy đơn thật. |
| Chủ sân | `/api/courts/owner/status`, `/register`, `/registration`, `/venues` GET/POST, `/venues/{id}` PUT/DELETE | Tạo/sửa/gỡ sân và quyền chủ sân lưu DB; không thu phí tự động. |
| Lịch sân / đặt bên ngoài | `/api/courts/owner/venues/{id}/schedule`, `/schedule/blocks` POST/DELETE | Chủ sân ghi tay lịch nhận trực tiếp; lịch đó khóa khung giờ đặt online. Chưa có kết nối tự động với lịch bên thứ ba. |
| Phòng chơi / tìm người | `/api/gamerooms` CRUD/join/leave/duyệt | Dữ liệu phòng, thành viên, lịch lấy từ backend. |
| Team/CLB | `/api/teams` CRUD/join/leave/members/reviews | Thành viên, yêu cầu tham gia và đánh giá CLB lưu DB. |
| Diễn đàn tìm người chơi | `/api/lfg/posts` CRUD/join/leave | Tác giả có thể sửa nội dung và ảnh; số người do server kiểm soát. |
| Chat / bạn bè | `/api/chat/conversations`, `/messages` GET/POST; `/users` search; `/friends` và `/friends/requests` | Tìm tài khoản, gửi/chấp nhận/thu hồi lời mời, mở chat với bạn bè; tin nhắn polling (chưa realtime socket). |
| Ảnh hồ sơ / bài đăng | `/api/storage/images` POST; `/api/storage/media/{key}` GET | Upload ảnh xác thực qua backend, object key ngẫu nhiên; backend proxy ảnh nên không lộ credential hay yêu cầu bucket public. Avatar, ảnh bìa và ảnh bài tìm người dùng URL lưu DB. Lượt ghi thử hiện bị GCS từ chối vì billing account của project đã đóng; cần bật billing hoặc thay bucket/credential trước khi ảnh hoạt động. |
| Tìm kiếm toàn cục | `/api/search?q=...` | Trả kết quả thật theo nhóm sân, phòng chơi, CLB, bài tìm người; ô tìm kiếm web/mobile đã gọi API và chuyển đến tab có lọc kết quả. |
| Bản đồ | `/api/courts/nearby` | Tọa độ người dùng, tìm địa chỉ và reverse geocoding dùng browser/Nominatim/IP geolocation, không phải dịch vụ SportGo. |

## Còn thiếu cấu hình hoặc endpoint/dịch vụ

- Google OAuth: chưa triển khai; cần cấu hình OAuth client và xác minh token phía server.
- Thanh toán Premium và phí chủ sân 150.000đ/tháng: chưa có payment provider, webhook hay subscription/renewal; giao diện hiện nói rõ chưa thu phí.
- Đồng bộ lịch ngoài tự động: hiện chủ sân nhập lịch ngoài thủ công; muốn đồng bộ trực tiếp cần API/quyền truy cập của nhà cung cấp đang dùng.
- Thông báo: nút chuông chưa có notification inbox/event producer; chưa có push/email/SMS.
- Ảnh sân/CLB tải lên: chưa nối giao diện upload (ảnh đang dùng artwork cục bộ theo môn khi không có URL). Luồng upload avatar/ảnh bìa/bài tìm người đã có nhưng đang bị chặn bởi billing GCS đóng.
- Đánh giá sân và yêu thích sân: chưa có bảng/API; giao diện không được phép giả điểm đánh giá. Đánh giá Team/CLB đã có.
- Quên mật khẩu: chưa có endpoint gửi liên kết/mã đặt lại.
- Một số CLB legacy không có `owner_id`; dữ liệu cũ được giữ, nhưng không thể tự suy ra ai có quyền quản lý nếu database không ghi chủ sở hữu.

## Trạng thái database của môi trường hiện tại

Kết nối PostgreSQL trong `server/.env` đã được xác minh. Với sự chấp thuận của người dùng, `migration_endpoint_coverage.sql` đã được áp dụng; các cột/bảng cần thiết đã được đối chiếu lại với ORM. Migration giữ các dòng legacy và backfill thông tin môn còn thiếu ở Team. Không đưa nội dung `.env`/credential vào log hoặc tài liệu.

## Kiểm tra hiện tại

- Python compile, SQLAlchemy mapper configuration và test đặt sân trên SQLite biệt lập: đạt; đã kiểm tra giao dịch nhiều khung giờ, xung đột đơn, xung đột batch và lịch bên ngoài không để lại ghi dở dang.
- `migration_social_images_friends.sql` đã áp dụng; truy vấn chỉ đọc xác nhận `user_profiles.cover_url` và bảng `friendships` tồn tại.
- Smoke test SQLite biệt lập: gửi/chấp nhận/tìm kiếm bạn bè, identity cuộc trò chuyện từ cả hai tài khoản, sửa bài chỉ bởi tác giả, lưu URL ảnh hồ sơ và kiểm tra signature ảnh: đạt.
- GCS metadata access thành công; ảnh PNG thử không được ghi vì Google trả `UserProjectAccountProblem` (billing account đóng), nên không có object thử nào được tạo. Bật lại billing hoặc đổi storage credentials/bucket là điều kiện để upload chạy thật.
- `npm run build`: đạt sau thay đổi; Vite còn cảnh báo bundle JavaScript lớn hơn 500 KB.
- `npm run build`: đạt; bundle chính khoảng 806 KB (minified), vượt ngưỡng cảnh báo 500 KB nhưng không chặn build.
- `npm run lint`: chưa đạt; còn nhiều lỗi lint trên các màn hình (unused imports, quy tắc React Hooks/Fast Refresh). Đây không phải lỗi build nhưng cần một đợt dọn lint riêng.
