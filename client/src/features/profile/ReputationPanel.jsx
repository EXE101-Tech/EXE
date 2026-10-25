import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronDown, CircleMinus, History, ShieldCheck, UserRoundX } from 'lucide-react';
import { reputationService } from '../../shared/services/api';

export default function ReputationPanel({ userId, embedded = false, own = true, summary: provided = null }) {
  const [summary, setSummary] = useState(provided);
  const [error, setError] = useState('');
  const load = useCallback(() => reputationService.get(userId).then((data) => { setSummary(data); setError(''); }).catch((failure) => setError(failure.message)), [userId]);
  useEffect(() => {
    if (provided) return undefined;
    let active = true;
    const refresh = () => { if (active && document.visibilityState === 'visible') load(); };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; document.removeEventListener('visibilitychange', refresh); };
  }, [load, provided]);

  const attended = summary?.verified_attended ?? 0;
  const noShows = summary?.no_shows ?? summary?.reviewed_no_shows ?? 0;
  const earlyCancellations = summary?.early_cancellations ?? 0;
  const lateCancellations = summary?.late_cancellations ?? 0;
  const samples = summary?.sample_count ?? attended + noShows;
  const minimum = summary?.minimum_samples ?? 5;
  const remaining = Math.max(0, minimum - samples);
  const hasScore = summary?.score != null;
  const windowDays = summary?.window_days ?? 180;

  return <section className={`sg-reputation-panel ${embedded ? 'sg-reputation-embedded' : 'sg-panel'}`} aria-labelledby="reputation-heading">
    <header className="sg-reputation-heading">
      <span className="sg-reputation-heading-icon"><ShieldCheck size={23} aria-hidden="true" /></span>
      <div><h2 id="reputation-heading">Uy tín tham gia</h2><p>Từ kết quả những buổi chơi đã được đối chiếu.</p></div>
      {summary && <span className="sg-reputation-window"><CalendarDays size={14} aria-hidden="true" />{windowDays} ngày gần nhất</span>}
    </header>
    {error && <p className="sg-reputation-feedback" role="alert">{error} <button type="button" className="sg-attendance-secondary" onClick={load}>Thử lại</button></p>}
    {!summary && !error && <p className="sg-reputation-feedback" role="status">Đang tải hồ sơ uy tín…</p>}
    {summary && <>
      <div className="sg-reputation-overview">
        <div className={`sg-reputation-score ${hasScore ? 'has-score' : 'is-building'}`}>
          <span className="sg-reputation-score-label">{hasScore ? (own ? 'Điểm uy tín của bạn' : 'Điểm uy tín') : 'Chưa đủ dữ liệu để chấm điểm'}</span>
          <div className="sg-reputation-score-value"><strong>{hasScore ? summary.score : samples}</strong><span>/ {hasScore ? '100' : minimum}<small>{hasScore ? 'điểm' : 'buổi có kết quả'}</small></span></div>
          {hasScore ? <p>Dựa trên <strong>{samples} buổi có kết quả</strong> trong {windowDays} ngày gần nhất.</p> : <>
            <progress className="sg-reputation-progress" max={minimum} value={Math.min(samples, minimum)} aria-label="Tiến độ hiển thị điểm uy tín" aria-valuetext={`${samples} trên ${minimum} buổi có kết quả`} />
            <p>{remaining > 0 ? <>Còn <strong>{remaining} buổi có kết quả</strong> để hiển thị điểm uy tín.</> : 'Điểm uy tín sẽ cập nhật khi các kết quả đủ điều kiện được tổng hợp.'}</p>
          </>}
        </div>
        <div className="sg-reputation-record">
          <dl className="sg-reputation-results">
            <div className="sg-reputation-result is-attended"><dt><CheckCircle2 size={17} aria-hidden="true" />Tham dự đã xác minh</dt><dd>{attended}<span>buổi</span></dd></div>
            <div className={`sg-reputation-result ${noShows > 0 ? 'has-no-shows' : ''}`}><dt><UserRoundX size={17} aria-hidden="true" />Vắng không báo</dt><dd>{noShows}<span>lần</span></dd></div>
          </dl>
          <div className="sg-reputation-cancellations">
            <div><CircleMinus size={17} aria-hidden="true" /><strong>Hủy tham gia</strong><span className="sg-reputation-neutral-note">Không trừ điểm</span></div>
            <p><span><strong>{lateCancellations}</strong> lần hủy sát giờ</span><span><strong>{earlyCancellations}</strong> lần hủy sớm</span></p>
          </div>
          {own && <Link className="sg-reputation-history-link" to="/matches?view=joined"><History size={16} aria-hidden="true" />Xem lịch sử tham gia</Link>}
        </div>
      </div>
      <details className="sg-reputation-details">
        <summary>Cách tính uy tín<ChevronDown size={16} aria-hidden="true" /></summary>
        <div className="sg-reputation-details-body">
          <p className="sg-reputation-formula">Điểm = Số buổi tham dự đã xác minh ÷ Tổng số buổi có kết quả × 100</p>
          <p>Buổi có kết quả gồm lượt tham dự đã xác minh và lần vắng không báo. Cần ít nhất {minimum} buổi trong {windowDays} ngày gần nhất để hiển thị điểm.</p>
          <ul>
            <li>Vắng chỉ được tính khi {own ? 'bạn' : 'người chơi'} đã cam kết, chủ phòng báo vắng, buổi chơi đã xác minh và không có check-in hay phản hồi mâu thuẫn.</li>
            <li>Hủy sớm và hủy sát giờ được ghi nhận riêng. Buổi bị hủy, chưa được xác minh hoặc có phản hồi mâu thuẫn chưa được dùng để trừ điểm.</li>
            {summary.supplemental_attended > 0 && <li>Có {summary.supplemental_attended} buổi tham dự được xác minh bổ sung dù thiếu xác nhận trước buổi hoặc check-in bằng mã.</li>}
          </ul>
          <dl className="sg-reputation-context">
            <div><dt>Các buổi đã cam kết</dt><dd>{summary.eligible_commitments > 0 ? `${summary.verified_committed_attendance ?? attended}/${summary.eligible_commitments} buổi đã xác minh có tham dự` : 'Chưa có cam kết ở buổi đã xác minh'}</dd></div>
            <div><dt>Tỷ lệ vắng trên cam kết</dt><dd>{summary.no_show_rate == null ? 'Chưa có dữ liệu' : `${summary.no_show_rate}%`}</dd></div>
            <div><dt>Vai trò chủ phòng</dt><dd>Đã mở {summary.hosted_sessions ?? 0} buổi, đã hủy {summary.cancelled_hosted_sessions ?? 0} buổi</dd></div>
          </dl>
        </div>
      </details>
    </>}
  </section>;
}
