import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Crown, LoaderCircle, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import { attendanceService, gameRoomService, reputationService } from '../../../shared/services/api';
import { formatStoredCost } from '../../../shared/utils/price';
import AttendanceHistory from './AttendanceHistory';

const date = (value) => value ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`) : null;
const time = (value) => date(value)?.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) || 'Chưa có';
const hour = (value) => date(value)?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) || '';
const day = (value) => date(value)?.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) || '';
const VERIFICATION = { UNVERIFIED: 'Đang chờ xác nhận kết quả', OCCURRED: 'Buổi chơi đã được xác nhận', CANCELLED: 'Buổi chơi đã hủy', DISPUTED: 'Kết quả cần được xem lại' };
const CONFIRMATION = { UNCONFIRMED: 'Chưa xác nhận tham gia', CONFIRMED: 'Đã xác nhận tham gia', CANCELLED: 'Đã hủy tham gia', DECLINED: 'Đã rời phòng', REMOVED: 'Đã được gỡ khỏi phòng' };
const OUTCOME = { ATTENDED: 'Tham dự đã xác minh', NO_SHOW: 'Vắng không báo đã kiểm duyệt', EXCUSED: 'Không ảnh hưởng uy tín', UNVERIFIED: 'Đang chờ đối chiếu' };

function Disclosure({ title, children, className = '' }) {
  return <details className={`sg-attendance-disclosure ${className}`}>
    <summary>{title}<ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="sg-attendance-disclosure-content">{children}</div>
  </details>;
}

function ReviewForm({ state, busy, onReview }) {
  const [userId, setUserId] = useState('');
  const [outcome, setOutcome] = useState('EXCUSED');
  const [sessionStatus, setSessionStatus] = useState('');
  const [note, setNote] = useState('');
  const reviewPeople = state.review_participants || state.participants;
  const selected = reviewPeople.find((person) => person.user_id === Number(userId));
  return <form className="sg-attendance-section sg-attendance-form" onSubmit={(event) => {
    event.preventDefault();
    onReview(Number(userId), { outcome, session_status: sessionStatus || null, note: note.trim() });
  }}>
    <div><h4>Xử lý kết quả điểm danh</h4><p>Kiểm tra thông tin bên dưới trước khi quyết định. Lý do sẽ được gửi cho người chơi.</p></div>
    <label>Người cần xem xét<select required value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Chọn người chơi</option>{reviewPeople.map((person) => <option key={person.user_id} value={person.user_id}>{person.name}{person.membership_status !== 'APPROVED' ? ' (không còn trong phòng)' : ''}</option>)}</select></label>
    {selected && selected.membership_status !== 'APPROVED' && <p>Hồ sơ trước khi rời phòng: {CONFIRMATION[selected.confirmation_status]}. {selected.checked_in_at ? `Đã check-in lúc ${hour(selected.checked_in_at)}.` : 'Chưa check-in.'} {selected.dispute_reason && `Yêu cầu xem lại: ${selected.dispute_reason}`}</p>}
    <div className="sg-attendance-form-grid">
      <label>Xác minh buổi chơi<select value={sessionStatus} onChange={(event) => setSessionStatus(event.target.value)}><option value="">Giữ kết quả hiện tại</option><option value="OCCURRED">Buổi có diễn ra</option><option value="CANCELLED">Buổi bị hủy</option></select></label>
      <label>Kết quả của người chơi<select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="EXCUSED">Không ảnh hưởng uy tín</option><option value="ATTENDED">Tham dự đã đối chiếu</option><option value="NO_SHOW">Vắng không báo đã kiểm tra</option></select></label>
    </div>
    <label>Lý do quyết định<textarea required minLength={10} maxLength={1000} placeholder="Ghi rõ thông tin đã đối chiếu và lý do quyết định." value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <button className="sg-primary-button" disabled={busy || note.trim().length < 10 || !userId} type="submit">Lưu quyết định kiểm duyệt</button>
  </form>;
}

function Participants({ state, ended, closed, isHost, busy, run }) {
  const approved = state.participants.filter((person) => person.membership_status === 'APPROVED')
    .sort((a, b) => Number(b.user_id === state.mine?.user_id) - Number(a.user_id === state.mine?.user_id));
  const checkedInCount = approved.filter((person) => person.checked_in_at).length;
  const requiredPeers = state.mine?.required_peer_confirmations || approved[0]?.required_peer_confirmations || 2;
  return <section className="sg-attendance-section sg-attendance-roster" aria-label="Người tham gia">
    <div className="sg-attendance-roster-heading"><div className="sg-attendance-roster-title"><Users size={20} aria-hidden="true" /><h4>{ended ? 'Xác nhận người cùng chơi' : 'Người tham gia'} <span>{approved.length}</span></h4></div><span className={`sg-attendance-roster-checkins ${checkedInCount === approved.length && approved.length ? 'is-complete' : ''}`}><CheckCircle2 size={15} aria-hidden="true" /><span><strong>{checkedInCount}/{approved.length}</strong> đã check-in</span></span></div>
    {ended && !closed && <div className="sg-attendance-roster-guidance"><p>Chỉ xác nhận người bạn trực tiếp gặp tại sân. {requiredPeers === 1 ? 'Phòng có 2 người: cần 1 người còn lại xác nhận.' : 'Mỗi người cần ít nhất 2 người khác xác nhận có mặt, có thể tính cả chủ phòng.'}</p>{!state.can_peer_confirm && !state.can_review && <p>Gửi phản hồi bạn đã có mặt ở phần trên để xác nhận người cùng chơi. Quên xác nhận hoặc nhập mã vẫn có thể khai báo bổ sung.</p>}</div>}
    {!approved.length && <p>Chưa có người tham gia.</p>}
    <div className="sg-attendance-people">{approved.map((person) => {
      const present = !!person.checked_in_at;
      const confirmed = person.confirmation_status === 'CONFIRMED';
      const status = present ? 'Đã check-in' : confirmed ? 'Đã xác nhận' : CONFIRMATION[person.confirmation_status] || 'Chưa xác nhận';
      const statusLabel = status === CONFIRMATION.UNCONFIRMED ? 'Chưa xác nhận' : status;
      const initials = person.name.trim().split(/\s+/).slice(-2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase('vi-VN');
      const isSelf = person.user_id === state.mine?.user_id;
      const confirmations = person.peer_confirmations || [];
      const required = person.required_peer_confirmations || 2;
      const canVote = ended && !closed && !isSelf && state.can_peer_confirm && person.can_receive_peer_confirmation && !person.resolved_outcome;
      return <div className={`sg-attendance-person ${present ? 'is-checked-in' : ''} ${isSelf ? 'is-self' : ''}`} role="group" aria-label={isSelf ? `Thông tin của bạn: ${person.name}` : person.name} key={person.user_id}>
      <div className="sg-attendance-person-identity"><span className="sg-attendance-person-avatar" aria-hidden="true">{initials}</span><div className="sg-attendance-person-info"><strong>{person.name}{isSelf && <span className="sg-attendance-person-you">Bạn</span>}{person.role === 'HOST' && <small><Crown size={11} aria-hidden="true" />Chủ phòng</small>}</strong>
        {present && <p className="sg-attendance-person-time">Check-in lúc {hour(person.checked_in_at)}</p>}
        {!person.has_commitment && <p className="sg-attendance-person-missing">Chưa xác nhận trước buổi</p>}
        {ended && <><p>{person.self_attended == null ? 'Chưa gửi xác nhận sau buổi' : person.self_attended ? person.supplemental_attendance ? 'Đã khai báo có mặt bổ sung' : 'Xác nhận có mặt' : 'Xác nhận không có mặt'}</p><span className={`sg-attendance-person-result ${person.outcome === 'ATTENDED' ? 'is-success' : ''}`}>{person.disputed ? 'Đang yêu cầu xem lại' : person.outcome === 'ATTENDED' && person.supplemental_attendance ? 'Tham dự đã xác minh bổ sung' : OUTCOME[person.outcome]}</span></>}
        {ended && !isSelf && !person.can_receive_peer_confirmation && !person.resolved_outcome && <p>Chờ người chơi khai báo đã tham gia.</p>}
        {ended && <div className={`sg-attendance-peer-count ${confirmations.length >= required ? 'is-enough' : ''}`}><span><Users size={13} aria-hidden="true" /><strong>{confirmations.length}/{required}</strong> người khác xác nhận</span>{confirmations.length > 0 && <p>{confirmations.map((peer) => peer.name).join(', ')}</p>}</div>}
        {person.dispute_reason && <p>Phản hồi: {person.dispute_reason}</p>}
      </div></div>
      <div className="sg-attendance-person-meta"><span className={`sg-attendance-person-status ${present ? 'is-present' : !ended && confirmed ? 'is-confirmed' : 'is-waiting'}`}>{present || (!ended && confirmed) ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{ended && !present ? 'Chưa check-in' : statusLabel}</span>
      {canVote && <div className="sg-attendance-peer-actions"><button className="sg-attendance-secondary" type="button" aria-pressed={person.my_peer_confirmation} disabled={busy} onClick={() => run(() => attendanceService.reportPeer(state.match_id, person.user_id, !person.my_peer_confirmation), person.my_peer_confirmation ? 'Đã bỏ xác nhận của bạn. Việc này không tính là báo vắng.' : `Đã xác nhận ${person.name} có mặt.`)}><Check size={14} />{person.my_peer_confirmation ? 'Đã xác nhận có mặt' : 'Xác nhận có mặt'}</button>{person.my_peer_confirmation && <small>Bấm lại để bỏ xác nhận</small>}</div>}
      {ended && !closed && isHost && !isSelf && <div className="sg-attendance-row-actions" role="group" aria-label={`Điểm danh ${person.name}`}><button className="sg-attendance-text-button" type="button" aria-pressed={person.host_report === 'ABSENT'} disabled={busy || !!person.resolved_outcome} onClick={() => run(() => gameRoomService.updateAttendance(state.match_id, person.user_id, 'ABSENT'), 'Đã báo vắng. Admin sẽ kiểm tra kết quả này.')}>Báo vắng</button></div>}</div>
    </div>; })}</div>
  </section>;
}

export default function AttendanceRoomModal({ roomId, onClose, onChanged }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState('');
  const [issuedCode, setIssuedCode] = useState(null);
  const [renewingCode, setRenewingCode] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelAccepted, setCancelAccepted] = useState(false);
  const [occurred, setOccurred] = useState('');
  const [attended, setAttended] = useState('');
  const [editingReport, setEditingReport] = useState(false);
  const [clock, setClock] = useState(Date.now);
  const [offset, setOffset] = useState(0);
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const reportDirty = useRef(false);
  const lastTerms = useRef(null);

  const applyState = useCallback((next) => {
    setState(next);
    if (lastTerms.current !== next.terms_version) {
      setAccepted(false);
      setIssuedCode(null);
      lastTerms.current = next.terms_version;
    }
    setOffset(date(next.server_time).getTime() - Date.now());
    setClock(Date.now());
    if (!reportDirty.current) {
      setOccurred(next.mine?.self_occurred == null ? '' : String(next.mine.self_occurred));
      setAttended(next.mine?.self_attended == null ? '' : String(next.mine.self_attended));
    }
  }, []);
  const load = useCallback(async () => applyState(await attendanceService.get(roomId)), [roomId, applyState]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active || busyRef.current || document.visibilityState !== 'visible') return;
      attendanceService.get(roomId).then((next) => { if (active && !busyRef.current) applyState(next); }).catch((failure) => { if (active) setError(failure.message); });
    };
    refresh();
    const ticker = window.setInterval(() => setClock(Date.now()), 1000);
    const poller = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      active = false;
      window.clearInterval(ticker);
      window.clearInterval(poller);
      window.removeEventListener('focus', refresh);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [roomId, applyState]);

  const run = async (action, message) => {
    busyRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const next = await action();
      if (next?.match_id && next.policy && next.verification_status) applyState(next);
      else await load();
      setNotice(message);
      onChanged?.();
      return true;
    } catch (failure) {
      if (failure.status === 409) {
        setAccepted(false);
        try { await load(); } catch { /* Keep the action error visible if refresh also fails. */ }
      }
      setError(failure.message || 'Chưa lưu được thay đổi. Hãy thử lại.');
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  };
  const handleKey = (event) => {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const nodes = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]')].filter((node) => node.getClientRects().length);
    if (!nodes.length) return;
    if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === dialogRef.current)) { event.preventDefault(); nodes.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  };

  const mine = state?.mine;
  const serverNow = clock + offset;
  const ended = state && date(state.end_time).getTime() <= serverNow;
  const closed = state?.status === 'CANCELLED' || (state?.removed && !ended);
  const isHost = state && mine?.user_id === state.host_id;
  const isApproved = mine?.membership_status === 'APPROVED';
  const confirmed = mine?.confirmation_status === 'CONFIRMED';
  const checkedIn = !!mine?.checked_in_at;
  const canConfirm = state && serverNow < date(state.confirmation_deadline).getTime();
  const checkinStarts = state && new Date(date(state.start_time).getTime() - state.policy.checkin_before_minutes * 60000);
  const canCheckin = state && serverNow >= checkinStarts.getTime() && !ended && !closed;
  const codeLive = issuedCode && date(issuedCode.expires_at).getTime() > serverNow && confirmed;
  const codeSeconds = codeLive ? Math.max(0, Math.ceil((date(issuedCode.expires_at).getTime() - serverNow) / 1000)) : 0;
  const hasReport = mine?.self_occurred != null;
  const step = ended ? 2 : confirmed ? 1 : 0;
  const completedSteps = [confirmed || mine?.has_commitment, checkedIn, ended && mine?.outcome !== 'UNVERIFIED' && !mine?.disputed];
  const supplementalEntry = isApproved && (!mine?.has_commitment || !checkedIn);
  const showReport = ended && !closed && isApproved && !mine.resolved_outcome && (!hasReport || editingReport);
  const showCancellation = !ended && !closed && isApproved && (isHost || !checkedIn);

  useEffect(() => {
    if (!isHost || !canCheckin || !confirmed || !issuedCode) return;
    let active = true;
    let timer;
    const rotate = async () => {
      if (!active) return;
      if (busyRef.current) {
        timer = window.setTimeout(rotate, 500);
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setRenewingCode(true);
      try {
        const next = await attendanceService.openCode(roomId);
        if (active) {
          setIssuedCode(next);
          setError('');
          await load();
        }
      } catch {
        if (active) {
          setError('Chưa đổi được mã check-in. Đang thử lại; bạn cũng có thể tạo mã mới.');
          timer = window.setTimeout(rotate, 5000);
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        setRenewingCode(false);
      }
    };
    timer = window.setTimeout(rotate, Math.max(0, date(issuedCode.expires_at).getTime() - (Date.now() + offset)));
    return () => { active = false; window.clearTimeout(timer); };
  }, [isHost, canCheckin, confirmed, issuedCode, roomId, offset, load]);

  let action;
  if (state) {
    if (closed) action = <><h4>Buổi chơi đã được hủy</h4><p>Bạn không cần check-in hay gửi xác nhận. Buổi này không làm giảm uy tín của bạn.</p></>;
    else if (state.can_review) action = <><h4>Xem xét kết quả buổi chơi</h4><p>Đối chiếu check-in, phản hồi của người chơi và lịch sử trước khi xử lý.</p></>;
    else if (mine?.membership_status === 'PENDING') action = <><h4>Đang chờ chủ phòng duyệt</h4><p>Sau khi được duyệt, bạn có thể xác nhận tham gia và check-in tại sân.</p></>;
    else if (!isApproved) action = <><h4>{CONFIRMATION[mine?.confirmation_status] || 'Bạn chưa tham gia buổi này'}</h4><p>{mine?.cancellation_reason || 'Bạn có thể xem lại thông tin và lịch sử của mình bên dưới.'}</p></>;
    else if (ended) action = <>
      <h4>{mine.disputed ? 'Kết quả đang được xem lại' : mine.outcome !== 'UNVERIFIED' ? mine.outcome === 'ATTENDED' && mine.supplemental_attendance ? 'Đã xác minh tham dự bổ sung' : OUTCOME[mine.outcome] : hasReport ? supplementalEntry && mine.self_attended ? 'Đang đối chiếu bổ sung' : 'Đã gửi xác nhận sau buổi' : supplementalEntry ? 'Bạn có tham gia buổi chơi này không?' : 'Buổi chơi của bạn thế nào?'}</h4>
      <p>{mine.disputed ? 'Admin sẽ kiểm tra phản hồi của bạn. Kết quả đang tranh chấp tạm thời chưa được tính vào uy tín.' : mine.outcome === 'ATTENDED' ? mine.supplemental_attendance ? 'Người cùng chơi đã xác nhận bạn có mặt. Lượt tham dự được ghi nhận qua đối chiếu bổ sung.' : 'Lượt tham dự này đã được ghi nhận vào hồ sơ uy tín của bạn.' : mine.resolution_note || (hasReport ? 'Người cùng chơi cần xác nhận bạn có mặt để hoàn tất đối chiếu.' : supplementalEntry ? 'Bạn đã được duyệt vào phòng. Nếu thực sự có mặt nhưng quên xác nhận hoặc nhập mã, hãy khai báo bổ sung để người cùng chơi đối chiếu.' : 'Cho biết buổi có diễn ra và bạn có mặt không để hoàn tất điểm danh.')}</p>
      {showReport && <form className="sg-attendance-form" onSubmit={async (event) => { event.preventDefault(); const saved = await run(() => attendanceService.report(roomId, { occurred: occurred === 'true', attended: attended === 'true' }), 'Đã lưu xác nhận sau buổi chơi.'); if (saved) { reportDirty.current = false; setEditingReport(false); } }}>
        <div className="sg-attendance-form-grid">
          <label>Buổi chơi có diễn ra không?<select required value={occurred} onChange={(event) => { reportDirty.current = true; setOccurred(event.target.value); if (event.target.value === 'false') setAttended('false'); }}><option value="">Chọn kết quả</option><option value="true">Có diễn ra</option><option value="false">Không diễn ra</option></select></label>
          <label>Bạn có tham gia không?<select required value={attended} onChange={(event) => { reportDirty.current = true; setAttended(event.target.value); }}><option value="">Chọn kết quả</option><option value="true" disabled={occurred === 'false'}>Tôi có mặt</option><option value="false">Tôi không có mặt</option></select></label>
        </div>{supplementalEntry && <p className="sg-attendance-small">Khai báo có mặt cần ít nhất {mine.required_peer_confirmations || 2} người khác xác nhận. Trạng thái chưa xác nhận trước buổi và chưa check-in bằng mã vẫn được giữ đúng.</p>}<button type="submit" className="sg-primary-button" disabled={busy || !occurred || !attended}>{supplementalEntry ? 'Gửi khai báo bổ sung' : 'Gửi xác nhận sau buổi'}</button>
      </form>}
      {hasReport && !editingReport && !mine.resolved_outcome && <button className="sg-attendance-text-button" type="button" onClick={() => setEditingReport(true)}>Sửa xác nhận của tôi</button>}
      {hasReport && mine.self_attended && !mine.resolved_outcome && !mine.disputed && <div className="sg-attendance-next">Bạn đã được <strong>{mine.peer_confirmations?.length || 0}/{mine.required_peer_confirmations || 2} người khác</strong> xác nhận có mặt. {mine.outcome === 'UNVERIFIED' && 'Kết quả được ghi nhận khi đủ xác nhận chéo và buổi đã được xác minh.'}</div>}
    </>;
    else if (!confirmed) action = <>
      <h4>{canConfirm ? 'Bạn sẽ tham gia buổi này chứ?' : 'Bạn chưa xác nhận trước buổi'}</h4><p>{canConfirm ? 'Kiểm tra lịch, địa điểm và chi phí ở trên trước khi xác nhận.' : 'Bạn đã được duyệt nên vẫn có thể đến sân. Sau buổi, hãy khai báo có mặt để người cùng chơi xác nhận bổ sung. Chưa xác nhận không tự động bị tính vắng.'}</p>
      {canConfirm && <form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => attendanceService.confirm(roomId, state.terms_version), 'Đã xác nhận tham gia.'); }}>
        <label className="sg-attendance-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>Tôi đã đọc thông tin buổi chơi và sẽ đến tham gia.</span></label>
        <div className="sg-attendance-submit-row"><button type="submit" className="sg-primary-button" disabled={busy || !accepted}>Tôi sẽ tham gia</button><small>Xác nhận trước {time(state.confirmation_deadline)}</small></div>
        <p className="sg-attendance-small">Nếu không thể đến, hãy hủy tham gia để chủ phòng biết. Hủy sát giờ được ghi nhận riêng; báo vắng cần admin kiểm tra.</p>
      </form>}
    </>;
    else if (isHost && canCheckin) action = <>
      <h4>{codeLive ? 'Mã check-in của buổi chơi' : renewingCode ? 'Đang đổi mã check-in…' : 'Đón người chơi tại sân'}</h4><p>{codeLive ? 'Mã tự đổi mỗi 1 phút. Chỉ chia sẻ với những người đang có mặt tại sân.' : 'Khi đã đến sân, tạo mã check-in để người chơi xác nhận có mặt.'}</p>
      {codeLive && <div className="sg-attendance-code"><output aria-label="Mã check-in của phòng">{issuedCode.code}</output><span>Đổi mã sau {Math.floor(codeSeconds / 60)}:{String(codeSeconds % 60).padStart(2, '0')}<small>Mã cũ không còn dùng được sau khi đổi.</small></span></div>}
      {!codeLive && state.code_expires_at && date(state.code_expires_at).getTime() > serverNow && <p className="sg-attendance-small">Mã đã tạo không hiển thị lại sau khi đóng cửa sổ. Tạo mã mới sẽ thay thế mã trước đó.</p>}
      <button type="button" className={codeLive ? 'sg-attendance-text-button' : 'sg-primary-button'} disabled={busy} onClick={() => run(async () => { const issued = await attendanceService.openCode(roomId); setIssuedCode(issued); return issued; }, 'Đã tạo mã check-in. Mã mới thay thế mã cũ.')}>{codeLive ? 'Đổi mã check-in' : state.code_expires_at ? 'Tạo mã check-in mới' : 'Tạo mã check-in'}</button>
      {checkedIn && <p className="sg-attendance-small"><CheckCircle2 size={14} />Bạn đã check-in lúc {hour(mine.checked_in_at)}.</p>}
    </>;
    else if (checkedIn) action = <><h4><CheckCircle2 size={22} />Bạn đã check-in</h4><p>Đã ghi nhận lúc {hour(mine.checked_in_at)}. Chúc bạn có một buổi chơi vui!</p><div className="sg-attendance-next">Sau {hour(state.end_time)}, quay lại đây để xác nhận kết quả buổi chơi.</div></>;
    else if (canCheckin) action = <>
      <h4>Bạn đã đến sân chưa?</h4><p>Nhập mã 6 số do chủ phòng cung cấp khi bạn có mặt tại sân.</p>
      <form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => attendanceService.checkin(roomId, code), 'Check-in thành công.'); }}>
        <label htmlFor="attendance-code">Mã check-in</label><div className="sg-attendance-checkin-input"><input id="attendance-code" value={code} inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" required placeholder="000000" onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /><button type="submit" className="sg-primary-button" disabled={busy || code.length !== 6}>Check-in tại sân</button></div>
      </form>
    </>;
    else action = <><h4><CheckCircle2 size={22} />Đã xác nhận tham gia</h4><p>Hẹn gặp bạn tại sân. Check-in mở từ {time(checkinStarts.toISOString())}.</p><div className="sg-attendance-next">{isHost ? 'Khi đến sân, quay lại đây để tạo mã check-in cho người chơi.' : 'Khi đến sân, lấy mã từ chủ phòng và check-in tại đây.'}</div></>;
  }

  return <div className="sg-modal-backdrop sg-attendance-backdrop">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="attendance-title" className="sg-modal-card sg-attendance-modal" onKeyDown={handleKey}>
      <header className="sg-modal-header sg-attendance-header"><div className="sg-attendance-title"><ClipboardCheck size={22} /><div><h3 id="attendance-title">{state?.can_review ? 'Xem xét điểm danh' : 'Điểm danh buổi chơi'}</h3><p>{state?.title || 'Đang tải thông tin…'}</p></div></div><button type="button" className="sg-modal-close" onClick={onClose} disabled={busy} aria-label="Đóng điểm danh buổi chơi"><X size={20} /></button></header>
      <div className="sg-modal-body sg-attendance-body" aria-busy={busy}>
        {error && <p role="alert" className="sg-attendance-error">{error}<button type="button" className="sg-attendance-text-button" disabled={busy} onClick={() => run(() => attendanceService.get(roomId), 'Đã tải lại thông tin.')}>Tải lại</button></p>}
        <p role="status" className="sg-attendance-sr-only">{busy ? 'Đang lưu…' : notice}</p>
        {!state && !error && <p className="sg-attendance-loading"><LoaderCircle className="animate-spin" size={20} />Đang tải buổi chơi…</p>}
        {state && <>
          <div className="sg-attendance-summary"><div className="sg-attendance-summary-top"><span><CalendarDays size={16} />{day(state.start_time)} · {hour(state.start_time)} – {hour(state.end_time)}</span><strong>{state.price_info != null && state.price_info !== '' ? formatStoredCost(state.price_info) : 'Chưa có chi phí'}</strong></div><p><MapPin size={16} /><span>{state.location || 'Chưa có địa điểm. Hãy liên hệ chủ phòng.'}</span></p></div>
          {!closed && !state.can_review && isApproved && <ol className="sg-attendance-steps" aria-label="Các bước tham gia">{['Xác nhận tham gia', 'Check-in tại sân', 'Kết quả buổi chơi'].map((label, index) => <li key={label} className={completedSteps[index] ? 'is-done' : index === step ? 'is-current' : ''} aria-current={index === step ? 'step' : undefined}><span>{completedSteps[index] ? <Check size={12} /> : index + 1}</span>{label}</li>)}</ol>}
          {(ended || closed) && <div className={`sg-attendance-status status-${state.verification_status.toLowerCase()}`}><ShieldCheck size={16} /><strong>{closed ? VERIFICATION.CANCELLED : VERIFICATION[state.verification_status]}</strong></div>}
          <section className={`sg-attendance-action ${checkedIn || mine?.outcome === 'ATTENDED' ? 'is-success' : ''}`}>{action}</section>
          {state.can_review && <ReviewForm state={state} busy={busy} onReview={(userId, data) => run(() => reputationService.review(roomId, userId, data), 'Đã lưu quyết định kiểm duyệt.')} />}
          {(state.can_manage || (ended && state.participants.length > 0)) && <Participants state={state} ended={ended} closed={closed} isHost={isHost} busy={busy} run={run} />}
          {ended && mine && !closed && <Disclosure title="Yêu cầu xem lại kết quả"><p>Nếu điểm danh chưa đúng, hãy mô tả điều cần kiểm tra. Admin sẽ xem lại thông tin của bạn.</p><form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => attendanceService.dispute(roomId, reason.trim()), 'Đã gửi yêu cầu xem lại kết quả.'); }}><label>Nội dung cần xem lại<textarea required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="sg-attendance-secondary" type="submit" disabled={busy || reason.trim().length < 3}>Gửi yêu cầu xem lại</button></form></Disclosure>}
          {showCancellation && <Disclosure title={isHost ? 'Hủy buổi chơi' : 'Tôi không thể tham gia'} className="sg-attendance-cancellation">{isHost ? <>
            <p>Buổi chơi sẽ bị hủy với tất cả thành viên và được gỡ khỏi danh sách tìm trận. Lịch sử vẫn được giữ; người chơi không bị tính vắng.</p><form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => gameRoomService.remove(roomId), 'Đã hủy buổi chơi.'); }}><label className="sg-attendance-consent"><input type="checkbox" required checked={cancelAccepted} onChange={(event) => setCancelAccepted(event.target.checked)} /><span>Tôi muốn hủy buổi chơi cho tất cả thành viên.</span></label><button className="sg-attendance-secondary sg-attendance-danger" type="submit" disabled={busy || !cancelAccepted}>Xác nhận hủy buổi chơi</button></form>
          </> : <><p>Hãy báo cho chủ phòng biết lý do. Hủy trong {state.policy.late_cancel_minutes} phút trước giờ bắt đầu được ghi nhận là hủy sát giờ.</p><form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => gameRoomService.leave(roomId, reason.trim()), 'Đã hủy tham gia và thông báo cho chủ phòng.'); }}><label>Lý do hủy<textarea required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="sg-attendance-secondary sg-attendance-danger" type="submit" disabled={busy || reason.trim().length < 3}>Xác nhận hủy tham gia</button></form></>}</Disclosure>}
          <div className="sg-attendance-extras">
            <Disclosure title="Quy định tham gia"><ul><li>Hủy trong {state.policy.late_cancel_minutes} phút trước giờ bắt đầu được ghi nhận là hủy sát giờ; lượt hủy hiển thị riêng, không trừ điểm.</li><li>Check-in mở trước giờ chơi {state.policy.checkin_before_minutes} phút. Mã tự đổi mỗi 1 phút khi chủ phòng mở màn hình check-in; mã cũ hết hiệu lực sau tối đa 1 phút.</li><li>Sau buổi, chủ phòng và người cùng chơi gửi phản hồi để xác minh buổi có diễn ra. Check-in hoặc đủ xác nhận chéo được dùng để đối chiếu.</li><li>Mỗi người cần ít nhất 2 người khác xác nhận có mặt; phòng chỉ có 2 người cần 1 người còn lại. Tự xác nhận không tính vào số này. Người đánh giá phải ở trong phòng và đã gửi phản hồi có mặt.</li><li>Người đã được duyệt vẫn có thể tham gia dù quên xác nhận hoặc nhập mã. Sau buổi, khai báo có mặt để đối chiếu bổ sung; việc này không tạo cam kết trước buổi hay lượt check-in bằng mã.</li><li>Thiếu xác nhận chéo hoặc thiếu check-in chưa đủ để kết luận vắng. Vắng không báo cần admin kiểm tra trước khi ảnh hưởng uy tín.</li></ul></Disclosure>
            <Disclosure title="Lịch sử hoạt động"><AttendanceHistory events={state.events} viewerId={mine?.user_id} /></Disclosure>
          </div>
        </>}
      </div>
    </section>
  </div>;
}
