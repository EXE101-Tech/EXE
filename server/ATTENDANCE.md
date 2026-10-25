# Attendance confirmation and reputation (issue #44)

Phạm vi: web trong `client/` và API. Xác nhận/check-in/uy tín cơ bản không yêu cầu Premium.

## Luồng sử dụng

1. Chủ phòng tạo buổi, người chơi xin tham gia hoặc nhận lời mời, chủ phòng duyệt.
2. Chủ phòng mở **Điểm danh**, người chơi mở **Xác nhận & check-in**. Mỗi người đọc lịch, địa điểm, chi phí, tích đồng ý và chọn **Tôi sẽ tham gia**. Được duyệt chưa phải đã xác nhận tham gia.
3. Trong khoảng check-in (từ giờ bắt đầu đến 30 phút sau giờ kết thúc, để người chơi xong vẫn kịp nhập mã), chủ phòng đã cam kết mở mã 6 số, đưa cho người có mặt. Người chơi đã cam kết nhập mã bằng tài khoản của mình.
4. Từ giờ bắt đầu, người tham gia phản hồi buổi có diễn ra và bản thân có mặt không, rồi xác nhận những người mình trực tiếp gặp tại sân. Mỗi người cần ít nhất 2 người khác xác nhận; phòng thực tế chỉ có 2 người dùng ngưỡng 1. Có thể tính chủ phòng, không tính chính mình. Giao diện hiện tiến độ và tên người đã xác nhận.
   Người đã được duyệt nhưng chưa xác nhận trước buổi hoặc chưa nhập mã vẫn có thể đến chơi. Sau buổi, chọn **Gửi khai báo bổ sung**, rồi nhận đủ xác nhận chéo. Kết quả ghi rõ **Tham dự đã xác minh bổ sung**; không tạo lại cam kết trước buổi hoặc check-in bằng mã.
5. Người chơi xem kết quả/lý do trong **Tìm trận → Buổi tôi đã tham gia → Xem kết quả**. Thông báo điểm danh cũng mở trực tiếp màn này.
6. Quản trị viên vào **Điểm danh & uy tín**, đối chiếu bằng chứng, chọn kết quả và ghi lý do. Người bị báo vắng được thông báo và có thể phản hồi tiếp.

Đổi giờ/ngày, địa điểm, chi phí, môn hoặc sân làm mất hiệu lực cam kết và check-in hiện tại; lịch sử cũ vẫn được lưu. Người chơi cần đọc và xác nhận lại.

Giao diện chỉ hiện thao tác phù hợp với từng bước: xác nhận tham gia, check-in, kết quả sau buổi. Quy định và lịch sử được thu gọn. Người chơi đã check-in không còn thấy nút hủy tham gia; chủ phòng có luồng **Hủy buổi chơi** riêng với xác nhận hủy cho tất cả thành viên. Thông tin được tải lại mỗi 15 giây và khi quay về cửa sổ, giữ nội dung đang nhập. Sau khi chủ phòng mở mã check-in, mã tự đổi mỗi 60 giây khi màn hình còn mở. Mã cũ hết hiệu lực sau tối đa 60 giây; dừng tạo mã khi hết buổi, hủy buổi hoặc đóng màn hình. Đóng rồi mở lại cần tạo mã mới.

Chi phí chấp nhận `50`, `50.000`, `50000` cho 50.000đ; dữ liệu VND gửi lại khi sửa phòng không bị nhân thêm 1.000. Giá đã lưu sai trước đây cần chủ phòng sửa lại, không tự suy đoán giá dự định.

Bài đăng làm nổi bật ngày giờ, phí mỗi người và số chỗ còn lại. **Quản lý phòng** chia hai tab **Chờ duyệt** và **Thành viên**, hiển thị số người gồm chủ phòng đúng một lần. Chủ phòng xem lời nhắn trước khi duyệt, không thể duyệt quá sức chứa; gỡ thành viên cần xác nhận ngay tại dòng người đó. Trạng thái xác nhận/check-in được tải lại mỗi 15 giây và khi quay về cửa sổ. Nút **Điểm danh & check-in** mở luồng điểm danh riêng; hủy buổi nằm trong **Tùy chọn khác** với xác nhận rõ tác động tới cả phòng.

Danh sách **Người tham gia** luôn hiển thị cho chủ phòng/admin, có avatar chữ cái, nhãn trạng thái và số người đã check-in. Dòng của chính người xem đứng đầu, có nền và viền riêng cùng nhãn **Bạn** nổi bật. Danh sách và bộ đếm chỉ tính thành viên đang được duyệt (`APPROVED`), không trộn người đang chờ, đã rời hoặc bị gỡ. Lịch sử cho chủ phòng tập trung vào thành viên hiện tại và thay đổi của buổi chơi; mỗi người vẫn xem được lịch sử của chính mình sau khi rời. Lịch sử ghi rõ tên người thực hiện và người liên quan, chia theo ngày, mới nhất trước, hiển thị 8 hoạt động trước rồi cho mở thêm trong tối đa 50 hoạt động gần nhất. Các lần tạo/đổi mã không xuất hiện trong danh sách này và được lọc trước giới hạn 50. Bản ghi gỡ thành viên bị trùng với cập nhật đăng ký được gộp; một lần đổi lịch cho nhiều người chỉ hiện một hoạt động. Dữ liệu gốc vẫn giữ trong audit; admin có danh sách hồ sơ xem xét riêng để không làm mất bằng chứng của người đã rời.

API cam kết yêu cầu `terms_version` từ màn đọc thông tin. Nếu chủ phòng sửa điều kiện trong lúc người chơi đang đọc, server từ chối phiên bản cũ và web tải thông tin mới để xác nhận lại.

## Hai loại kết quả độc lập

- Trạng thái đăng ký phòng vẫn dùng `OPEN/FULL/CLOSED/CANCELLED`.
- Xác minh buổi dùng `UNVERIFIED/OCCURRED/CANCELLED/DISPUTED`.
- Hồ sơ từng người phân biệt chưa cam kết, đã cam kết, chủ phòng gỡ, hủy tham gia, check-in, phản hồi, kết quả kiểm duyệt.
- Hết giờ hoặc đóng phòng không chứng minh buổi đã diễn ra.
- MVP xác minh `OCCURRED` khi chủ phòng và đủ số người khác chủ phòng cùng phản hồi có diễn ra và có mặt, kèm check-in đối chiếu hoặc mỗi người đủ xác nhận chéo. Phản hồi mâu thuẫn chuyển `DISPUTED`. Chỉ chủ phòng trả lời thì giữ `UNVERIFIED`.
- Tự động ghi nhận một người `ATTENDED` khi vẫn là người được duyệt, tự phản hồi có mặt, buổi đã xác minh và đủ xác nhận chéo từ tài khoản khác. Mặc định cần 2 người; phòng chỉ có 2 thành viên được duyệt (tính cả chủ phòng) cần 1 người còn lại. Sức chứa tối đa của phòng không quyết định ngoại lệ này. Số thành viên được chụp khi bắt đầu nhận phản hồi sau buổi; xóa tài khoản về sau không tự hạ ngưỡng. Người thiếu cam kết hoặc check-in được đánh dấu `supplemental_attendance`, giữ nguyên dữ liệu thiếu và xác minh bằng bằng chứng chéo.
- Người xác nhận chéo phải là thành viên đang được duyệt và đã phản hồi có mặt, bao gồm người khai báo bổ sung. Không tự xác nhận; cùng một người gửi lại chỉ tính một lượt. Bấm lại để bỏ xác nhận, không được coi là báo vắng. Phản hồi/điều kiện thay đổi làm bằng chứng cũ không còn hợp lệ. Không đủ xác nhận giữ `UNVERIFIED`, không tự trừ uy tín; admin vẫn có thể đối chiếu và quyết định có lý do.
- Thiếu check-in không tự thành vắng. `NO_SHOW` luôn cần admin xét duyệt, chỉ áp dụng với cam kết còn hiệu lực, buổi đã xác minh và chưa check-in. Admin có thể xác nhận tham dự sau đối chiếu thủ công nếu người chơi quên check-in.
- Phản hồi đang tranh chấp tạm loại kết quả liên quan khỏi uy tín; phản hồi về việc buổi có diễn ra có thể tạm loại cả buổi. Quyết định admin có lý do và lịch sử, không cộng/trừ theo số lần gọi API.
- Chủ phòng hủy buổi không phạt người chơi. Chủ phòng gỡ thành viên không bị tính là người đó tự hủy.

Mã có thể bị chia sẻ, nhiều tài khoản có thể thông đồng. Đây là bằng chứng đối chiếu cho MVP, chưa bảo đảm hiện diện tuyệt đối. Cần thử với vài chủ kèo và đối chiếu thực tế trước khi tự động hóa xử phạt.

## Quy định phiên bản `attendance-v3`

Quy định được chụp khi tạo phòng (phòng cũ: khi có thao tác mới đầu tiên). Mỗi cam kết lưu cả quy định và các điều kiện đã đọc. Đổi cấu hình hạn thời gian/ngưỡng xác minh buổi chỉ ảnh hưởng phòng tạo sau đó. Ngưỡng xác nhận chéo 2 người (ngoại lệ phòng 2 người: 1) áp dụng cho kết quả tự động chưa được admin quyết định, kể cả phòng cũ; không suy ra lượt xác nhận chéo từ báo cáo cũ của chủ phòng. Kết quả tự động cũ thiếu bằng chứng chéo sẽ trở lại chờ đối chiếu. Quyết định admin có lý do tiếp tục được giữ. `REPUTATION_MINIMUM_SAMPLES` là ngưỡng hiển thị điểm hiện hành trên hồ sơ.

| Biến môi trường | Mặc định | Khoảng |
| --- | --- | --- |
| `ATTENDANCE_CONFIRM_AFTER_START_MINUTES` | 30 phút sau giờ bắt đầu | 0–120 |
| `ATTENDANCE_LATE_CANCEL_MINUTES` | 120 phút trước giờ bắt đầu | 0–1440 |
| `ATTENDANCE_AFTER_END_MINUTES` | 30 phút sau giờ kết thúc. Check-in bằng mã và xác nhận chéo mở từ giờ bắt đầu đến mốc này rồi đóng hẳn. Phản hồi của người chơi và báo vắng của chủ phòng không có hạn đóng | 0–120 |
| `ATTENDANCE_REQUIRED_WITNESSES` | 1 người ngoài chủ phòng | 1–10 |
| `REPUTATION_MINIMUM_SAMPLES` | 5 kết quả đủ điều kiện | 1–100 |

Hạn cam kết không muộn hơn giờ kết thúc. Hủy đúng mốc 120 phút là hủy sớm; sau mốc đó là hủy sát giờ. Không cam kết kịp hạn không tạo hình phạt. Mã mới có thời hạn cố định 1 phút, áp dụng cả khi mở mã trong phòng cũ có quy định 10 phút; không còn dùng biến `ATTENDANCE_CODE_TTL_MINUTES`. Mã hết hạn muộn nhất lúc đóng (kết thúc + 30 phút). Sau mốc này không nhận thêm check-in hay xác nhận chéo; ai chưa đủ bằng chứng thì buổi giữ `UNVERIFIED`, không trừ uy tín. Phản hồi của người chơi và báo vắng của chủ phòng vẫn nhận sau mốc này. Màn nhắc phản hồi chỉ hiện sau khi buổi kết thúc. Phòng cũ còn lưu `checkin_before_minutes` cũng dùng khung giờ mới; mở mã mới vô hiệu mã cũ và không lặp lại ngay mã trước. Sai 5 lần khóa nhập 5 phút theo tài khoản/phòng. Mã chỉ trả một lần khi mở, database giữ hash kèm salt, không lưu mã trong audit/API đọc.

## Công thức và đo lường

Trong 180 ngày theo giờ kết thúc buổi, gọi `A` là tham dự đã đối chiếu, `N` là vắng không báo đã kiểm duyệt:

```text
sample_count = A + N
score = round(100 * A / (A + N))
```

Chỉ hiển thị điểm khi đủ ngưỡng mẫu hiện hành; trước đó là **Chưa đủ dữ liệu**. Điểm tách khỏi trình độ/rating. Premium không tăng điểm. Đây là tỷ lệ trong kết quả đã đối chiếu, không phải xác suất một người chắc chắn đến.

`eligible_commitments` đếm cam kết còn hiệu lực trong buổi đã xác minh, đã kết thúc trong 180 ngày, không tranh chấp/miễn trách nhiệm. `verified_attendance_rate = 100*verified_committed_attendance/eligible_commitments`, `no_show_rate = 100*N/eligible_commitments`. Lượt đã xác minh bổ sung nhưng không có cam kết trước buổi vẫn tính vào tổng `verified_attended` và uy tín, không giả lập một cam kết để đưa vào tỷ lệ cam kết. `supplemental_attended` cho biết số lượt được đối chiếu bổ sung. Cam kết thiếu phản hồi có thể nằm trong mẫu số nhưng chưa được quy thành có mặt hay vắng. Hai tỷ lệ trả `null` khi mẫu số bằng 0.

Hủy sớm/sát giờ được đếm riêng từ sự kiện hủy trong 180 ngày, không giảm điểm và không mất khi xin vào lại. Lượt tham dự không cộng lặp khi sửa điểm danh/gửi lại request. Hồ sơ giữ riêng số buổi đã mở và buổi do chính người đó hủy; chủ mới hủy sau chuyển chủ được ghi đúng người. Thống kê hoạt động theo môn dùng tổng lượt đã xác minh trong toàn bộ thời gian cộng dữ liệu `UserSport.games_played` có sẵn, độc lập cửa sổ uy tín.

## Migration và dữ liệu cũ

Chạy `migration_attendance_reputation.sql` trên PostgreSQL trước khi đưa code mới vào phục vụ. File chỉ tạo ba bảng và index có `IF NOT EXISTS`, trong một transaction; không sửa/xóa dữ liệu cũ. Chưa chạy migration trên database của dự án trong quá trình phát triển này.

- `match_trust_sessions`: quy định, mã đã hash, trạng thái buổi, người tổ chức/hủy.
- `match_attendance_records`: một hồ sơ hiện tại cho mỗi người/phòng, unique `(match_id,user_id)`.
- `match_trust_events`: lịch sử thao tác kèm nguồn, người, thời gian, điều kiện hoặc lý do.

`create_all` hiện có cũng tạo bảng còn thiếu khi khởi động; file SQL phục vụ triển khai có kiểm soát. Không backfill `ATTENDED/ABSENT` cũ thành uy tín. Phòng cũ thiếu bằng chứng giữ chưa xác minh, không cho cam kết hồi tố. Trường `MatchParticipant.attendance_status` giữ tương thích như báo cáo của chủ phòng; không dùng riêng trường này để tính uy tín.

Xác nhận chéo dùng sự kiện `PEER_REPORTED` trong bảng audit có sẵn, không cần thêm bảng hoặc migration mới. Lấy lượt mới nhất của từng cặp người xác nhận/người được xác nhận, kiểm tra đúng cam kết và phản hồi còn hiệu lực; không dùng giới hạn 50 sự kiện của giao diện để tính kết quả. API: `PUT /gamerooms/{match_id}/attendance/peers/{user_id}` với `{"attended": true}` để xác nhận, `false` để bỏ xác nhận. Thành viên được duyệt xem danh sách cùng chơi từ giờ bắt đầu; người đã rời chỉ xem được hồ sơ của mình như trước.

Rời phòng giữ membership `REJECTED` và audit; gỡ phòng giữ phòng/lịch sử, buổi chưa kết thúc chuyển hủy. Gỡ buổi đã diễn ra không xóa kết quả. Xóa tài khoản vẫn xóa dữ liệu theo luồng hiện có. Sao lưu trước triển khai; nếu rollback code cũ cần dừng thao tác rời/xóa phòng vì code cũ xóa vật lý dữ liệu này.

Các thay đổi dùng khóa hàng phòng trên PostgreSQL, giới hạn sức chứa và unique hồ sơ. Kiểm thử tự động hiện dùng SQLite, chưa xác nhận hành vi cạnh tranh thực tế trên PostgreSQL nhiều worker.

## Kiểm thử

Tại `server/`, cài `requirements-dev.txt`, rồi chạy:

```text
.venv/Scripts/python.exe -m unittest discover -s tests -p "test_*.py" -v
```

Kiểm thử trình duyệt dùng Chrome headless qua Playwright với database SQLite tạm, không import `app.main`, không kết nối database cấu hình thật:

1. Tại `server/`: `.venv/Scripts/python.exe tests/attendance_web_fixture.py` (API loopback :8018).
2. Tại `client/`: đặt `VITE_API_URL=http://127.0.0.1:8018/api`, chạy `npm run dev -- --host 127.0.0.1 --port 5178 --strictPort`.
3. Tại `server/`: `.venv/Scripts/python.exe tests/attendance_browser.py --artifacts <folder>`.
4. Dừng hai server khi xong. Khởi động lại fixture trước mỗi lượt chạy để có dữ liệu sạch. Các route `/test/*` chỉ tồn tại trong fixture này.

Để thử thủ công, đăng nhập bằng `host@sportgo.test`, `player@sportgo.test`, `witness@sportgo.test` hoặc `admin@sportgo.test`, cùng mật khẩu `SportGo123!`. Trang `http://127.0.0.1:8018/test/controls` có nút kết thúc buổi mẫu để thử điểm danh ngay sau check-in. Đồng hồ kiểm thử được giữ cố định cho đến khi bấm nút.

Kiểm tra production bundle tại `client/` bằng `npm run build`. Mobile chưa thay đổi.
