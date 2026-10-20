import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Crown, LoaderCircle, Pencil, Users, X } from 'lucide-react';
import { attendanceService, gameRoomService, resolveMediaUrl } from '../../../shared/services/api';
import { formatStoredCost } from '../../../shared/utils/price';
import ReputationBadge from '../../../shared/components/ReputationBadge';

const date = (value) => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
const schedule = (room) => `${date(room.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} · ${date(room.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${date(room.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
const personInfo = (person) => {
  const user = person.user || person;
  return { id: person.user_id || user.id, name: user.profile?.full_name || user.name || person.name || user.email || 'Người chơi', avatar: resolveMediaUrl(user.profile?.avatar_url || user.avatar || user.avatar_url || person.avatar), reputation: user.reputation };
};

function Avatar({ person }) {
  return <span className="sg-room-manager-avatar">{person.avatar ? <img src={person.avatar} alt="" /> : person.name.charAt(0).toUpperCase()}</span>;
}

function RoomManager({ room, onClose, onAttendance, onEdit, onDelete, onChanged, onMessage }) {
  const [current, setCurrent] = useState(room);
  const [attendance, setAttendance] = useState(null);
  const [tab, setTab] = useState(() => room.participants?.some((person) => person.status === 'PENDING') && date(room.end_time).getTime() > Date.now() && room.status !== 'CANCELLED' ? 'requests' : 'members');
  const [clock, setClock] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removeId, setRemoveId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const requestVersion = useRef(0);
  const id = useId();

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const [next, checkins] = await Promise.all([gameRoomService.getById(room.id), attendanceService.get(room.id)]);
    if (mounted.current && version === requestVersion.current) { setCurrent(next); setAttendance(checkins); }
  }, [room.id]);

  useEffect(() => {
    mounted.current = true;
    const update = () => {
      setClock(Date.now());
      if (busyRef.current || document.visibilityState !== 'visible') return;
      refresh().catch(() => { if (mounted.current) setError('Chưa tải được thông tin mới. Hãy thử lại.'); });
    };
    update();
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { mounted.current = false; window.clearInterval(timer); window.removeEventListener('focus', update); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [refresh]);

  const pending = (current.participants || []).filter((person) => person.status === 'PENDING');
  const members = (current.participants || []).filter((person) => person.status === 'APPROVED' && person.role !== 'HOST' && Number(person.user_id) !== Number(current.host_id));
  const count = members.length + 1;
  const capacity = current.max_players || 2;
  const closed = ['CLOSED', 'CANCELLED', 'FINISHED'].includes(current.status) || date(current.end_time).getTime() <= clock;
  const cancelled = current.status === 'CANCELLED';
  const host = personInfo(current.host || { name: 'Chủ phòng' });
  const checkinByUser = new Map((attendance?.participants || []).map((person) => [person.user_id, person]));

  const updateStatus = async (person, status) => {
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await gameRoomService.approveParticipant(current.id, person.id, status);
      await refresh();
      setRemoveId(null);
      setNotice(status === 'APPROVED' ? `Đã duyệt ${person.name} vào phòng.` : removeId === person.id ? `Đã gỡ ${person.name} khỏi phòng.` : `Đã từ chối yêu cầu của ${person.name}.`);
      onChanged?.();
    } catch (failure) { setError(failure.message || 'Chưa cập nhật được thành viên. Hãy thử lại.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const handleKeys = (event) => {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const nodes = [...dialog.current.querySelectorAll('button:not(:disabled), summary, a[href]')].filter((node) => node.getClientRects().length && node.tabIndex !== -1);
    if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === dialog.current)) { event.preventDefault(); nodes.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
  };
  const deleteRoom = async () => {
    busyRef.current = true; setBusy(true); setError('');
    try {
      const done = await onDelete?.(current);
      if (done === false) throw new Error('Chưa hủy được buổi chơi. Hãy thử lại.');
    } catch (failure) { setError(failure.message || 'Chưa cập nhật được phòng. Hãy thử lại.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const changeTab = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'requests' : event.key === 'End' ? 'members' : tab === 'members' ? 'requests' : 'members';
    setTab(next);
    dialog.current.querySelector(`#${id.replaceAll(':', '\\:')}-${next}`)?.focus();
  };
  const renderMember = (person, isHost = false) => {
    const checkin = checkinByUser.get(person.id);
    return <div className="sg-room-manager-member" key={person.id || 'host'}>
      <div className="sg-room-manager-person"><Avatar person={person} /><div><strong>{person.name}{isHost && <span className="sg-room-manager-host"><Crown size={11} />Chủ phòng</span>}</strong><span className={`sg-room-manager-presence ${checkin?.checked_in_at ? 'is-present' : ''}`}>{checkin?.checked_in_at ? <><CheckCircle2 size={12} />Đã check-in</> : checkin?.confirmation_status === 'CONFIRMED' ? 'Đã xác nhận sẽ đến' : 'Chưa xác nhận tham gia'}</span></div></div>
      {!isHost && <div className="sg-room-manager-member-actions">{onMessage && <button type="button" className="sg-attendance-text-button" onClick={() => onMessage(person)}>Nhắn tin</button>}{!closed && <button type="button" className="sg-room-manager-remove" disabled={busy} onClick={() => setRemoveId(removeId === person.id ? null : person.id)}>Gỡ khỏi phòng</button>}</div>}
      {removeId === person.id && <div className="sg-room-manager-confirm"><p>Gỡ <strong>{person.name}</strong> khỏi phòng? Người này sẽ được thông báo; lịch sử tham gia vẫn được giữ.</p><div><button type="button" className="sg-attendance-secondary" disabled={busy} onClick={() => setRemoveId(null)}>Giữ thành viên</button><button type="button" className="sg-attendance-secondary sg-attendance-danger" disabled={busy} onClick={() => updateStatus(person, 'REJECTED')}>Xác nhận gỡ</button></div></div>}
    </div>;
  };

  return <div className="sg-modal-backdrop sg-room-manager-backdrop"><section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="sg-modal-card sg-room-manager" onKeyDown={handleKeys}>
    <header className="sg-modal-header sg-room-manager-header"><div><h3 id={`${id}-title`}>Quản lý phòng</h3><p>{current.title}</p></div><button type="button" className="sg-modal-close" aria-label="Đóng quản lý phòng" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <div className="sg-modal-body sg-room-manager-body" aria-busy={busy}>
      {error && <p role="alert" className="sg-attendance-error">{error}<button className="sg-attendance-text-button" type="button" onClick={() => refresh().then(() => setError('')).catch(() => {})}>Tải lại</button></p>}
      <p role="status" className="sg-attendance-sr-only">{busy ? 'Đang cập nhật…' : notice}</p>
      <div className="sg-room-manager-overview"><div><span><CalendarDays size={14} />{schedule(current)}</span><strong>{formatStoredCost(current.price_info)}</strong></div><div className="sg-room-manager-capacity"><span><Users size={15} />{count}/{capacity} người</span><span>{cancelled ? 'Đã hủy' : closed ? 'Đã kết thúc' : count >= capacity ? 'Đã đủ người' : `Còn ${capacity - count} chỗ`}</span></div><div className="sg-room-manager-meter" role="progressbar" aria-label="Số người trong phòng" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={count}><span style={{ width: `${Math.min(100, count / capacity * 100)}%` }} /></div></div>
      {closed && <p className="sg-room-manager-info">{cancelled ? 'Buổi chơi đã hủy. Người tham gia không bị tính vắng.' : 'Buổi chơi đã kết thúc. Mở điểm danh để ghi nhận kết quả cho từng người.'}</p>}
      <div className="sg-room-manager-tabs" role="tablist" aria-label="Quản lý thành viên" onKeyDown={changeTab}>{[['requests', 'Chờ duyệt', pending.length], ['members', 'Thành viên', count]].map(([key, label, total]) => <button key={key} id={`${id}-${key}`} role="tab" type="button" aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} aria-controls={`${id}-panel`} onClick={() => { setTab(key); setRemoveId(null); }}>{label}<span>{total}</span></button>)}</div>
      <section id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="sg-room-manager-panel">
        {tab === 'requests' ? pending.length ? <>
          <p className="sg-room-manager-hint">{count >= capacity ? 'Phòng đã đủ người. Bạn có thể tăng số chỗ trong phần chỉnh sửa phòng.' : 'Xem thông tin và lời nhắn trước khi duyệt người chơi vào phòng.'}</p>
          {pending.map((request) => { const person = personInfo(request); return <div className="sg-modal-pending sg-room-manager-request" key={person.id}><div className="sg-room-manager-person"><Avatar person={person} /><div><strong>{person.name}</strong><ReputationBadge reputation={person.reputation} compact />{request.joined_at && <span>Gửi lúc {date(request.joined_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}</div></div>{request.note && <p className="sg-room-manager-note">{request.note}</p>}<div className="sg-room-manager-request-actions"><button type="button" className="sg-attendance-secondary" disabled={busy || closed} onClick={() => updateStatus(person, 'REJECTED')}>Từ chối</button><button type="button" className="sg-primary-button" disabled={busy || closed || count >= capacity} onClick={() => updateStatus(person, 'APPROVED')}><Check size={14} />Duyệt vào</button></div></div>; })}
        </> : <div className="sg-room-manager-empty"><CheckCircle2 size={24} /><strong>Không có yêu cầu đang chờ</strong><p>Người chơi mới gửi yêu cầu sẽ xuất hiện tại đây.</p><button type="button" className="sg-attendance-text-button" onClick={() => setTab('members')}>Xem thành viên trong phòng</button></div> : <>{renderMember(host, true)}{members.map((person) => renderMember(personInfo(person)))}</>}
      </section>
      <details className="sg-attendance-disclosure sg-room-manager-options"><summary>Tùy chọn khác<ChevronDown size={15} /></summary><div className="sg-attendance-disclosure-content"><p>{closed ? 'Gỡ phòng khỏi danh sách. Lịch sử điểm danh được giữ lại.' : 'Hủy buổi chơi cho tất cả thành viên. Người chơi sẽ nhận thông báo và không bị tính vắng.'}</p>{confirmCancel ? <div className="sg-room-manager-confirm"><p>{closed ? 'Gỡ phòng này khỏi danh sách?' : `Hủy buổi chơi của ${count} thành viên?`}</p><div><button type="button" className="sg-attendance-secondary" disabled={busy} onClick={() => setConfirmCancel(false)}>Quay lại</button><button type="button" className="sg-attendance-secondary sg-attendance-danger" disabled={busy} onClick={deleteRoom}>{closed ? 'Xác nhận gỡ phòng' : 'Xác nhận hủy buổi'}</button></div></div> : <button type="button" className="sg-room-manager-remove" disabled={busy} onClick={() => setConfirmCancel(true)}>{closed ? 'Gỡ phòng' : 'Hủy buổi chơi'}</button>}</div></details>
    </div>
    <footer className="sg-modal-footer sg-room-manager-footer">{!closed && <button type="button" className="sg-attendance-secondary" disabled={busy} onClick={() => onEdit?.({ ...current, start_time: date(current.start_time).toISOString(), end_time: date(current.end_time).toISOString() })}><Pencil size={14} />Chỉnh sửa phòng</button>}<button type="button" className="sg-primary-button" disabled={busy || cancelled} onClick={() => onAttendance?.(current)}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}{closed ? 'Điểm danh sau buổi' : 'Điểm danh & check-in'}</button></footer>
  </section></div>;
}

export default function ManageRoomModal(props) {
  return props.isOpen && props.room ? <RoomManager key={props.room.id} {...props} /> : null;
}
