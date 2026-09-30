import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, MapPin, MessageCircle, Star, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useChat } from '../../shared/context/ChatContext';
import { resolveMediaUrl, teamService } from '../../shared/services/api';
import ReviewTeamModal from './components/ReviewTeamModal';
import TeamPremiumSettingsModal from './components/TeamPremiumSettingsModal';

export default function TeamDetailPage() {
  const { id } = useParams();
  const { openChat } = useChat();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [premiumSettingsOpen, setPremiumSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const teamData = await teamService.getById(id);
      setTeam(teamData);
      setError('');
      const [memberData, reviewData] = await Promise.allSettled([teamService.getMembers(id, 'APPROVED'), teamService.getReviews(id)]);
      setMembers(memberData.status === 'fulfilled' ? memberData.value : []);
      setReviews(reviewData.status === 'fulfilled' ? reviewData.value : []);
    } catch (loadError) { setError(loadError.message || 'Không tải được thông tin CLB.'); }
  }, [id]);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const join = async () => {
    setBusy(true);
    try { await teamService.join(id); await load(); }
    catch (joinError) { setError(joinError.message || 'Không thể gửi yêu cầu tham gia.'); }
    finally { setBusy(false); }
  };

  return <main className="sg-team-detail-page"><Link to="/team" className="sg-premium-back"><ArrowLeft size={16} /> Khám phá CLB</Link>
    {error && <div role="alert" className="sg-notice sg-error">{error}</div>}
    {!team ? !error && <div className="sg-skeleton sg-loading-card" /> : <>
      <div className="sg-team-detail-hero sg-panel">{team.image_url && <div className="sg-team-detail-cover"><img src={resolveMediaUrl(team.image_url)} alt="" /></div>}<div className="sg-team-detail-intro"><span className="sg-eyebrow">{team.sport_name || 'CỘNG ĐỒNG THỂ THAO'}</span><h1>{team.name}</h1><p>{team.description || 'Một cộng đồng dành cho những người yêu thể thao.'}</p><div className="sg-team-detail-meta"><span><MapPin size={15} /> {team.location}</span><span><Users size={15} /> {team.member_count} thành viên</span>{team.rating_count > 0 && <span><Star size={15} /> {Number(team.rating).toFixed(1)} ({team.rating_count} đánh giá)</span>}</div><div className="sg-team-detail-actions">{!team.is_captain && !team.is_member && <button type="button" className="sg-primary-button" onClick={join} disabled={busy || team.membership_status === 'PENDING' || team.member_count >= team.total_slots}>{team.membership_status === 'PENDING' ? 'Đang chờ duyệt' : team.member_count >= team.total_slots ? 'CLB đã đủ người' : busy ? 'Đang gửi...' : 'Tham gia CLB'}</button>}{team.owner_is_premium && (team.is_captain || team.is_member) && <button type="button" className={team.is_captain ? 'sg-team-detail-secondary sg-auto-search-button' : 'sg-team-detail-secondary'} onClick={() => setPremiumSettingsOpen(true)}><CalendarClock size={16} /> {team.is_captain ? 'Quản lý CLB' : 'Lịch CLB'}</button>}{team.owner_id && <button type="button" className="sg-team-detail-secondary" onClick={() => openChat({ id: team.owner_id, name: team.owner_name })}><MessageCircle size={16} /> Nhắn tin</button>}</div></div></div>
      <div className="sg-team-detail-grid"><section className="sg-panel sg-team-detail-panel"><h2>Về câu lạc bộ</h2><p>{team.description || 'CLB chưa thêm phần giới thiệu.'}</p>{team.tags?.length > 0 && <div className="sg-team-tags">{team.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}<div className="sg-team-detail-owner"><span className={`sg-avatar ${team.owner_is_premium ? 'sg-premium-avatar' : ''}`}>{(team.owner_name || 'N').charAt(0).toUpperCase()}</span><span><small>Người mở CLB</small><strong className={team.owner_is_premium ? 'sg-premium-name' : ''}>{team.owner_name}</strong></span></div></section><section className="sg-panel sg-team-detail-panel"><h2>Thành viên <small>{team.member_count}</small></h2>{members.length ? members.slice(0, 9).map((person) => <div key={person.id} className="sg-team-detail-member"><span className={`sg-avatar ${person.is_premium ? 'sg-premium-avatar' : ''}`}>{person.avatar_url ? <img src={resolveMediaUrl(person.avatar_url)} alt="" /> : (person.full_name || 'N').charAt(0).toUpperCase()}</span><strong className={person.is_premium ? 'sg-premium-name' : ''}>{person.full_name || 'Người chơi'}</strong></div>) : <p>{team.is_member || team.is_captain ? 'Chưa có thành viên được hiển thị.' : 'Tham gia CLB để xem danh sách thành viên.'}</p>}</section></div>
      <section className="sg-panel sg-team-detail-panel sg-team-reviews"><div className="sg-team-reviews-heading"><h2>Đánh giá từ cộng đồng</h2>{!team.is_captain && <button type="button" className="sg-team-detail-secondary" onClick={() => setReviewOpen(true)}><Star size={16} /> Viết đánh giá</button>}</div>{reviews.length ? reviews.map((review) => <div key={review.id} className="sg-review"><span><Star size={14} fill="currentColor" /> {review.rating}/5</span><p>{review.comment || 'Thành viên đã đánh giá CLB này.'}</p><small>{new Date(review.created_at).toLocaleDateString('vi-VN')}</small></div>) : <p>Chưa có đánh giá. Hãy chia sẻ trải nghiệm của bạn.</p>}</section>
      {reviewOpen && <ReviewTeamModal teamId={Number(id)} isOpen onClose={() => setReviewOpen(false)} onSubmit={async (data) => { await teamService.review(id, data); setReviewOpen(false); await load(); }} />}
      {premiumSettingsOpen && <TeamPremiumSettingsModal isOpen team={team} canEdit={Boolean(team.is_captain)} onClose={() => setPremiumSettingsOpen(false)} onSaved={load} />}
    </>}
  </main>;
}
