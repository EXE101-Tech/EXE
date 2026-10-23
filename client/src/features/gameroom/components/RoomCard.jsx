import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, MessageCircle, Users } from 'lucide-react';
import { formatCostAmount } from '../../../shared/utils/price';
import ViewLocationModal from '../../../shared/components/ViewLocationModal';
import ReputationBadge from '../../../shared/components/ReputationBadge';

const levels = { Beginner: 'Mới chơi', Intermediate: 'Trung bình', Advanced: 'Khá / Giỏi', Expert: 'Chuyên nghiệp' };
const sports = { badminton: ['🏸', 'Cầu lông'], 'cầu lông': ['🏸', 'Cầu lông'], football: ['⚽', 'Bóng đá'], 'bóng đá': ['⚽', 'Bóng đá'], pickleball: ['🏓', 'Pickleball'] };
const date = (value) => value ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`) : null;

export default function RoomCard({ room, currentUserId, onJoin, onDecline, onChat, onManage, onAttendance }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const approved = (room.participants || []).filter((person) => person.status === 'APPROVED' && person.role !== 'HOST' && Number(person.user_id) !== Number(room.host_id));
  const pendingCount = (room.participants || []).filter((person) => person.status === 'PENDING').length;
  const count = approved.length + 1;
  const capacity = room.max_players || count;
  const empty = Math.max(0, capacity - count);
  const isHost = Number(room.host_id) === Number(currentUserId) || room.isMyRoom;
  const mine = (room.participants || []).find((person) => Number(person.user_id) === Number(currentUserId));
  const isAutoInvite = mine?.status === 'PENDING' && mine?.invite_source === 'AUTO';
  const start = date(room.start_time);
  const end = date(room.end_time);
  const cancelled = room.status === 'CANCELLED';
  const closed = ['CLOSED', 'CANCELLED', 'FINISHED'].includes(room.status) || (end && end.getTime() <= clock);
  const isMember = mine?.status === 'APPROVED';
  const requestExpired = mine?.status === 'EXPIRED' || (closed && mine?.status === 'PENDING');
  const canSeeResult = closed && (isHost || mine);
  const [emoji, sport] = sports[(room.sportId || room.sportName || '').toLowerCase()] || ['🏓', room.sportName || 'Thể thao'];
  const players = [{ id: room.host_id, name: room.host?.name || 'Chủ phòng', avatar: room.host?.avatar }, ...approved.map((person) => ({ id: person.user_id, name: person.user?.name || person.name || 'Người chơi', avatar: person.user?.avatar || person.avatar }))];
  const hostName = room.host?.name || 'Người chơi';
  const timeLabel = start && !Number.isNaN(start.getTime()) ? `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${end ? ` – ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Chưa có giờ chơi';

  return <>
    <article className={`sg-room-card sg-panel sg-match-post ${isHost ? 'is-own-room' : ''}`}>
      <div className="sg-match-post-top"><span className="sg-match-post-sport"><span aria-hidden="true">{emoji}</span>{sport}</span><span className={`sg-match-post-status ${closed || !empty ? 'is-closed' : ''}`}>{cancelled ? 'Đã hủy' : closed ? 'Đã kết thúc' : !empty ? 'Đã đủ người' : `Còn ${empty} chỗ`}</span></div>
      <h2>{room.title}</h2>
      <div className="sg-match-post-schedule"><span><CalendarDays size={16} />{start?.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) || 'Chưa có lịch'}</span><strong><Clock3 size={16} />{timeLabel}</strong></div>
      <div className="sg-match-post-location"><MapPin size={17} /><p>{room.location || 'Địa điểm chưa cập nhật'}</p>{room.location && <button type="button" onClick={() => setMapOpen(true)} aria-label="Xem vị trí sân trên bản đồ">Bản đồ</button>}</div>
      {room.description && <p className="sg-match-post-description">{room.description}</p>}
      <div className="sg-match-post-key-info"><div className="sg-match-post-price"><strong>{formatCostAmount(room.price_info)}</strong><span>mỗi người</span></div><div className="sg-match-post-level"><span>Trình độ</span><strong>{levels[room.required_level] || room.required_level || 'Mọi trình độ'}</strong></div></div>
      <div className="sg-match-post-players"><div className="sg-match-post-avatars" aria-label={`${count} người đã tham gia`}>{players.slice(0, 5).map((person) => <span key={person.id} title={person.name}>{person.avatar ? <img src={person.avatar} alt={person.name} /> : <span>{person.name.charAt(0).toUpperCase()}</span>}</span>)}{players.length > 5 && <span>+{players.length - 5}</span>}</div><span><Users size={14} /><strong>{count}/{capacity}</strong> người</span></div>
      <div className="sg-match-post-host"><span>Chủ phòng: <strong>{hostName}</strong></span><ReputationBadge reputation={room.host?.reputation} compact /></div>
      {requestExpired && <p className="sg-room-request-expired">Yêu cầu tham gia đã hết hạn. Bạn chưa được duyệt vào buổi chơi này.</p>}
      <div className="sg-match-post-actions">
        {!isHost && <button type="button" className="sg-match-post-chat" onClick={() => onChat?.(room)} aria-label="Nhắn tin cho chủ phòng"><MessageCircle size={17} /></button>}
        {isHost && !cancelled && <button type="button" className={closed ? 'sg-attendance-secondary' : 'sg-primary-button'} onClick={() => onManage?.(room)}>Quản lý phòng{pendingCount > 0 && !closed && <span className="sg-room-pending-count" aria-label={`${pendingCount} yêu cầu đang chờ duyệt`}>{pendingCount}</span>}</button>}
        {canSeeResult ? <button type="button" className="sg-primary-button" onClick={() => onAttendance?.(room)}>{requestExpired ? 'Xem yêu cầu' : 'Xem kết quả'}</button> : isHost ? <button type="button" className="sg-attendance-secondary" onClick={() => onAttendance?.(room)}>Điểm danh</button> : isMember ? <button type="button" className="sg-primary-button" onClick={() => onAttendance?.(room)}>Xác nhận & check-in</button> : <>{isAutoInvite && <button type="button" className="sg-attendance-secondary" onClick={() => onDecline?.(room)} disabled={closed}>Từ chối</button>}<button type="button" className="sg-primary-button" onClick={() => onJoin?.({ ...room, isAutoInvite })} disabled={closed || !empty || (!isAutoInvite && mine?.status === 'PENDING')}>{isAutoInvite ? 'Nhận lời mời' : mine?.status === 'PENDING' ? 'Đang chờ duyệt' : 'Tham gia ngay'}</button></>}
      </div>
    </article>
    <ViewLocationModal isOpen={mapOpen} onClose={() => setMapOpen(false)} title={room.title} location={room.location} coords={room.court?.venue?.latitude && room.court?.venue?.longitude ? [Number(room.court.venue.latitude), Number(room.court.venue.longitude)] : null} />
  </>;
}
