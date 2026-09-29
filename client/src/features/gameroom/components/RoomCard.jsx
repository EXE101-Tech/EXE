import { CalendarDays, Clock3, MapPin, MessageCircle, Users } from 'lucide-react';
import { formatStoredCost } from '../../../shared/utils/price';

const sportEmoji = (name = '') => name.toLowerCase().includes('cầu lông') || name.toLowerCase().includes('badminton') ? '🏸' : name.toLowerCase().includes('bóng đá') || name.toLowerCase().includes('football') ? '⚽' : '🏓';
const levelLabel = { Beginner: 'Mới chơi', Intermediate: 'Trung bình', Advanced: 'Khá / Giỏi', Expert: 'Chuyên nghiệp' };

export default function RoomCard({ room, currentUserId, onJoin, onChat, onManage }) {
  const approved = (room.participants || []).filter((person) => person.status === 'APPROVED');
  const count = approved.length + 1;
  const empty = Math.max(0, (room.max_players || 0) - count);
  const isHost = Number(room.host_id) === Number(currentUserId) || room.isMyRoom;
  const myRequest = (room.participants || []).find((person) => Number(person.user_id) === Number(currentUserId));
  const isClosed = ['CLOSED', 'CANCELLED', 'FINISHED'].includes(room.status);
  const isFull = empty === 0;
  const start = room.start_time ? new Date(room.start_time) : null;
  const end = room.end_time ? new Date(room.end_time) : null;
  const date = start && !Number.isNaN(start.getTime()) ? start.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'Chưa xác định';
  const time = start && !Number.isNaN(start.getTime()) ? `${start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${end && !Number.isNaN(end.getTime()) ? ` – ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Chưa xác định';
  const players = [{ name: room.host?.name || 'Trưởng phòng', avatar: room.host?.avatar }, ...approved.map((person) => ({ name: person.user?.name || person.name || 'Người chơi', avatar: person.user?.avatar || person.avatar }))];

  return <article className="sg-room-card sg-panel">
    <div className="sg-room-top"><span className="sg-room-sport">{sportEmoji(room.sportName)} {room.sportName || 'Thể thao'}</span><span className={`sg-room-status ${isClosed || isFull ? 'closed' : ''}`}><i />{isClosed ? 'Đã kết thúc' : isFull ? 'Đã đủ người' : `${empty} chỗ trống`}</span></div>
    <h2>{room.title}</h2>
    {room.description && <p className="sg-room-description">{room.description}</p>}
    <div className="sg-room-meta"><span><CalendarDays size={16} /> {date}</span><span><Clock3 size={16} /> {time}</span><span className="sg-room-location"><MapPin size={16} /> {room.location || 'Địa điểm chưa cập nhật'}</span></div>
    <div className="sg-room-detail"><span>Trình độ <strong>{levelLabel[room.required_level] || room.required_level || 'Mọi trình độ'}</strong></span><span>Chi phí <strong>{formatStoredCost(room.price_info)}</strong></span></div>
    <div className="sg-room-footer"><div className="sg-room-players"><div className="sg-avatar-stack">{players.slice(0, 4).map((person, index) => <span key={`${person.name}-${index}`} title={person.name}>{person.avatar ? <img src={person.avatar} alt="" /> : person.name.charAt(0).toUpperCase()}</span>)}</div><span><Users size={14} /> {count}/{room.max_players} người</span></div><div className="sg-room-actions"><button type="button" className="sg-room-chat" onClick={() => onChat?.(room)} aria-label="Nhắn tin cho trưởng phòng"><MessageCircle size={17} /></button>{isHost ? <button type="button" className="sg-primary-button" onClick={() => onManage?.(room)}>Quản lý phòng</button> : <button type="button" className="sg-primary-button" onClick={() => onJoin?.(room)} disabled={isClosed || isFull || myRequest?.status === 'PENDING' || myRequest?.status === 'APPROVED'}>{myRequest?.status === 'PENDING' ? 'Đang chờ duyệt' : myRequest?.status === 'APPROVED' ? 'Đã tham gia' : 'Tham gia ngay'}</button>}</div></div>
  </article>;
}
