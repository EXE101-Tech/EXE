import { CalendarDays, Clock3, Crown, MapPin, Star, Trophy, Users, X } from 'lucide-react';
import { formatStoredCost } from '../../../shared/utils/price';
import { resolveMediaUrl } from '../../../shared/services/api';

const LEVEL_LABELS = { Beginner: 'Mới chơi', Intermediate: 'Trung bình', Advanced: 'Khá / Giỏi', Expert: 'Chuyên nghiệp' };

const sportEmoji = (name = '') => {
  const value = name.toLowerCase();
  if (value.includes('cầu lông') || value.includes('badminton')) return '🏸';
  if (value.includes('bóng đá') || value.includes('football')) return '⚽';
  if (value.includes('pickleball')) return '🏓';
  return '🏅';
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : 'Chưa xác định';
};

const formatTime = (startValue, endValue) => {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if (!start || Number.isNaN(start.getTime())) return 'Chưa xác định';
  const startText = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const endText = end && !Number.isNaN(end.getTime()) ? end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  return endText ? `${startText} – ${endText}` : startText;
};

export default function ContentPreviewModal({ type, item, currentUserId, onClose, onJoin, isBusy = false }) {
  if (!item) return null;

  const isRoom = type === 'room';
  const approvedParticipants = isRoom
    ? (item.participants || []).filter((participant) => (
      participant.status === 'APPROVED'
      && participant.role !== 'HOST'
      && Number(participant.user_id) !== Number(item.host_id)
    ))
    : [];
  const roomCount = isRoom ? approvedParticipants.length + 1 : 0;
  const approvedCount = roomCount;
  const roomSlots = isRoom ? Math.max(0, (item.max_players || 0) - roomCount) : 0;
  const isRoomPending = isRoom && (item.participants || []).some((participant) => Number(participant.user_id) === Number(currentUserId) && participant.status === 'PENDING');
  const isTeamPending = !isRoom && item.membership_status === 'PENDING';
  const isFull = isRoom ? roomSlots === 0 : Number(item.member_count) >= Number(item.total_slots);
  const sportName = isRoom ? (item.sportName || item.sport?.name || 'Thể thao') : (item.sport_name || 'Thể thao');
  const title = isRoom ? item.title : item.name;
  const participantPeople = isRoom ? [
    { id: `host-${item.host_id}`, name: item.host?.name || 'Trưởng phòng', avatar: item.host?.avatar, isHost: true },
    ...approvedParticipants
      .map((participant) => ({
        id: participant.id || participant.user_id,
        name: participant.user?.name || participant.name || 'Người chơi',
        avatar: participant.user?.avatar || participant.avatar,
      })),
  ] : [];

  return (
    <div className="sg-preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sg-preview-modal" role="dialog" aria-modal="true" aria-label={`Xem nhanh ${title}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="sg-preview-header">
          <div className="sg-preview-heading">
            <span className="sg-preview-heading-icon">{isRoom ? sportEmoji(sportName) : <Crown size={20} />}</span>
            <div>
              <span className="sg-preview-eyebrow">{isRoom ? 'PHÒNG CHƠI' : 'CỘNG ĐỒNG THỂ THAO'}</span>
              <strong>Xem nhanh</strong>
            </div>
          </div>
          <button type="button" className="sg-preview-close" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        </header>

        <div className="sg-preview-body">
          {!isRoom && item.image_url && <img className="sg-preview-cover" src={resolveMediaUrl(item.image_url)} alt="" />}
          <div className="sg-preview-pill-row">
            <span className="sg-preview-pill">{sportEmoji(sportName)} {sportName}</span>
            <span className="sg-preview-pill sg-preview-pill-status">
              <span className="sg-preview-status-dot" />
              {isRoom ? (isFull ? 'Đã đủ người' : `${roomSlots} chỗ trống`) : `${item.member_count || 0}/${item.total_slots || 0} thành viên`}
            </span>
          </div>

          <h2>{title}</h2>
          <p className="sg-preview-description">{item.description || (isRoom ? 'Tham gia phòng để cùng mọi người có một trận đấu vui vẻ.' : 'Một cộng đồng dành cho những người yêu thể thao.')}</p>

          {isRoom ? (
            <>
            <div className="sg-preview-meta-grid">
              <span><CalendarDays size={16} /> {formatDate(item.start_time)}</span>
              <span><Clock3 size={16} /> {formatTime(item.start_time, item.end_time)}</span>
              <span className="sg-preview-meta-wide"><MapPin size={16} /> {item.location || 'Địa điểm chưa cập nhật'}</span>
              <span><Trophy size={16} /> {LEVEL_LABELS[item.required_level] || item.required_level || 'Mọi trình độ'}</span>
              <span><strong>Chi phí:</strong> {formatStoredCost(item.price_info)}</span>
              <span><Users size={16} /> {roomCount}/{item.max_players || 0} người</span>
            </div>
            <div className="sg-preview-participants">
              <div className="sg-preview-participants-heading"><span><Users size={15} /> Người tham gia</span><small>{approvedCount} đã duyệt</small></div>
              <div className="sg-preview-participant-list">
                {participantPeople.map((participant) => (
                  <div key={participant.id} className="sg-preview-participant" title={participant.name}>
                    <span className="sg-preview-participant-avatar">
                      {participant.avatar ? <img src={resolveMediaUrl(participant.avatar)} alt="" /> : participant.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="sg-preview-participant-name">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
            </>
          ) : (
            <div className="sg-preview-meta-grid">
              <span className="sg-preview-meta-wide"><MapPin size={16} /> {item.location || 'Địa điểm chưa cập nhật'}</span>
              <span><Users size={16} /> {item.member_count || 0}/{item.total_slots || 0} thành viên</span>
              <span><Star size={16} /> {item.rating_count ? `${Number(item.rating || 0).toFixed(1)} · ${item.rating_count} đánh giá` : 'Chưa có đánh giá'}</span>
            </div>
          )}
        </div>

        <footer className="sg-preview-footer">
          <button type="button" className="sg-preview-secondary" onClick={onClose}>Đóng</button>
          <button type="button" className="sg-action-button" onClick={() => onJoin(item)} disabled={isBusy || isFull || isRoomPending || isTeamPending}>
            {isRoomPending || isTeamPending ? 'Đang chờ duyệt' : isFull ? 'Đã đủ người' : isBusy ? 'Đang gửi...' : isRoom ? 'Tham gia ngay' : 'Tham gia CLB'}
          </button>
        </footer>
      </section>
    </div>
  );
}
