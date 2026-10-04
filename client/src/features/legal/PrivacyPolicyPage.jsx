import { Link } from 'react-router-dom';

const sections = [
  ['Dữ liệu SportGo xử lý', 'SportGo có thể xử lý thông tin tài khoản (email, tên), hồ sơ thể thao, ảnh/video do bạn tải lên, nội dung bài viết/bình luận, tin nhắn, dữ liệu đặt sân/phòng chơi và thông tin giao dịch Premium. Dữ liệu vị trí chỉ được sử dụng khi bạn cho phép để tìm sân gần khu vực hoạt động.'],
  ['Mục đích sử dụng', 'Dữ liệu được dùng để đăng nhập, vận hành cộng đồng, kết nối người chơi, đặt sân/phòng, hiển thị nội dung bạn đăng, hỗ trợ kiểm duyệt an toàn, xử lý giao dịch và cải thiện độ tin cậy của dịch vụ. SportGo không bán dữ liệu cá nhân của bạn.'],
  ['Chia sẻ và lưu trữ', 'Dữ liệu chỉ được chia sẻ với nhà cung cấp cần thiết để vận hành dịch vụ hoặc khi pháp luật yêu cầu. SportGo áp dụng biện pháp kiểm soát truy cập phù hợp; thời gian lưu giữ phụ thuộc vào mục đích, nghĩa vụ pháp lý và yêu cầu xử lý khiếu nại.'],
  ['Quyền của bạn', 'Bạn có thể chỉnh sửa hồ sơ, quản lý quyền vị trí, báo cáo/chặn người dùng và yêu cầu xoá tài khoản. Khi xoá tài khoản trong ứng dụng, dữ liệu tài khoản và nội dung gắn với tài khoản sẽ được xoá theo quy trình xoá dữ liệu của SportGo.'],
  ['Nội dung cộng đồng', 'Khi đăng bài, bình luận hoặc gửi nội dung khác, bạn phải tuân thủ quy tắc cộng đồng SportGo. Người dùng có thể báo cáo nội dung/người dùng và chặn tương tác trực tiếp; đội ngũ quản trị có thể xem xét, gỡ nội dung hoặc hạn chế tài khoản vi phạm.'],
];

export default function PrivacyPolicyPage() {
  return <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 text-slate-800 dark:text-slate-100 sm:px-8">
    <Link to="/" className="text-sm font-bold text-brand-primary hover:underline">← Về SportGo</Link>
    <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-brand-primary">SPORTGO · PHÁP LÝ</p>
    <h1 className="mt-3 text-4xl font-black tracking-tight">Chính sách quyền riêng tư</h1>
    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cập nhật: 04/10/2026</p>
    <p className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm leading-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      Chính sách này giải thích cách SportGo xử lý dữ liệu khi bạn sử dụng website và ứng dụng di động. Việc tiếp tục sử dụng dịch vụ đồng nghĩa bạn đã đọc và hiểu các nội dung dưới đây.
    </p>
    <div className="mt-6 space-y-4">{sections.map(([title, text]) => <section key={title} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"><h2 className="font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p></section>)}</div>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"><h2 className="font-black">Yêu cầu xoá tài khoản</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Bạn có thể xoá ngay trong ứng dụng hoặc gửi yêu cầu từ trang <Link to="/account-deletion" className="font-bold text-brand-primary hover:underline">xoá tài khoản SportGo</Link>.</p></section>
  </main>;
}
