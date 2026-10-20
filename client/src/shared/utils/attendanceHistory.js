import { formatStoredCost } from './price.js';

const asDate = (value) => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
const outcomes = { ATTENDED: 'Tham dự đã xác minh', NO_SHOW: 'Vắng không báo đã kiểm duyệt', EXCUSED: 'Không ảnh hưởng uy tín' };
const systemReasons = new Set(['Người chơi rời phòng', 'Chủ phòng từ chối hoặc gỡ thành viên']);

export function buildAttendanceHistory(events, viewerId) {
  const sorted = [...events].filter((entry) => entry.type !== 'CHECKIN_OPENED')
    .sort((a, b) => asDate(b.created_at) - asDate(a.created_at) || b.id - a.id);
  const cancellations = sorted.filter((entry) => entry.type === 'CANCELLED_PARTICIPATION');
  const changes = [];
  const result = [];
  for (const entry of sorted) {
    const details = entry.details || {};
    if (entry.type === 'TERMS_CHANGED' && details.room_update) continue;
    // Older servers recorded both a removal and a membership update for one action.
    if (entry.type === 'MEMBERSHIP_UPDATED' && details.status === 'REJECTED' && cancellations.some((other) => (
      other.actor_id === entry.actor_id && other.subject_id === entry.subject_id
      && Math.abs(asDate(other.created_at) - asDate(entry.created_at)) < 5000
    ))) continue;
    if (entry.type === 'TERMS_CHANGED') {
      const key = JSON.stringify(details.changes || details.previous_terms || {});
      if (changes.some((other) => other.actor_id === entry.actor_id && other.key === key
        && Math.abs(asDate(other.created_at) - asDate(entry.created_at)) < 5000)) continue;
      changes.push({ ...entry, key });
    }
    const actor = entry.actor_id === viewerId ? 'Bạn' : entry.actor_name || (entry.actor_id ? 'Tài khoản đã xóa' : 'Hệ thống');
    const subject = entry.subject_id === viewerId ? 'bạn' : entry.subject_name || 'Tài khoản đã xóa';
    let title;
    let description = '';
    let kind = 'room';
    switch (entry.type) {
      case 'ROOM_CREATED': title = `${actor} tạo buổi chơi`; break;
      case 'ROOM_UPDATED': {
        title = `${actor} cập nhật thông tin buổi chơi`;
        const labels = { start_time: 'Bắt đầu', end_time: 'Kết thúc', location: 'Địa điểm', price_info: 'Chi phí' };
        description = Object.entries(details.changes || {}).map(([field, values]) => {
          if (!labels[field]) return field === 'sport_id' ? 'Đã đổi môn thể thao.' : field === 'court_id' ? 'Đã đổi sân chơi.' : '';
          const format = (value) => value == null || value === '' ? 'Chưa có' : field === 'price_info' ? formatStoredCost(value)
            : field.endsWith('_time') ? asDate(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : value;
          return `${labels[field]}: ${format(values.before)} → ${format(values.after)}`;
        }).filter(Boolean).join('\n');
        break;
      }
      case 'JOIN_REQUESTED': title = `${actor} gửi yêu cầu tham gia`; kind = 'member'; break;
      case 'INVITE_ACCEPTED': title = `${actor} nhận lời mời tham gia`; kind = 'member'; break;
      case 'MEMBERSHIP_UPDATED':
        if (details.status === 'APPROVED') title = `${actor} duyệt ${subject} vào phòng`;
        else if (details.status === 'REJECTED') title = details.previous_status === 'PENDING'
          ? `${actor} từ chối yêu cầu tham gia của ${subject}`
          : details.previous_status === 'APPROVED' ? `${actor} gỡ ${subject} khỏi phòng` : `${entry.subject_name || 'Người chơi'} không còn trong phòng`;
        kind = 'member'; break;
      case 'CONFIRMED': title = `${actor} xác nhận sẽ tham gia`; kind = 'member'; break;
      case 'CANCELLED_PARTICIPATION': {
        const byHost = entry.actor_id != null && entry.actor_id !== entry.subject_id;
        title = byHost ? details.status_before === 'PENDING' ? `${actor} từ chối yêu cầu tham gia của ${subject}`
          : details.status_before === 'APPROVED' ? `${actor} gỡ ${subject} khỏi phòng` : `${entry.subject_name || 'Người chơi'} không còn trong phòng`
          : `${actor} ${details.status_before === 'PENDING' ? 'rút yêu cầu tham gia' : details.had_commitment ? 'hủy tham gia' : 'rời phòng'}`;
        if (details.reason && !systemReasons.has(details.reason)) description = `Lý do: ${details.reason}`;
        if (!byHost && details.late) description = [description, 'Ghi nhận hủy sát giờ.'].filter(Boolean).join(' ');
        kind = 'member'; break;
      }
      case 'HOST_TRANSFERRED': title = `${actor} chuyển quyền chủ phòng cho ${subject}`; kind = 'member'; break;
      case 'TERMS_CHANGED': title = `${actor} thay đổi thông tin buổi chơi`; description = 'Người tham gia cần đọc thông tin mới và xác nhận lại.'; break;
      case 'CHECKED_IN': title = `${actor} đã check-in tại sân`; kind = 'checkin'; break;
      case 'HOST_REPORTED': title = `${actor} điểm danh ${subject}: ${details.attendance === 'ATTENDED' ? 'có mặt' : 'báo vắng'}`; kind = 'result'; break;
      case 'PEER_REPORTED': title = details.attended ? `${actor} xác nhận ${subject} có mặt` : `${actor} bỏ xác nhận có mặt của ${subject}`; kind = 'result'; break;
      case 'SELF_REPORTED': title = `${actor} ${!details.occurred ? 'cho biết buổi chơi không diễn ra' : details.attended ? details.supplemental ? 'khai báo có mặt bổ sung' : 'xác nhận đã có mặt' : 'xác nhận không tham dự'}`; kind = 'result'; break;
      case 'DISPUTED': title = `${actor} yêu cầu xem lại kết quả`; description = details.reason || ''; kind = 'result'; break;
      case 'ADMIN_REVIEWED': title = `${actor} xử lý kết quả của ${subject}`; description = [outcomes[details.outcome], details.note].filter(Boolean).join('. '); kind = 'result'; break;
      case 'ROOM_CANCELLED': title = `${actor} hủy buổi chơi`; break;
      case 'ROOM_REMOVED': title = `${actor} ${details.occurred_before_end ? 'hủy' : 'gỡ'} buổi chơi`; break;
      default: break;
    }
    if (title) result.push({ id: entry.id, created_at: entry.created_at, title, description, kind });
  }
  return result;
}
