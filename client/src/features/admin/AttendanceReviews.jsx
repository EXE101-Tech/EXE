import { useCallback, useEffect, useState } from 'react';
import { reputationService } from '../../shared/services/api';
import AttendanceRoomModal from '../gameroom/components/AttendanceRoomModal';

export default function AttendanceReviews() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setRooms(await reputationService.getReviews()); setError(''); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  return <section className="sg-attendance-admin rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-black">Đối chiếu điểm danh và uy tín</h2><button type="button" onClick={load} disabled={loading} className="sg-attendance-secondary">Tải lại</button></div>
    <p className="mt-2 text-sm text-slate-400">Kiểm tra cam kết và bằng chứng trước khi ghi nhận vắng không báo. Buổi chưa xác minh không tự trừ điểm.</p>
    {error && <p role="alert" className="mt-4 text-rose-300">{error}</p>}
    {loading ? <p className="mt-4">Đang tải báo cáo điểm danh…</p> : rooms.length ? <div className="mt-4 space-y-3">{rooms.map((room) => <article key={room.match_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><h3 className="font-bold">{room.title}</h3><p className="text-sm text-slate-400">{room.verification_status === 'DISPUTED' ? 'Buổi chơi có phản hồi mâu thuẫn' : 'Có điểm danh cần kiểm tra'}</p></div><button type="button" className="sg-primary-button" onClick={() => setRoomId(room.match_id)}>Xem bằng chứng và xử lý</button></article>)}</div> : <p className="mt-6 text-sm text-slate-400">Chưa có báo cáo điểm danh cần xử lý.</p>}
    {roomId && <AttendanceRoomModal key={roomId} roomId={roomId} onClose={() => setRoomId(null)} onChanged={load} />}
  </section>;
}
