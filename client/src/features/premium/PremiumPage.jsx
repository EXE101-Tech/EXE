import { useState } from 'react';
import { ArrowLeft, BadgeCheck, ChartNoAxesCombined, Crown, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import PremiumInfoModal from './PremiumInfoModal.jsx';

const benefits = [
  { icon: Sparkles, title: 'Tự động tìm phòng và gửi thông báo', text: 'Thiết lập sẵn môn chơi, thời gian, khu vực và trình độ để hệ thống tự tìm phòng phù hợp, không cần tự vào tìm mỗi ngày.' },
  { icon: ChartNoAxesCombined, title: 'Tự nhắc chốt kèo, giữ chỗ rõ hạn', text: 'Bật khi tạo phòng: nhắc người chưa xác nhận trước giờ chơi. Hết hạn giữ chỗ, suất mở lại mà không tính bùng kèo. Người vào muộn có thời hạn phản hồi riêng.' },
  { icon: Users, title: 'Dự bị và hỗ trợ tìm người thay', text: 'Khi có chỗ trống, ưu tiên mời người đăng ký dự bị rồi tìm người cùng khu vực, môn và trình độ. Lời mời có hạn 15 hoặc 5 phút. Dưới 30 phút, chủ phòng xử lý trực tiếp.' },
  { icon: Users, title: 'Mở rộng CLB và có lịch riêng', text: 'Tăng giới hạn thành viên so với mức cơ bản tối đa 15 người. Chủ CLB thiết lập lịch hoạt động, thành viên trong CLB được xem lịch.' },
  { icon: BadgeCheck, title: 'Lịch nhắc thu phí cho CLB', text: 'Chủ CLB chọn ngày và nhắc hàng tuần hoặc hàng tháng; thành viên nhận thông báo theo lịch đã đặt.' },
];

export default function PremiumPage() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { user } = useAuth();
  const isPremium = Boolean(user?.isPremium);
  return <main className="sg-premium-page">
    <Link to="/tournaments" className="sg-premium-back"><ArrowLeft size={16} /> Quay lại cộng đồng</Link>
    <section className="sg-premium-hero"><div className="sg-premium-glow" /><div className="sg-premium-hero-content"><span className="sg-premium-badge"><Crown size={16} /> SPORTGO PREMIUM</span><h1>Chủ động hơn<br /><em>trong mỗi trận<br />chơi.</em></h1><p>Gói Premium 30.000đ/tháng giúp bạn tự động nhắc chốt kèo, hỗ trợ tìm người thay, tìm phòng phù hợp và quản lý lịch CLB.</p><button type="button" disabled={isPremium} className={`sg-premium-state sg-premium-upgrade-button ${isPremium ? 'is-upgraded' : ''}`} onClick={() => !isPremium && setPaymentOpen(true)} aria-label={isPremium ? 'Gói Premium đang hoạt động' : 'Nâng cấp Premium với giá 30.000đ mỗi tháng'}>{isPremium ? <><BadgeCheck size={16} /><strong>Đã nâng cấp</strong></> : <><strong>30.000đ/tháng</strong><span>· Nâng cấp ngay</span></>}</button></div><div className="sg-premium-graphic" aria-hidden="true"><span>MOVE<br />TOGETHER<span className="sg-premium-dot">.</span></span><i /></div></section>
    <div className="sg-premium-section-heading"><span className="sg-eyebrow">GÓI PREMIUM · 30.000Đ/THÁNG</span><h2>Tự động hóa những việc bạn thường phải làm thủ công</h2></div>
    <div className="sg-premium-grid">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="sg-panel sg-premium-benefit"><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <p className="sg-premium-footnote">Thanh toán bằng mã QR, ghi đúng mã giao dịch và gửi ảnh xác nhận để quản trị viên kiểm tra.</p>
    <PremiumInfoModal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} />
  </main>;
}
