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
| Diễn đàn tìm người chơi | `/api/lfg/posts` CRUD/join/leave | Số người được server cập nhật; không tin giá trị đếm gửi từ client. |
| Chat | `/api/chat/conversations`, `/messages` GET/POST | Tin nhắn lưu DB; UI đồng bộ bằng polling, chưa phải realtime socket. |
| Tìm kiếm toàn cục | `/api/search?q=...` | Trả kết quả thật theo nhóm sân, phòng chơi, CLB, bài tìm người; ô tìm kiếm web/mobile đã gọi API và chuyển đến tab có lọc kết quả. |
| Bản đồ | `/api/courts/nearby` | Tọa độ người dùng, tìm địa chỉ và reverse geocoding dùng browser/Nominatim/IP geolocation, không phải dịch vụ SportGo. |

## Còn thiếu cấu hình hoặc endpoint/dịch vụ

- Google OAuth: chưa triển khai; cần cấu hình OAuth client và xác minh token phía server.
- Thanh toán Premium và phí chủ sân 150.000đ/tháng: chưa có payment provider, webhook hay subscription/renewal; giao diện hiện nói rõ chưa thu phí.
- Đồng bộ lịch ngoài tự động: hiện chủ sân nhập lịch ngoài thủ công; muốn đồng bộ trực tiếp cần API/quyền truy cập của nhà cung cấp đang dùng.
- Thông báo: nút chuông chưa có notification inbox/event producer; chưa có push/email/SMS.
- Ảnh đại diện/ảnh bìa/ảnh sân/CLB tải lên: chưa có file-storage service; ảnh sân đang dùng artwork cục bộ theo môn khi không có URL.
- Đánh giá sân và yêu thích sân: chưa có bảng/API; giao diện không được phép giả điểm đánh giá. Đánh giá Team/CLB đã có.
- Quên mật khẩu: chưa có endpoint gửi liên kết/mã đặt lại.
- Một số CLB legacy không có `owner_id`; dữ liệu cũ được giữ, nhưng không thể tự suy ra ai có quyền quản lý nếu database không ghi chủ sở hữu.

## Trạng thái database của môi trường hiện tại

Kết nối PostgreSQL trong `server/.env` đã được xác minh. Với sự chấp thuận của người dùng, `migration_endpoint_coverage.sql` đã được áp dụng; các cột/bảng cần thiết đã được đối chiếu lại với ORM. Migration giữ các dòng legacy và backfill thông tin môn còn thiếu ở Team. Không đưa nội dung `.env`/credential vào log hoặc tài liệu.

## Kiểm tra hiện tại

- Python compile, SQLAlchemy mapper configuration và test đặt sân trên SQLite biệt lập: đạt; đã kiểm tra giao dịch nhiều khung giờ, xung đột đơn, xung đột batch và lịch bên ngoài không để lại ghi dở dang.
- Database migration và kiểm tra schema sau migration: đạt.
- 11 endpoint GET chạy thử đọc-only với database thật và ngữ cảnh người dùng: trả HTTP 200; ứng dụng đăng ký 57 API route dưới `/api` (62 route tổng, gồm health/OpenAPI/docs).
- `npm run build`: đạt; bundle chính khoảng 806 KB (minified), vượt ngưỡng cảnh báo 500 KB nhưng không chặn build.
- `npm run lint`: chưa đạt; còn nhiều lỗi lint trên các màn hình (unused imports, quy tắc React Hooks/Fast Refresh). Đây không phải lỗi build nhưng cần một đợt dọn lint riêng.
