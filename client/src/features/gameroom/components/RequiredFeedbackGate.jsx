import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardCheck, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { attendanceService } from '../../../shared/services/api';
import AttendanceRoomModal from './AttendanceRoomModal';

const timestamp = (value) => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`).getTime();

export default function RequiredFeedbackGate({ children }) {
  const { logout } = useAuth();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState(null);
  const [hasEntered, setHasEntered] = useState(false);
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const next = await attendanceService.requiredFeedback();
      if (!mounted.current || version !== requestVersion.current) return;
      setQueue({ ...next, receivedAt: Date.now() });
      if (!next.room) setHasEntered(true);
      setError(null);
    } catch (failure) {
      if (mounted.current && version === requestVersion.current) {
        setError({ message: failure.message || 'Chưa kiểm tra được các buổi cần phản hồi. Hãy thử lại.', at: Date.now() });
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initial = window.setTimeout(refresh, 0);
    const update = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh]);

  useEffect(() => {
    if (!queue?.next_end_time) return undefined;
    // Schedule against server time so device clock skew cannot postpone the prompt.
    const delay = Math.min(2147483000, Math.max(0, timestamp(queue.next_end_time) - timestamp(queue.server_time)) + 50);
    const timer = window.setTimeout(refresh, delay);
    return () => window.clearTimeout(timer);
  }, [queue, refresh]);

  const missedDeadline = error && queue?.next_end_time
    && timestamp(queue.next_end_time) - timestamp(queue.server_time) <= error.at - queue.receivedAt;
  let blocker = null;
  if (!queue || missedDeadline) blocker = <main className="sg-app sg-required-feedback-check" aria-busy={!error}>
    <div className="sg-panel">
      {error ? <ClipboardCheck size={28} aria-hidden="true" /> : <LoaderCircle className="animate-spin" size={28} aria-hidden="true" />}
      <h1>{error ? 'Chưa tải được phản hồi sau buổi' : 'Đang kiểm tra buổi chơi của bạn…'}</h1>
      {error && <><p role="alert">{error.message}</p><button className="sg-primary-button" type="button" onClick={refresh}>Thử lại</button></>}
      <button className="sg-attendance-text-button" type="button" onClick={logout}>Đăng xuất</button>
    </div>
  </main>;

  else if (queue.room) blocker = <div className="sg-app sg-required-feedback-shell">
    <AttendanceRoomModal key={queue.room.match_id} roomId={queue.room.match_id}
      requiredCount={queue.pending_count} requiredError={error?.message} onRetry={refresh}
      onChanged={refresh} onLogout={logout} />
  </div>;

  return <>
    {hasEntered && <div hidden={!!blocker} inert={!!blocker}>{children}</div>}
    {blocker}
  </>;
}
