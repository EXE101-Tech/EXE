import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'ntthanh14052005@gmail.com';
const cardClass = 'rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]';
const bodyClass = 'text-sm leading-6 text-slate-600 dark:text-slate-300';

// Each section has a title plus a paragraph (`text`), a bullet list (`items`: [label, content]), or both.
const sections = [
  {
    title: '1. Dữ liệu chúng tôi thu thập',
    items: [
      ['Tài khoản', 'email, tên hiển thị, mật khẩu (được lưu dạng mã hóa). Nếu đăng nhập bằng Google, chúng tôi nhận email và tên từ tài khoản Google của bạn.'],
      ['Hồ sơ thể thao', 'môn chơi, trình độ, khu vực hoạt động, ảnh đại diện và ảnh bìa bạn chọn.'],
      ['Nội dung bạn tạo', 'bài viết, bình luận, ảnh và video bạn tải lên, tin nhắn trò chuyện, thông tin phòng chơi và CLB, lịch đặt sân.'],
      ['Vị trí', 'chỉ khi bạn cho phép trên thiết bị (xem mục 2).'],
      ['An toàn cộng đồng', 'báo cáo, danh sách người bạn chặn, cảnh báo của quản trị viên, yêu cầu xóa tài khoản.'],
      ['Giao dịch Premium', 'mã giao dịch và ảnh chứng từ nếu bạn nâng cấp Premium qua website.'],
      ['Dữ liệu kỹ thuật cần cho hoạt động', 'mã đăng nhập (token) lưu an toàn trên thiết bị của bạn.'],
    ],
  },
  {
    title: '2. Quyền truy cập vị trí',
    text: 'Trên ứng dụng di động, SportGo chỉ dùng vị trí khi ứng dụng đang mở và sau khi bạn cho phép, khi bạn bấm "dùng vị trí hiện tại" lúc tạo phòng hoặc CLB, để điền sẵn địa chỉ. Chúng tôi không theo dõi vị trí khi ứng dụng chạy nền. Bạn có thể tắt quyền này bất cứ lúc nào trong Cài đặt của thiết bị.',
  },
  {
    title: '3. Mục đích sử dụng',
    text: 'Đăng nhập và quản lý tài khoản; kết nối người chơi, tạo phòng, CLB, đặt sân; hiển thị nội dung bạn đăng; trò chuyện; kiểm duyệt và giữ an toàn cộng đồng; xử lý giao dịch Premium; cải thiện độ ổn định của dịch vụ. SportGo không bán dữ liệu cá nhân của bạn và không hiển thị quảng cáo.',
  },
  {
    title: '4. Dịch vụ của bên thứ ba',
    text: 'Để vận hành, SportGo dùng các dịch vụ bên ngoài. Khi bạn dùng tính năng liên quan, một phần dữ liệu được gửi tới họ:',
    items: [
      ['Google Sign-In', 'xác thực đăng nhập bằng tài khoản Google.'],
      ['Tìm địa chỉ và đổi tọa độ thành địa chỉ', 'khi bạn gõ địa chỉ hoặc chọn một điểm trên bản đồ, ứng dụng gửi từ khóa tìm kiếm hoặc tọa độ tới OpenStreetMap Nominatim và BigDataCloud.'],
      ['Bản đồ', 'ứng dụng tải ô bản đồ từ OpenFreeMap (dữ liệu © OpenStreetMap contributors); nhà cung cấp này nhận địa chỉ IP và vùng bản đồ bạn xem.'],
      ['Máy chủ và lưu trữ', 'máy chủ chạy trên Google Cloud; ảnh và video được lưu trên Google Cloud Storage; cơ sở dữ liệu được lưu trên hạ tầng đám mây của nhà cung cấp dịch vụ cơ sở dữ liệu mà SportGo sử dụng.'],
      ['Website', 'được phục vụ qua Vercel.'],
    ],
    after: 'Mỗi bên có chính sách riêng. Chúng tôi chỉ chia sẻ dữ liệu cần thiết cho việc vận hành, hoặc khi pháp luật yêu cầu.',
  },
  {
    title: '5. Lưu trữ và bảo mật',
    text: 'Dữ liệu được truyền qua kết nối HTTPS. Chúng tôi giới hạn quyền truy cập dữ liệu cho người cần thiết để vận hành và kiểm duyệt. Không hệ thống nào an toàn tuyệt đối, nên bạn hãy bảo mật mật khẩu của mình.',
  },
  {
    title: '6. Thời gian lưu giữ',
    text: 'Chúng tôi lưu dữ liệu trong thời gian tài khoản còn hoạt động. Sau khi bạn xóa tài khoản, dữ liệu tài khoản và nội dung gắn với tài khoản được xóa ngay lập tức, bao gồm cả ảnh và video đã tải lên. Một số thông tin có thể được giữ lại trong thời gian cần thiết để giải quyết khiếu nại hoặc tuân thủ pháp luật.',
  },
  {
    title: '7. Quyền của bạn',
    text: 'Bạn có thể xem và chỉnh sửa hồ sơ, tắt quyền vị trí, báo cáo hoặc chặn người dùng, và xóa tài khoản:',
    items: [
      ['Trong ứng dụng', 'vào Hồ sơ, rồi chọn "Xóa tài khoản".'],
      ['Qua website', <>gửi yêu cầu tại <Link to="/account-deletion" className="font-bold text-brand-primary hover:underline">trang yêu cầu xóa tài khoản</Link>.</>],
    ],
    after: <>Bạn cũng có thể liên hệ <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-brand-primary hover:underline">{CONTACT_EMAIL}</a> để hỏi hoặc yêu cầu về dữ liệu của mình.</>,
  },
  {
    title: '8. Nội dung cộng đồng và kiểm duyệt',
    text: 'Bạn cần tuân thủ quy tắc cộng đồng khi đăng nội dung. Bạn có thể báo cáo bài viết, bình luận, người dùng, phòng hoặc CLB, và chặn người gây phiền. Quản trị viên có thể xem xét, gỡ nội dung hoặc cảnh báo, xóa tài khoản vi phạm.',
  },
  {
    title: '9. Độ tuổi',
    text: 'SportGo dành cho người từ 16 tuổi trở lên. Chúng tôi không cố ý thu thập dữ liệu của trẻ em dưới độ tuổi này; nếu phát hiện, chúng tôi sẽ xóa.',
  },
  {
    title: '10. Thay đổi chính sách',
    text: 'Khi có thay đổi quan trọng, chúng tôi sẽ cập nhật ngày ở đầu trang này và thông báo trong ứng dụng nếu cần.',
  },
];

export default function PrivacyPolicyPage() {
  return <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 text-slate-800 dark:text-slate-100 sm:px-8">
    <Link to="/" className="text-sm font-bold text-brand-primary hover:underline">← Về SportGo</Link>
    <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-brand-primary">SPORTGO · PHÁP LÝ</p>
    <h1 className="mt-3 text-4xl font-black tracking-tight">Chính sách quyền riêng tư của SportGo</h1>
    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cập nhật lần cuối: 04/10/2026</p>
    <div className={`mt-8 space-y-2 p-5 text-sm leading-6 ${cardClass}`}>
      <p>Chính sách này giải thích SportGo thu thập, sử dụng và bảo vệ dữ liệu của bạn như thế nào khi bạn dùng ứng dụng di động và website SportGo. Khi sử dụng dịch vụ, bạn xác nhận đã đọc chính sách này.</p>
      <p><strong>Đơn vị vận hành:</strong> SportGo team. <strong>Liên hệ:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-brand-primary hover:underline">{CONTACT_EMAIL}</a>.</p>
    </div>
    <div className="mt-6 space-y-4">{sections.map(({ title, text, items, after }) => <section key={title} className={cardClass}>
      <h2 className="font-black">{title}</h2>
      {text && <p className={`mt-2 ${bodyClass}`}>{text}</p>}
      {items && <ul className={`mt-2 list-disc space-y-1.5 pl-5 ${bodyClass}`}>{items.map(([label, content]) => <li key={label}><strong className="text-slate-800 dark:text-slate-100">{label}:</strong> {content}</li>)}</ul>}
      {after && <p className={`mt-3 ${bodyClass}`}>{after}</p>}
    </section>)}</div>
  </main>;
}
