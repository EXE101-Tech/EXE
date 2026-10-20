import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { reputationService } from '../../shared/services/api';

export default function ReputationPanel({ userId }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => reputationService.get(userId).then((data) => { setSummary(data); setError(''); }).catch((failure) => setError(failure.message)), [userId]);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (active && document.visibilityState === 'visible') load(); };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  return <section className="sg-panel sg-reputation-panel" aria-labelledby="reputation-heading">
    <div className="sg-reputation-heading"><ShieldCheck size={23} /><div><h2 id="reputation-heading">Uy tín tham gia</h2><p>Dựa trên những buổi có bằng chứng đối chiếu.</p></div></div>
    {error && <p role="alert">{error} <button type="button" className="sg-attendance-secondary" onClick={load}>Thử lại</button></p>}
    {!summary && !error && <p>Đang tải hồ sơ uy tín…</p>}
    {summary && <>
      <div className="sg-reputation-overview"><div className="sg-reputation-score"><strong>{summary.score == null ? '—' : summary.score}</strong><span>{summary.score == null ? 'Chưa đủ dữ liệu' : 'trên 100 điểm'}</span></div><div><p><strong>{summary.verified_attended}</strong> buổi tham dự đã xác minh</p><p><strong>{summary.reviewed_no_shows}</strong> lần vắng không báo đã kiểm duyệt</p><p>{summary.late_cancellations} lần hủy sát giờ · {summary.early_cancellations} lần hủy sớm</p>{summary.score == null && <p>Cần ít nhất {summary.minimum_samples} buổi có kết quả đủ điều kiện để hiển thị điểm.</p>}</div></div>
      <p className="sg-attendance-small">{summary.explanation}</p>
      {summary.supplemental_attended > 0 && <p className="sg-attendance-small">Trong số các buổi đã xác minh, có {summary.supplemental_attended} buổi được đối chiếu bổ sung do thiếu xác nhận trước buổi hoặc check-in bằng mã.</p>}
      <p className="sg-attendance-small">{summary.verified_committed_attendance ?? summary.verified_attended}/{summary.eligible_commitments} cam kết trong buổi đã xác minh có lượt tham dự được đối chiếu. Tỷ lệ vắng không báo đã kiểm duyệt: {summary.no_show_rate == null ? 'chưa có dữ liệu' : `${summary.no_show_rate}%`}. Cam kết còn thiếu bằng chứng chưa được tính là có mặt hay vắng.</p>
      <p className="sg-attendance-small">Đã mở {summary.hosted_sessions} buổi · Đã hủy {summary.cancelled_hosted_sessions} buổi với vai trò chủ phòng.{summary.pending_reviews > 0 ? ` Có ${summary.pending_reviews} kết quả cần kiểm duyệt.` : ''}</p>
      <Link className="sg-attendance-secondary" to="/matches?view=mine">Xem các buổi và lịch sử xác nhận</Link>
    </>}
  </section>;
}
