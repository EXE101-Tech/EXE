import { useState } from 'react';
import { ArrowLeft, BadgeCheck, ChartNoAxesCombined, Crown, History, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PremiumInfoModal from './PremiumInfoModal.jsx';

const benefits = [
  { icon: Sparkles, title: 'Tự động tìm phòng và gửi thông báo', text: 'Thiết lập sẵn môn chơi, thời gian, khu vực và trình độ để hệ thống tự tìm phòng phù hợp, không cần tự vào tìm mỗi ngày.' },
  { icon: ChartNoAxesCombined, title: 'Ưu tiên lấp đầy phòng sắp bắt đầu', text: 'Nếu phòng còn thiếu người trong vòng 2 giờ trước giờ chơi, bài sẽ được đưa lên đầu hoặc gửi lời mời đến số người cần tìm cộng thêm 2 người dự phòng.' },
  { icon: History, title: 'Lịch đăng bài tự động', text: 'Thiết lập nội dung và thời gian để bài tìm người chơi được đăng tự động theo lịch của bạn.' },
  { icon: Users, title: 'Mở rộng CLB và có lịch riêng', text: 'Tăng giới hạn thành viên so với mức cơ bản tối đa 10 người và có lịch quản lý riêng cho chủ CLB đăng ký gói.' },
  { icon: BadgeCheck, title: 'Nhắc thu phí thường niên cho CLB', text: 'Trưởng CLB có thể thiết lập thông báo và lịch nhắc thu phí thường niên khi đăng ký gói.' },
];

export default function PremiumPage() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  return <main className="sg-premium-page">
    <Link to="/tournaments" className="sg-premium-back"><ArrowLeft size={16} /> Quay lại bảng tin</Link>
    <section className="sg-premium-hero"><div className="sg-premium-glow" /><div className="sg-premium-hero-content"><span className="sg-premium-badge"><Crown size={16} /> SPORTGO PREMIUM</span><h1>Chủ động hơn<br /><em>trong mỗi trận<br />chơi.</em></h1><p>Gói Premium 30.000đ/tháng giúp bạn tự động tìm phòng, lấp đầy phòng chơi và quản lý hoạt động CLB theo lịch đã thiết lập.</p><button type="button" className="sg-premium-state sg-premium-upgrade-button" onClick={() => setPaymentOpen(true)} aria-label="Nâng cấp Premium với giá 30.000đ mỗi tháng"><strong>30.000đ/tháng</strong><span>· Nâng cấp ngay</span></button></div><div className="sg-premium-graphic" aria-hidden="true"><span>MOVE<br />TOGETHER<span className="sg-premium-dot">.</span></span><i /></div></section>
    <div className="sg-premium-section-heading"><span className="sg-eyebrow">GÓI PREMIUM · 30.000Đ/THÁNG</span><h2>Tự động hóa những việc bạn thường phải làm thủ công</h2></div>
    <div className="sg-premium-grid">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="sg-panel sg-premium-benefit"><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <p className="sg-premium-footnote">Thanh toán bằng mã QR, ghi đúng mã giao dịch và gửi ảnh xác nhận để quản trị viên kiểm tra.</p>
    <PremiumInfoModal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} />
  </main>;
}
