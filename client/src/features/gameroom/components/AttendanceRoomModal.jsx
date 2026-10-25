import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Crown, LoaderCircle, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import { attendanceService, gameRoomService } from '../../../shared/services/api';
import { formatStoredCost } from '../../../shared/utils/price';
import AttendanceHistory from './AttendanceHistory';
import { responseTimeLeft } from '../../../shared/utils/roomTiming';
import ProfileLink from '../../../shared/components/ProfileLink';

const date = (value) => value ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`) : null;
const time = (value) => date(value)?.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) || 'Chưa có';
const hour = (value) => date(value)?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) || '';
const day = (value) => date(value)?.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) || '';
const VERIFICATION = { UNVERIFIED: 'Đang chờ xác nhận kết quả', OCCURRED: 'Buổi chơi đã được xác nhận', CANCELLED: 'Buổi chơi đã hủy', DISPUTED: 'Phản hồi về buổi chơi chưa khớp' };
const CONFIRMATION = { UNCONFIRMED: 'Chưa xác nhận tham gia', CONFIRMED: 'Đã xác nhận tham gia', CANCELLED: 'Đã hủy tham gia', DECLINED: 'Đã rời phòng', REMOVED: 'Đã được gỡ khỏi phòng', EXPIRED: 'Đã hết hạn giữ chỗ' };
const OUTCOME = { ATTENDED: 'Tham dự đã xác minh', NO_SHOW: 'Vắng không báo', EXCUSED: 'Không ảnh hưởng uy tín', UNVERIFIED: 'Đang chờ đối chiếu' };

function Disclosure({ title, children, className = '' }) {
  return <details className={`sg-attendance-disclosure ${className}`}>
    <summary>{title}<ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="sg-attendance-disclosure-content">{children}</div>
  </details>;
}

function LowAttendanceNotice({ state, ended, isHost, busy, run }) {
  const [accepted, setAccepted] = useState(false);
  const low = state.low_attendance;
  if (!low?.needs_decision) return null;
  return <section className="sg-attendance-low" aria-label="Buổi chơi chưa đủ người">
    <h4><Clock3 size={19} />{ended ? 'Buổi đã kết thúc nhưng chưa ghi nhận đủ người' : `Đã qua thời gian chờ ${low.grace_minutes} phút`}</h4>
    <p>Mới ghi nhận <strong>{low.present_count}/{low.minimum_players}</strong> người có mặt. Phòng có {low.approved_count} người đã được duyệt, {low.checked_in_count} người đã check-in.</p>
    <p>{isHost ? ended ? low.approved_count < low.minimum_players ? 'Phòng chưa có đủ người cùng chơi để xác minh tham dự. Nếu buổi không diễn ra, hãy hủy vì thiếu người để kết thúc điểm danh.' : 'Nếu buổi không diễn ra vì thiếu người, hãy hủy để kết thúc điểm danh. Nếu mọi người đã chơi nhưng quên check-in, hãy gửi xác nhận sau buổi để đối chiếu.' : 'Nếu mọi người đã đến hoặc bạn muốn chờ thêm, hãy chọn tiếp tục và hoàn tất check-in. Bạn cũng có thể hủy vì thiếu người.' : 'Chủ phòng có thể chọn tiếp tục hoặc hủy vì thiếu người. Nếu đã có mặt, bạn vẫn có thể hoàn tất điểm danh.'} Hủy vì thiếu người không ảnh hưởng uy tín.</p>
    {low.can_continue && <button type="button" className="sg-attendance-secondary" disabled={busy} onClick={() => run(() => attendanceService.decideLowAttendance(state.match_id, 'CONTINUE'), 'Đã chọn tiếp tục buổi chơi. Mọi người vẫn có thể check-in.')}>Tiếp tục buổi chơi</button>}
    {low.can_cancel && <form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => attendanceService.decideLowAttendance(state.match_id, 'CANCEL'), 'Đã hủy buổi chơi vì thiếu người. Không ảnh hưởng uy tín.'); }}>
      <label className="sg-attendance-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>Xác nhận buổi chơi không diễn ra vì thiếu người.</span></label>
      <button type="submit" className="sg-attendance-secondary sg-attendance-danger" disabled={busy || !accepted}>Hủy vì thiếu người</button>
    </form>}
  </section>;
}

function Participants({ state, started, ended, closed, peerOpen, isHost, busy, run }) {
  const approved = state.participants.filter((person) => person.membership_status === 'APPROVED')
    .sort((a, b) => Number(b.user_id === state.mine?.user_id) - Number(a.user_id === state.mine?.user_id));
  const checkedInCount = approved.filter((person) => person.checked_in_at).length;
  const requiredPeers = state.mine?.required_peer_confirmations || approved[0]?.required_peer_confirmations || 2;
  return <section className="sg-attendance-section sg-attendance-roster" aria-label="Người tham gia">
    <div className="sg-attendance-roster-heading"><div className="sg-attendance-roster-title"><Users size={20} aria-hidden="true" /><h4>{peerOpen || ended ? 'Xác nhận người cùng chơi' : 'Người tham gia'} <span>{approved.length}</span></h4></div><span className={`sg-attendance-roster-checkins ${checkedInCount === approved.length && approved.length ? 'is-complete' : ''}`}><CheckCircle2 size={15} aria-hidden="true" /><span><strong>{checkedInCount}/{approved.length}</strong> đã check-in</span></span></div>
    {peerOpen && <div className="sg-attendance-roster-guidance">{approved.length < 2 ? <p>Phòng chưa có đủ 2 người để đối chiếu tham dự. Buổi chưa được tính vào uy tín.</p> : <><p>Đối chiếu theo thực tế tại sân. {requiredPeers === 1 ? 'Phòng có 2 người: cần 1 người còn lại xác nhận có mặt.' : 'Mỗi người cần ít nhất 2 người khác xác nhận có mặt, có thể tính cả chủ phòng.'}</p><p>Chọn “Không tham gia” khi biết người đó đã vắng. Nếu chưa rõ, hãy để trống. Phản hồi mâu thuẫn sẽ tạm chưa tính uy tín.</p>{!state.can_peer_confirm && <p>Gửi phản hồi bạn đã có mặt ở phần trên để xác nhận người cùng chơi. Quên xác nhận hoặc nhập mã vẫn có thể khai báo bổ sung.</p>}</>}</div>}
    {!approved.length && <p>Chưa có người tham gia.</p>}
    <div className="sg-attendance-people">{approved.map((person) => {
      const present = !!person.checked_in_at;
      const confirmed = person.confirmation_status === 'CONFIRMED';
      const status = present ? 'Đã check-in' : confirmed ? 'Đã xác nhận' : CONFIRMATION[person.confirmation_status] || 'Chưa xác nhận';
      const statusLabel = status === CONFIRMATION.UNCONFIRMED ? 'Chưa xác nhận' : status;
      const initials = person.name.trim().split(/\s+/).slice(-2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase('vi-VN');
      const isSelf = person.user_id === state.mine?.user_id;
      const confirmations = person.peer_confirmations || [];
      const absences = person.peer_absences || [];
      const required = person.required_peer_confirmations || 2;
      const myReport = person.my_peer_report;
      const canVote = peerOpen && !isSelf && state.can_peer_confirm;
      const canWithdraw = peerOpen && !isSelf && ['ATTENDED', 'ABSENT'].includes(myReport);
      return <div className={`sg-attendance-person ${present ? 'is-checked-in' : ''} ${isSelf ? 'is-self' : ''}`} role="group" aria-label={isSelf ? `Thông tin của bạn: ${person.name}` : person.name} key={person.user_id}>
      <div className="sg-attendance-person-identity"><span className="sg-attendance-person-avatar" aria-hidden="true">{initials}</span><div className="sg-attendance-person-info"><strong>{isSelf ? person.name : <ProfileLink userId={person.user_id} name={person.name}>{person.name}</ProfileLink>}{isSelf && <span className="sg-attendance-person-you">Bạn</span>}{person.role === 'HOST' && <small><Crown size={11} aria-hidden="true" />Chủ phòng</small>}</strong>
        {present && <p className="sg-attendance-person-time">Check-in lúc {hour(person.checked_in_at)}</p>}
        {!person.has_commitment && <p className="sg-attendance-person-missing">Chưa xác nhận trước buổi</p>}
        {ended && <><p>{person.self_attended == null ? 'Chưa gửi xác nhận sau buổi' : person.self_attended ? person.supplemental_attendance ? 'Đã khai báo có mặt bổ sung' : 'Xác nhận có mặt' : 'Xác nhận không có mặt'}</p><span className={`sg-attendance-person-result ${person.disputed ? 'is-conflicting' : person.outcome === 'ATTENDED' ? 'is-success' : ''}`}>{person.disputed ? 'Phản hồi chưa khớp' : person.outcome === 'ATTENDED' && person.supplemental_attendance ? 'Tham dự đã xác minh bổ sung' : OUTCOME[person.outcome]}</span></>}
        {ended && !isSelf && !person.can_receive_peer_confirmation && <p>Chờ người chơi khai báo đã tham gia.</p>}
        {(peerOpen || ended) && approved.length >= 2 && <div className={`sg-attendance-peer-count ${confirmations.length >= required ? 'is-enough' : ''}`}><span><Users size={13} aria-hidden="true" /><strong>{confirmations.length}/{required}</strong> người khác xác nhận</span>{confirmations.length > 0 && <p>{confirmations.map((peer) => peer.name).join(', ')}</p>}</div>}
        {(peerOpen || ended) && absences.length > 0 && <div className="sg-attendance-peer-absences"><span><X size={13} aria-hidden="true" /><span><strong>{absences.length}</strong> người xác nhận không tham gia</span></span><p>{absences.map((peer) => peer.name).join(', ')}</p></div>}
      </div></div>
      <div className="sg-attendance-person-meta"><span className={`sg-attendance-person-status ${present ? 'is-present' : !ended && confirmed ? 'is-confirmed' : 'is-waiting'}`}>{present || (!ended && confirmed) ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{ended && !present ? 'Chưa check-in' : statusLabel}</span>
      {(canVote || canWithdraw) && <div className="sg-attendance-peer-actions" role="group" aria-label={`Xác nhận tham dự của ${person.name}`}>
        {canVote && <>
          {person.can_receive_peer_confirmation && <button className="sg-attendance-secondary" type="button" aria-pressed={myReport === 'ATTENDED'} disabled={busy} onClick={() => run(() => attendanceService.reportPeer(state.match_id, person.user_id, myReport === 'ATTENDED' ? 'WITHDRAWN' : 'ATTENDED'), myReport === 'ATTENDED' ? 'Đã bỏ xác nhận của bạn. Việc này không tính là báo vắng.' : `Đã xác nhận ${person.name} có mặt.`)}><Check size={14} aria-hidden="true" />{myReport === 'ATTENDED' ? 'Đã xác nhận có mặt' : 'Xác nhận có mặt'}</button>}
          {person.can_receive_peer_absence && <button className="sg-attendance-secondary sg-attendance-peer-absent" type="button" aria-pressed={myReport === 'ABSENT'} disabled={busy} onClick={() => run(() => attendanceService.reportPeer(state.match_id, person.user_id, myReport === 'ABSENT' ? 'WITHDRAWN' : 'ABSENT'), myReport === 'ABSENT' ? 'Đã bỏ xác nhận không tham gia.' : `Đã xác nhận ${person.name} không tham gia. Hệ thống sẽ đối chiếu các phản hồi.`)}><X size={14} aria-hidden="true" />{myReport === 'ABSENT' ? 'Đã xác nhận không tham gia' : 'Xác nhận không tham gia'}</button>}
        </>}
        {canWithdraw && <button className="sg-attendance-text-button sg-attendance-peer-withdraw" type="button" disabled={busy} onClick={() => run(() => attendanceService.reportPeer(state.match_id, person.user_id, 'WITHDRAWN'), 'Đã bỏ xác nhận của bạn.')}>Bỏ xác nhận của tôi</button>}
      </div>}
      {started && !closed && isHost && !isSelf && <div className="sg-attendance-row-actions" role="group" aria-label={`Điểm danh ${person.name}`}><button className="sg-attendance-text-button" type="button" aria-pressed={person.host_report === 'ABSENT'} disabled={busy} onClick={() => run(() => gameRoomService.updateAttendance(state.match_id, person.user_id, person.host_report === 'ABSENT' ? 'ATTENDED' : 'ABSENT'), person.host_report === 'ABSENT' ? 'Đã bỏ báo vắng. Hệ thống sẽ tự đối chiếu lại kết quả.' : 'Đã báo vắng. Kết quả được tự tính vào uy tín khi đủ điều kiện.')}>{person.host_report === 'ABSENT' ? 'Bỏ báo vắng' : 'Báo vắng'}</button></div>}</div>
    </div>; })}</div>
  </section>;
}

export default function AttendanceRoomModal({ roomId, onClose, onChanged, requiredCount = 0, requiredError, onRetry, onLogout }) {
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
    if (lastTerms.current !== next.terms_version || next.checkin_progress?.complete) {
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
  const load = useCallback(async () => {
    const next = await attendanceService.get(roomId);
    applyState(next);
    return next;
  }, [roomId, applyState]);

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
      let next = await action();
      if (next?.match_id && next.policy && next.verification_status) applyState(next);
      else next = await load();
      setNotice(next?.complete ? 'Mọi người đã check-in đầy đủ. Mã check-in đã đóng.' : message);
      onChanged?.(next);
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
    if (event.key === 'Escape' && !busy && !requiredCount) onClose?.();
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
  const isInvitation = mine?.membership_status === 'PENDING' && ['AUTO', 'WAITLIST'].includes(mine?.invite_source);
  const requestExpired = mine?.membership_status === 'EXPIRED' || (ended && mine?.membership_status === 'PENDING');
  const confirmed = mine?.confirmation_status === 'CONFIRMED';
  const checkedIn = !!mine?.checked_in_at;
  const allCheckedIn = !!state?.checkin_progress?.complete;
  const canConfirm = state && serverNow < date(state.confirmation_deadline).getTime();
  // Check-in and peer confirmation share the start-to-grace window.
  // Self reports and host absence reports remain available after that window.
  const checkinStarts = state && date(state.start_time);
  const windowCloses = state && (state.window_closes_at ? date(state.window_closes_at) : new Date(date(state.end_time).getTime() + 30 * 60000));
  const started = state && serverNow >= checkinStarts.getTime();
  const windowOpen = state && started && serverNow < windowCloses.getTime() && !closed;
  const canCheckin = windowOpen;
  const codeLive = !allCheckedIn && issuedCode?.code && date(issuedCode.expires_at).getTime() > serverNow && confirmed;
  const codeSeconds = codeLive ? Math.max(0, Math.ceil((date(issuedCode.expires_at).getTime() - serverNow) / 1000)) : 0;
  const hasReport = mine?.self_occurred != null;
  const step = ended ? 2 : confirmed ? 1 : 0;
  const completedSteps = [confirmed || mine?.has_commitment, checkedIn, ended && mine?.outcome !== 'UNVERIFIED' && !mine?.disputed];
  const supplementalEntry = isApproved && (!mine?.has_commitment || !checkedIn);
  const peerOpen = started && windowOpen;
  const showReport = started && !closed && isApproved && (!hasReport || editingReport);
  const showCancellation = !ended && !closed && isApproved && (isHost || !checkedIn);

  useEffect(() => {
    if (!isHost || !canCheckin || !confirmed || !issuedCode || allCheckedIn) return;
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
          setIssuedCode(next.complete ? null : next);
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
  }, [isHost, canCheckin, confirmed, issuedCode, allCheckedIn, roomId, offset, load]);

  const closesLabel = state ? `Mở đến ${hour(windowCloses.toISOString())}.` : '';
  const hostCheckin = state && <>
      <h4>{codeLive ? 'Mã check-in của buổi chơi' : renewingCode ? 'Đang đổi mã check-in…' : 'Đón người chơi tại sân'}</h4><p>{codeLive ? 'Mã tự đổi mỗi 1 phút. Chỉ chia sẻ với những người đang có mặt tại sân.' : 'Khi đã đến sân, tạo mã check-in để người chơi xác nhận có mặt.'} {closesLabel}</p>
      {codeLive && <div className="sg-attendance-code"><output aria-label="Mã check-in của phòng">{issuedCode.code}</output><span>Đổi mã sau {Math.floor(codeSeconds / 60)}:{String(codeSeconds % 60).padStart(2, '0')}<small>Mã cũ không còn dùng được sau khi đổi.</small></span></div>}
      {!codeLive && state.code_expires_at && date(state.code_expires_at).getTime() > serverNow && <p className="sg-attendance-small">Mã đã tạo không hiển thị lại sau khi đóng cửa sổ. Tạo mã mới sẽ thay thế mã trước đó.</p>}
      <button type="button" className={codeLive ? 'sg-attendance-text-button' : 'sg-primary-button'} disabled={busy} onClick={() => run(async () => { const issued = await attendanceService.openCode(roomId); setIssuedCode(issued.complete ? null : issued); return issued; }, 'Đã tạo mã check-in. Mã mới thay thế mã cũ.')}>{codeLive ? 'Đổi mã check-in' : state.code_expires_at ? 'Tạo mã check-in mới' : 'Tạo mã check-in'}</button>
      {checkedIn && <p className="sg-attendance-small"><CheckCircle2 size={14} />Bạn đã check-in lúc {hour(mine.checked_in_at)}.</p>}
    </>;
  const playerCheckin = state && <>
      <h4>{ended ? 'Bạn chưa check-in' : 'Bạn đã đến sân chưa?'}</h4><p>Nhập mã 6 số do chủ phòng cung cấp khi bạn có mặt tại sân. {closesLabel}</p>
      <form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => attendanceService.checkin(roomId, code), 'Check-in thành công.'); }}>
        <label htmlFor="attendance-code">Mã check-in</label><div className="sg-attendance-checkin-input"><input id="attendance-code" value={code} inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" required placeholder="000000" onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /><button type="submit" className="sg-primary-button" disabled={busy || code.length !== 6}>Check-in tại sân</button></div>
      </form>
    </>;
  // While the window is open, check-in sits above the attendance report instead of replacing it.
  const inlineCheckin = canCheckin && confirmed && !allCheckedIn && (isHost ? hostCheckin : !checkedIn && playerCheckin);

  let action;
  if (state) {
    if (closed) action = <><h4>{state.low_attendance?.cancelled_for_low_attendance ? 'Buổi chơi đã hủy vì thiếu người' : 'Buổi chơi đã được hủy'}</h4><p>Bạn không cần check-in hay gửi xác nhận. Buổi này không làm giảm uy tín của bạn.</p></>;
    else if (requestExpired) action = <><h4>{mine?.response_deadline ? 'Đã hết hạn giữ chỗ' : 'Yêu cầu tham gia đã hết hạn'}</h4><p>{mine?.response_deadline ? 'Bạn chưa nhận chỗ/xác nhận trong thời hạn nên suất đã mở lại. Bạn không bị tính bùng kèo, không cần đánh giá và không bị trừ uy tín. Có thể đăng ký lại từ danh sách phòng nếu còn chỗ.' : 'Buổi chơi đã kết thúc trước khi yêu cầu của bạn được duyệt. Bạn không được ghi nhận tham gia, không cần đánh giá và không bị ảnh hưởng uy tín.'}</p></>;
    else if (isInvitation) action = <><h4>Có suất chơi dành cho bạn</h4><p>Kiểm tra lịch, sân và chi phí ở trên. {mine.response_deadline && <>Nhận chỗ trước <strong>{time(mine.response_deadline)}</strong>. </>}Hết hạn sẽ chuyển lượt; không nhận lời mời không ảnh hưởng uy tín.</p>{mine.response_deadline && <p className="sg-seat-summary"><strong>{responseTimeLeft(mine.response_deadline, serverNow)}</strong> để nhận chỗ.</p>}<form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => gameRoomService.respondInvite(roomId, 'ACCEPT', { accepted_policy: accepted, terms_version: state.terms_version }), 'Đã nhận chỗ và xác nhận sẽ đến.'); }}><label className="sg-attendance-consent"><input type="checkbox" required checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Tôi đã đọc thông tin buổi chơi và xác nhận sẽ đến.</span></label><button className="sg-primary-button" disabled={busy || !accepted || !canConfirm}>Nhận chỗ & xác nhận</button><button type="button" className="sg-attendance-secondary" disabled={busy} onClick={() => run(() => gameRoomService.respondInvite(roomId, 'REJECT'), 'Đã từ chối lời mời. Uy tín không bị ảnh hưởng.')}>Từ chối lời mời</button></form></>;
    else if (mine?.membership_status === 'WAITLISTED') action = <><h4>Bạn đang trong danh sách dự bị</h4><p>Khi có suất trống, SportGo sẽ gửi lời mời có thời hạn để bạn chủ động nhận chỗ. Dưới 30 phút trước giờ chơi, chủ phòng xử lý trực tiếp.</p><button type="button" className="sg-attendance-secondary" disabled={busy} onClick={() => run(() => gameRoomService.leave(roomId, 'Rút đăng ký dự bị'), 'Đã rút đăng ký dự bị.')}>Rút đăng ký dự bị</button></>;
    else if (mine?.membership_status === 'PENDING') action = <><h4>Đang chờ chủ phòng duyệt</h4><p>Sau khi được duyệt, bạn có thể xác nhận tham gia và check-in tại sân.</p></>;
    else if (!isApproved) action = <><h4>{CONFIRMATION[mine?.confirmation_status] || 'Bạn chưa tham gia buổi này'}</h4><p>{mine?.cancellation_reason || 'Bạn có thể xem lại thông tin và lịch sử của mình bên dưới.'}</p></>;
    else if (!requiredCount && ended && state.low_attendance?.approved_count < 2 && state.verification_status === 'UNVERIFIED') action = <><h4>Buổi chơi chưa đủ người để đối chiếu</h4><p>Phòng chỉ có {state.low_attendance.approved_count} người đã được duyệt nên chưa thể xác minh tham dự. {isHost ? 'Nếu buổi không diễn ra, hãy hủy vì thiếu người ở phía trên để kết thúc điểm danh.' : 'Chủ phòng có thể hủy vì thiếu người để kết thúc điểm danh.'} Buổi này chưa được tính vào uy tín.</p></>;
    else if (ended || (started && !closed && (confirmed || !canConfirm))) action = <>
      {inlineCheckin && <div className="sg-attendance-late-checkin">{inlineCheckin}</div>}
      {!ended && <p className="sg-attendance-small">Báo có mặt và xác nhận người cùng chơi được mở ngay trong buổi. Xác nhận chéo {closesLabel}</p>}
      {ended && !windowOpen && !hasReport && <p className="sg-attendance-small">Đã hết thời gian xác nhận ({hour(windowCloses.toISOString())}). Buổi này không được tính vào uy tín của bạn.</p>}
      <h4>{mine.disputed ? 'Phản hồi chưa khớp' : mine.outcome !== 'UNVERIFIED' ? mine.outcome === 'ATTENDED' && mine.supplemental_attendance ? 'Đã xác minh tham dự bổ sung' : OUTCOME[mine.outcome] : hasReport ? supplementalEntry && mine.self_attended ? 'Đang đối chiếu bổ sung' : 'Đã gửi xác nhận sau buổi' : supplementalEntry ? 'Bạn có tham gia buổi chơi này không?' : 'Buổi chơi của bạn thế nào?'}</h4>
      <p>{requiredCount && !hasReport ? 'Chọn theo đúng thực tế. Nếu không đến sân, hãy chọn “Tôi không có mặt”.' : mine.disputed ? 'Các phản hồi về bạn chưa khớp nên kết quả chưa được tính vào uy tín. Hãy kiểm tra xác nhận của bạn và trao đổi với người cùng chơi để cập nhật đúng thực tế.' : mine.outcome === 'ATTENDED' ? mine.supplemental_attendance ? 'Người cùng chơi đã xác nhận bạn có mặt. Lượt tham dự được ghi nhận qua đối chiếu bổ sung.' : 'Lượt tham dự này đã được ghi nhận vào hồ sơ uy tín của bạn.' : mine.outcome === 'NO_SHOW' ? 'Bạn đã cam kết tham gia và được chủ phòng báo vắng trong buổi chơi đã xác minh. Kết quả đã được tính vào uy tín. Nếu chưa đúng, hãy gửi hoặc sửa xác nhận của bạn và liên hệ chủ phòng cập nhật điểm danh.' : (hasReport ? mine.self_attended ? 'Người cùng chơi cần xác nhận bạn có mặt để hoàn tất đối chiếu.' : 'Đã ghi nhận bạn không tham gia. Hệ thống sẽ đối chiếu với chủ phòng và người cùng chơi; kết quả chỉ ảnh hưởng uy tín khi đủ điều kiện.' : supplementalEntry ? 'Bạn đã được duyệt vào phòng. Nếu thực sự có mặt nhưng quên xác nhận hoặc nhập mã, hãy khai báo bổ sung để người cùng chơi đối chiếu.' : 'Cho biết buổi có diễn ra và bạn có mặt không để hoàn tất điểm danh.')}</p>
      {showReport && <form className="sg-attendance-form" onSubmit={async (event) => { event.preventDefault(); const saved = await run(() => attendanceService.report(roomId, { occurred: occurred === 'true', attended: attended === 'true' }), 'Đã lưu xác nhận sau buổi chơi.'); if (saved) { reportDirty.current = false; setEditingReport(false); } }}>
        <div className="sg-attendance-form-grid">
          <label>Buổi chơi có diễn ra không?<select required value={occurred} onChange={(event) => { reportDirty.current = true; setOccurred(event.target.value); if (event.target.value === 'false') setAttended('false'); }}><option value="">Chọn kết quả</option><option value="true">Có diễn ra</option><option value="false">Không diễn ra</option></select></label>
          <label>Bạn có tham gia không?<select required value={attended} onChange={(event) => { reportDirty.current = true; setAttended(event.target.value); }}><option value="">Chọn kết quả</option><option value="true" disabled={occurred === 'false'}>Tôi có mặt</option><option value="false">Tôi không có mặt</option></select></label>
        </div>{supplementalEntry && !requiredCount && <p className="sg-attendance-small">Khai báo có mặt cần ít nhất {mine.required_peer_confirmations || 2} người khác xác nhận. Trạng thái chưa xác nhận trước buổi và chưa check-in bằng mã vẫn được giữ đúng.</p>}<button type="submit" className="sg-primary-button" disabled={busy || !occurred || !attended}>{requiredCount ? 'Gửi phản hồi và tiếp tục' : supplementalEntry ? 'Gửi khai báo bổ sung' : 'Gửi xác nhận sau buổi'}</button>
      </form>}
      {hasReport && !editingReport && <button className="sg-attendance-text-button" type="button" onClick={() => setEditingReport(true)}>Sửa xác nhận của tôi</button>}
      {hasReport && mine.self_attended && !mine.disputed && <div className="sg-attendance-next">Bạn đã được <strong>{mine.peer_confirmations?.length || 0}/{mine.required_peer_confirmations || 2} người khác</strong> xác nhận có mặt. {mine.outcome === 'UNVERIFIED' && 'Kết quả được ghi nhận khi đủ xác nhận chéo và buổi đã được xác minh.'}</div>}
    </>;
    else if (!confirmed) action = <>
      <h4>{canConfirm ? 'Bạn sẽ tham gia buổi này chứ?' : mine?.response_deadline ? 'Hạn giữ chỗ đã kết thúc' : 'Bạn chưa xác nhận trước buổi'}</h4><p>{canConfirm ? 'Kiểm tra lịch, địa điểm và chi phí ở trên trước khi xác nhận.' : mine?.response_deadline ? 'Suất sẽ mở lại vì đã hết hạn xác nhận. Trạng thái đang được cập nhật; bạn không bị tính bùng kèo hoặc trừ uy tín.' : 'Bạn đã được duyệt nên vẫn có thể đến sân. Sau buổi, hãy khai báo có mặt để người cùng chơi xác nhận bổ sung. Chưa xác nhận không tự động bị tính vắng.'}</p>
      {canConfirm && <form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => attendanceService.confirm(roomId, state.terms_version), 'Đã xác nhận tham gia.'); }}>
        <label className="sg-attendance-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>Tôi đã đọc thông tin buổi chơi và sẽ đến tham gia.</span></label>
        <div className="sg-attendance-submit-row"><button type="submit" className="sg-primary-button" disabled={busy || !accepted}>Tôi sẽ tham gia</button><small>Xác nhận trước {time(state.confirmation_deadline)}{mine?.response_deadline && <><br />{responseTimeLeft(mine.response_deadline, serverNow)}</>}</small></div>
        <p className="sg-attendance-small">{mine?.response_deadline ? 'Chỗ đang được giữ tạm đến hạn trên. Hết hạn chưa xác nhận, suất sẽ mở lại; bạn không bị tính bùng kèo hoặc trừ uy tín.' : 'Nếu không thể đến, hãy hủy tham gia để chủ phòng biết. Hủy sát giờ được ghi nhận riêng. Vắng không báo được tự tính vào uy tín khi đủ điều kiện.'}</p>
      </form>}
    </>;
    else if (isHost && allCheckedIn) action = <><h4><CheckCircle2 size={22} />Mọi người đã check-in đầy đủ</h4><p>Đã ghi nhận {state.checkin_progress.checked_in}/{state.checkin_progress.total} người. Mã check-in đã đóng.</p><div className="sg-attendance-next">Sau {hour(state.end_time)}, quay lại để xác nhận kết quả buổi chơi.</div></>;
    else if (isHost && canCheckin) action = hostCheckin;
    else if (checkedIn) action = <><h4><CheckCircle2 size={22} />Bạn đã check-in</h4><p>Đã ghi nhận lúc {hour(mine.checked_in_at)}. Chúc bạn có một buổi chơi vui!</p><div className="sg-attendance-next">Sau {hour(state.end_time)}, quay lại đây để xác nhận kết quả buổi chơi.</div></>;
    else if (canCheckin) action = playerCheckin;
    else action = <><h4><CheckCircle2 size={22} />Đã xác nhận tham gia</h4><p>Hẹn gặp bạn tại sân. Check-in mở từ {time(checkinStarts.toISOString())}.</p><div className="sg-attendance-next">{isHost ? 'Khi đến sân, quay lại đây để tạo mã check-in cho người chơi.' : 'Khi đến sân, lấy mã từ chủ phòng và check-in tại đây.'}</div></>;
  }

  return <div className="sg-modal-backdrop sg-attendance-backdrop">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="attendance-title" className="sg-modal-card sg-attendance-modal" onKeyDown={handleKey}>
      <header className="sg-modal-header sg-attendance-header"><div className="sg-attendance-title"><ClipboardCheck size={22} /><div><h3 id="attendance-title">{requiredCount ? 'Phản hồi sau buổi chơi' : 'Điểm danh buổi chơi'}</h3><p>{state?.title || 'Đang tải thông tin…'}</p></div></div>{!requiredCount && <button type="button" className="sg-modal-close" onClick={onClose} disabled={busy} aria-label="Đóng điểm danh buổi chơi"><X size={20} /></button>}</header>
      <div className="sg-modal-body sg-attendance-body" aria-busy={busy}>
        {requiredCount > 0 && <section className="sg-attendance-required" aria-label="Phản hồi bắt buộc"><div><ClipboardCheck size={20} aria-hidden="true" /><strong>Hoàn tất phản hồi để tiếp tục</strong></div><p>Còn {requiredCount} buổi cần phản hồi. Cho biết buổi có diễn ra và bạn có tham gia không. Gửi xong là có thể tiếp tục; bạn không cần chờ người khác xác nhận.</p>{requiredError && <p role="alert">{requiredError} <button type="button" className="sg-attendance-text-button" onClick={onRetry}>Kiểm tra lại</button></p>}</section>}
        {error && <p role="alert" className="sg-attendance-error">{error}<button type="button" className="sg-attendance-text-button" disabled={busy} onClick={() => run(() => attendanceService.get(roomId), 'Đã tải lại thông tin.')}>Tải lại</button></p>}
        <p role="status" className="sg-attendance-sr-only">{busy ? 'Đang lưu…' : notice}</p>
        {!state && !error && <p className="sg-attendance-loading"><LoaderCircle className="animate-spin" size={20} />Đang tải buổi chơi…</p>}
        {state && <>
          <div className="sg-attendance-summary"><div className="sg-attendance-summary-top"><span><CalendarDays size={16} />{day(state.start_time)} · {hour(state.start_time)} – {hour(state.end_time)}</span><strong>{state.price_info != null && state.price_info !== '' ? formatStoredCost(state.price_info) : 'Chưa có chi phí'}</strong></div><p><MapPin size={16} /><span>{state.location || 'Chưa có địa điểm. Hãy liên hệ chủ phòng.'}</span></p></div>
          {!requiredCount && !closed && isApproved && <ol className="sg-attendance-steps" aria-label="Các bước tham gia">{['Xác nhận tham gia', 'Check-in tại sân', 'Kết quả buổi chơi'].map((label, index) => <li key={label} className={completedSteps[index] ? 'is-done' : index === step ? 'is-current' : ''} aria-current={index === step ? 'step' : undefined}><span>{completedSteps[index] ? <Check size={12} /> : index + 1}</span>{label}</li>)}</ol>}
          {!requiredCount && (ended || closed) && <div className={`sg-attendance-status status-${requestExpired ? 'expired' : state.verification_status.toLowerCase()}`}>{requestExpired ? <Clock3 size={16} /> : <ShieldCheck size={16} />}<strong>{closed ? VERIFICATION.CANCELLED : requestExpired ? 'Buổi chơi đã kết thúc' : VERIFICATION[state.verification_status]}</strong></div>}
          {!requiredCount && !closed && state.low_attendance?.needs_decision && <LowAttendanceNotice state={state} ended={ended} isHost={isHost} busy={busy} run={run} />}
          <section className={`sg-attendance-action ${checkedIn || mine?.outcome === 'ATTENDED' ? 'is-success' : ''}`}>{action}</section>
          {requiredCount > 0 && isHost && !closed && state.low_attendance?.needs_decision && <LowAttendanceNotice state={state} ended={ended} isHost={isHost} busy={busy} run={run} />}
          {!requiredCount && (state.can_manage || (started && state.participants.length > 0)) && <Participants state={state} started={started} ended={ended} closed={closed} peerOpen={peerOpen} isHost={isHost} busy={busy} run={run} />}
          {showCancellation && <Disclosure title={isHost ? 'Hủy buổi chơi' : 'Tôi không thể tham gia'} className="sg-attendance-cancellation">{isHost ? <>
            <p>Buổi chơi sẽ bị hủy với tất cả thành viên và được gỡ khỏi danh sách tìm trận. Lịch sử vẫn được giữ; người chơi không bị tính vắng.</p><form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => gameRoomService.remove(roomId), 'Đã hủy buổi chơi.'); }}><label className="sg-attendance-consent"><input type="checkbox" required checked={cancelAccepted} onChange={(event) => setCancelAccepted(event.target.checked)} /><span>Tôi muốn hủy buổi chơi cho tất cả thành viên.</span></label><button className="sg-attendance-secondary sg-attendance-danger" type="submit" disabled={busy || !cancelAccepted}>Xác nhận hủy buổi chơi</button></form>
          </> : <><p>Hãy báo cho chủ phòng biết lý do. Hủy trong {state.policy.late_cancel_minutes} phút trước giờ bắt đầu được ghi nhận là hủy sát giờ.</p><form className="sg-attendance-form" onSubmit={(event) => { event.preventDefault(); run(() => gameRoomService.leave(roomId, reason.trim()), 'Đã hủy tham gia và thông báo cho chủ phòng.'); }}><label>Lý do hủy<textarea required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="sg-attendance-secondary sg-attendance-danger" type="submit" disabled={busy || reason.trim().length < 3}>Xác nhận hủy tham gia</button></form></>}</Disclosure>}
          <div className="sg-attendance-extras">
            <Disclosure title="Quy định tham gia"><ul><li>Sau giờ bắt đầu {state.low_attendance?.grace_minutes || 15} phút (hoặc khi buổi kết thúc nếu ngắn hơn), nếu chưa ghi nhận đủ 2 người có mặt, chủ phòng có thể tiếp tục hoặc hủy vì thiếu người. Hủy vì thiếu người không ảnh hưởng uy tín.</li><li>Hủy trong {state.policy.late_cancel_minutes} phút trước giờ bắt đầu được ghi nhận là hủy sát giờ; lượt hủy hiển thị riêng, không trừ điểm.</li><li>Check-in mở từ giờ bắt đầu đến {state.policy.after_end_minutes ?? 30} phút sau khi buổi chơi kết thúc, để mọi người chơi xong vẫn kịp check-in. Mã tự đổi mỗi 1 phút khi chủ phòng mở màn hình check-in và còn người chưa check-in; mã sẽ đóng khi tất cả thành viên đã được duyệt đều check-in.</li><li>Từ giờ bắt đầu, người chơi có thể báo buổi có diễn ra và mình có mặt không; chủ phòng báo vắng bất cứ lúc nào sau khi buổi bắt đầu. Xác nhận chéo đóng sau {state.policy.after_end_minutes ?? 30} phút kể từ khi buổi kết thúc. Check-in hoặc đủ xác nhận chéo được dùng để đối chiếu.</li><li>Mỗi người cần ít nhất 2 người khác xác nhận có mặt; phòng chỉ có 2 người cần 1 người còn lại. Tự xác nhận không tính vào số này. Người đánh giá phải ở trong phòng và đã gửi phản hồi có mặt.</li><li>Người đã được duyệt vẫn có thể tham gia dù quên xác nhận hoặc nhập mã. Sau buổi, khai báo có mặt để đối chiếu bổ sung; việc này không tạo cam kết trước buổi hay lượt check-in bằng mã.</li><li>Thiếu xác nhận chéo hoặc thiếu check-in chưa đủ để kết luận vắng. Vắng không báo được tự tính khi đã cam kết, chủ phòng báo vắng, buổi chơi đã xác minh và không có check-in hay tranh chấp.</li></ul></Disclosure>
            <Disclosure title="Lịch sử hoạt động"><AttendanceHistory events={state.events} viewerId={mine?.user_id} /></Disclosure>
          </div>
        </>}
      </div>
      {requiredCount > 0 && <footer className="sg-attendance-required-footer"><span>Phản hồi theo đúng thực tế, kể cả khi bạn không tham gia.</span><button type="button" className="sg-attendance-text-button" disabled={busy} onClick={onLogout}>Đăng xuất</button></footer>}
    </section>
  </div>;
}
