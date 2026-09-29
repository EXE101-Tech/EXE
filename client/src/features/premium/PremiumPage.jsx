import { ArrowLeft, BadgeCheck, ChartNoAxesCombined, Crown, History, ListFilter, Palette, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const benefits = [
  { icon: Sparkles, title: 'Dễ được tìm thấy hơn', text: 'Ưu tiên xuất hiện khi người chơi tìm đồng đội phù hợp.' },
  { icon: ListFilter, title: 'Bộ lọc chuyên sâu', text: 'Thu hẹp kết quả theo mục tiêu, lịch chơi và trình độ.' },
  { icon: ChartNoAxesCombined, title: 'Hiểu hành trình của bạn', text: 'Theo dõi nhịp độ hoạt động và những cột mốc cá nhân.' },
  { icon: Users, title: 'Không gian để phát triển', text: 'Tạo thêm phòng và CLB khi cộng đồng của bạn lớn lên.' },
  { icon: BadgeCheck, title: 'Dấu ấn Premium', text: 'Một cách tinh tế để thể hiện sự gắn bó của bạn với cộng đồng.' },
  { icon: Palette, title: 'Hồ sơ mang màu sắc riêng', text: 'Tùy chỉnh diện mạo để câu chuyện thể thao của bạn nổi bật.' },
  { icon: History, title: 'Lưu lại nhiều khoảnh khắc', text: 'Xem lịch sử hoạt động trong khoảng thời gian dài hơn.' },
];

export default function PremiumPage() {
  return <main className="sg-premium-page">
    <Link to="/tournaments" className="sg-premium-back"><ArrowLeft size={16} /> Quay lại bảng tin</Link>
    <section className="sg-premium-hero"><div className="sg-premium-glow" /><div className="sg-premium-hero-content"><span className="sg-premium-badge"><Crown size={16} /> SPORTGO PREMIUM</span><h1>Thêm không gian<br /><em>cho đam mê<br />vận động.</em></h1><p>Những công cụ hữu ích giúp bạn kết nối đúng người, tổ chức nhiều hoạt động hơn và nhìn lại hành trình của mình.</p><span className="sg-premium-state">Tính năng Premium đang được phát triển</span></div><div className="sg-premium-graphic" aria-hidden="true"><span>MOVE<br />TOGETHER<span className="sg-premium-dot">.</span></span><i /></div></section>
    <div className="sg-premium-section-heading"><span className="sg-eyebrow">GIÁ TRỊ THỰC TẾ</span><h2>Được tạo cho người luôn muốn chơi thêm một trận</h2></div>
    <div className="sg-premium-grid">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="sg-panel sg-premium-benefit"><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <p className="sg-premium-footnote">SportGo chưa kết nối đăng ký hay thanh toán Premium. Trang này giới thiệu định hướng tính năng và không tạo giao dịch.</p>
  </main>;
}
