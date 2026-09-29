import { CalendarDays, MapPin, MessageCircle, Settings2, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeamCard({ team, onReview, onJoin, onManageMembers, onEdit, onChat }) {
  const members = team.members || 0;
  const slots = team.totalSlots || 0;
  const isFull = slots > 0 && members >= slots;
  const sport = team.sportName || team.sport_name || 'Thể thao';

  return <article className="sg-team-card sg-panel">
    <div className="sg-team-cover"><img src={team.image} alt="" loading="lazy" /><span>{team.sportEmoji || '🏅'} {sport}</span></div>
    <div className="sg-team-body"><div className="sg-team-head"><div><p className="sg-team-kicker">{team.isCaptain ? 'CLB CỦA BẠN' : team.isMember ? 'CLB ĐÃ THAM GIA' : 'CỘNG ĐỒNG THỂ THAO'}</p><h2><Link to={`/team/${team.id}`}>{team.name}</Link></h2></div><span className="sg-team-member-count"><Users size={14} /> {members}{slots ? `/${slots}` : ''}</span></div>
      {team.description && <p className="sg-team-description">{team.description}</p>}
      <div className="sg-team-meta"><span><MapPin size={15} /> {team.location || 'Địa điểm chưa cập nhật'}</span><span><CalendarDays size={15} /> Hoạt động từ {team.createdAt || 'gần đây'}</span></div>
      <div className="sg-team-footer"><span className="sg-team-rating"><Star size={15} /> {team.ratingCount > 0 ? `${Number(team.rating || 0).toFixed(1)} · ${team.ratingCount} đánh giá` : 'Chưa có đánh giá'}</span><div className="sg-team-actions">{team.isCaptain ? <><button type="button" onClick={() => onEdit?.(team)} className="sg-team-icon" aria-label="Chỉnh sửa CLB"><Settings2 size={17} /></button><button type="button" onClick={() => onManageMembers?.(team)} className="sg-primary-button">Quản lý CLB</button></> : team.isMember ? <><button type="button" onClick={() => onChat?.(team)} className="sg-team-icon" aria-label="Nhắn tin với người mở CLB" disabled={!team.owner_id}><MessageCircle size={17} /></button><Link to={`/team/${team.id}`} className="sg-primary-button">Xem CLB</Link></> : <><button type="button" onClick={() => onReview?.(team)} className="sg-team-icon" aria-label="Đánh giá CLB"><Star size={17} /></button><button type="button" onClick={() => onChat?.(team)} className="sg-team-icon" aria-label="Nhắn tin với người mở CLB" disabled={!team.owner_id}><MessageCircle size={17} /></button><button type="button" onClick={() => onJoin?.(team)} disabled={isFull || team.membershipStatus === 'PENDING' || team.membershipStatus === 'APPROVED'} className="sg-primary-button">{team.membershipStatus === 'PENDING' ? 'Đang chờ duyệt' : team.membershipStatus === 'APPROVED' ? 'Đã tham gia' : isFull ? 'Đã đủ người' : 'Tham gia CLB'}</button></>}</div></div>
    </div>
  </article>;
}
