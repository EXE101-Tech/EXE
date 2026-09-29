import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, Crown, Gamepad2, Home, ImagePlus, MapPin, MessageCircle, Plus, Sparkles, Users, Video, X } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { useChat } from '../../shared/context/ChatContext';
import { chatService, gameRoomService, socialPostService, storageService, teamService } from '../../shared/services/api';
import SocialPostCard from './components/SocialPostCard';
import SocialPostComposer from './components/SocialPostComposer';
import brandLogo from '../../../icons/logo.png';

const PAGE_SIZE = 20;
const feedTabs = [{ key: 'all', label: 'Dành cho bạn' }, { key: 'image', label: 'Hình ảnh' }, { key: 'video', label: 'Video' }];
const navLinks = [
  { to: '/tournaments', label: 'Bảng tin', icon: Home },
  { to: '/matches', label: 'Tìm trận đấu', icon: Gamepad2 },
  { to: '/team', label: 'CLB & cộng đồng', icon: Users },
  { to: '/home', label: 'Hồ sơ của tôi', icon: MessageCircle },
];

function Avatar({ src, name }) {
  return <span className="sg-avatar">{src ? <img src={src} alt="" /> : name ? name.charAt(0).toUpperCase() : <img src={brandLogo} alt="" />}</span>;
}

export default function SocialFeed() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = (searchParams.get('search') || '').trim();
  const [posts, setPosts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teams, setTeams] = useState([]);
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('all');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const offsetRef = useRef(0);

  const loadFeed = useCallback(async (append = false, silent = false) => {
    if (append) setIsLoadingMore(true);
    else if (!silent) setIsLoading(true);
    try {
      const offset = append ? offsetRef.current : 0;
      const items = await socialPostService.getFeed({ limit: PAGE_SIZE, offset, ...(searchQuery.length >= 2 ? { search: searchQuery } : {}) });
      setPosts((current) => append ? [...current, ...items] : items);
      offsetRef.current = offset + items.length;
      setHasMore(items.length === PAGE_SIZE);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được bảng tin.');
    } finally {
      if (!silent) setIsLoading(false);
      if (append) setIsLoadingMore(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadFeed(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFeed]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([gameRoomService.getAll(), teamService.getAll(), chatService.getFriends()]).then(([roomResult, teamResult, peopleResult]) => {
      if (!active) return;
      if (roomResult.status === 'fulfilled') setRooms(roomResult.value.filter((room) => room.status === 'OPEN').slice(0, 3));
      if (teamResult.status === 'fulfilled') setTeams(teamResult.value.slice(0, 3));
      if (peopleResult.status === 'fulfilled') setPeople((Array.isArray(peopleResult.value) ? peopleResult.value : peopleResult.value?.items || []).slice(0, 3).map((friendship) => friendship.user).filter(Boolean));
    });
    return () => { active = false; };
  }, []);

  const savePost = async (data) => {
    const { media_file: mediaFile, ...payload } = data;
    if (mediaFile) {
      const media = await storageService.uploadMedia(mediaFile);
      payload.media_url = media.url;
      payload.media_type = media.type;
    }
    await socialPostService.create(payload);
    await loadFeed();
    setIsComposerOpen(false);
    setNotice('Bài viết đã được chia sẻ.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  const visiblePosts = tab === 'all' ? posts : posts.filter((post) => post.media_type === tab);
  const name = user?.profile?.full_name || user?.name || 'Bạn';
  const avatar = user?.profile?.avatar_url || user?.avatar;
  const sports = [...new Set((user?.sports || []).map((item) => {
    const name = item.sport?.name?.toLowerCase();
    if (name === 'badminton' || name === 'cầu lông') return 'Cầu lông';
    if (name === 'football' || name === 'bóng đá') return 'Bóng đá';
    if (name === 'pickleball') return 'Pickleball';
    return item.sport?.name;
  }).filter(Boolean))];

  return <div className="sg-feed-layout">
    <aside className="sg-feed-side sg-left-side" aria-label="Khám phá">
      <p className="sg-side-label">KHÁM PHÁ</p>
      {navLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className={`sg-side-link ${to === '/tournaments' ? 'active' : ''}`}><Icon size={18} />{label}</Link>)}
      <div className="sg-side-divider" />
      <p className="sg-side-label">MÔN CỦA BẠN</p>
      {sports.length ? sports.map((sport) => <span key={sport} className="sg-side-link"><span aria-hidden="true">{sport === 'Cầu lông' ? '🏸' : sport === 'Bóng đá' ? '⚽' : sport === 'Pickleball' ? '🏓' : sport === 'Tennis' ? '🎾' : '🏅'}</span>{sport}</span>) : <Link to="/home" className="sg-side-link">+ Thêm môn yêu thích</Link>}
      <div className="sg-side-promo"><Crown size={19} /><strong>Chơi theo cách của bạn</strong><p>Khám phá những lợi ích giúp bạn kết nối với cộng đồng dễ hơn.</p><Link to="/premium">Khám phá Premium →</Link></div>
    </aside>

    <main className="sg-feed-main">
      <div className="sg-feed-heading"><div><span className="sg-eyebrow">CỘNG ĐỒNG SPORTGO</span><h1>Bảng tin của bạn</h1><p>Chia sẻ khoảnh khắc. Kết nối cùng người mê thể thao.</p></div></div>
      {notice && <div role="status" className="sg-notice">{notice}</div>}
      {searchQuery.length >= 2 && <div className="sg-search-filter">Kết quả bài viết cho <strong>“{searchQuery}”</strong><button type="button" onClick={() => setSearchParams({})} aria-label="Xóa tìm kiếm"><X size={16} /></button></div>}
      <section className="sg-panel sg-composer" aria-label="Tạo bài viết"><div className="sg-composer-top"><Avatar src={avatar} name={name} /><button type="button" onClick={() => setIsComposerOpen(true)} className="sg-composer-prompt">Hôm nay bạn đã chơi môn gì, {name.split(' ').pop()}?</button></div><div className="sg-composer-actions"><button type="button" onClick={() => setIsComposerOpen(true)}><ImagePlus size={17} /> Ảnh</button><button type="button" onClick={() => setIsComposerOpen(true)}><Video size={17} /> Video</button><button type="button" onClick={() => setIsComposerOpen(true)}><Sparkles size={17} /> Thành tích</button><button type="button" onClick={() => setIsComposerOpen(true)} className="sg-post-cta"><Plus size={15} /> Đăng bài</button></div></section>
      <div className="sg-feed-tabs" role="tablist" aria-label="Lọc bảng tin">{feedTabs.map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}</button>)}</div>
      {error && <div role="alert" className="sg-notice sg-error">{error}</div>}
      {isLoading ? <><div className="sg-skeleton sg-loading-card" /><div className="sg-skeleton sg-loading-card" /></> : visiblePosts.length === 0 ? <div className="sg-panel sg-empty"><Camera size={36} /><h2>{searchQuery ? 'Chưa tìm thấy bài viết phù hợp' : tab !== 'all' ? `Chưa có ${tab === 'image' ? 'hình ảnh' : 'video'} trong bảng tin` : 'Câu chuyện đầu tiên đang chờ bạn'}</h2><p>{searchQuery ? 'Thử một từ khóa khác hoặc xóa tìm kiếm.' : 'Chia sẻ một khoảnh khắc tập luyện, trận đấu hoặc câu chuyện thể thao của bạn.'}</p><button type="button" className="sg-primary-button" onClick={() => searchQuery ? setSearchParams({}) : setIsComposerOpen(true)}>{searchQuery ? 'Xóa tìm kiếm' : 'Tạo bài viết'}</button></div> : <div>{visiblePosts.map((post) => <SocialPostCard key={post.id} post={post} user={user} onRefresh={() => loadFeed(false, true)} onMessage={(recipient) => openChat(recipient)} />)}{hasMore && <button type="button" className="sg-primary-button sg-more-posts" onClick={() => loadFeed(true)} disabled={isLoadingMore}>{isLoadingMore ? 'Đang tải...' : 'Xem thêm bài viết'}</button>}</div>}
      <SocialPostComposer key={isComposerOpen ? 'open' : 'closed'} isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} onSave={savePost} />
    </main>

    <aside className="sg-feed-side sg-right-side" aria-label="Gợi ý cộng đồng">
      <div className="sg-panel sg-right-panel"><h2>Phòng sắp diễn ra <Link to="/matches">Xem tất cả</Link></h2>{rooms.length ? rooms.map((room) => <div key={room.id} className="sg-right-item"><Avatar name={room.sport?.name || room.title} /><div className="sg-right-item-text"><strong>{room.title}</strong><span><MapPin size={11} style={{display:'inline'}} /> {room.location || 'Địa điểm chưa cập nhật'}</span></div><Link to={`/matches?search=${encodeURIComponent(room.title)}`}>Xem</Link></div>) : <p className="sg-right-empty">Chưa có phòng đang mở. Tạo phòng để bắt đầu một trận mới.</p>}</div>
      <div className="sg-panel sg-right-panel"><h2>CLB nổi bật <Link to="/team">Khám phá</Link></h2>{teams.length ? teams.map((team) => <div key={team.id} className="sg-right-item"><Avatar src={team.image_url} name={team.name} /><div className="sg-right-item-text"><strong>{team.name}</strong><span>{team.sport_name || 'Cộng đồng thể thao'} · {team.location || 'Việt Nam'}</span></div><Link to={`/team?search=${encodeURIComponent(team.name)}`}>Xem</Link></div>) : <p className="sg-right-empty">Chưa có CLB nào. Hãy lập cộng đồng đầu tiên.</p>}</div>
      {people.length > 0 && <div className="sg-panel sg-right-panel"><h2>Bạn bè đang kết nối</h2>{people.map((person) => <div key={person.id} className="sg-right-item"><Avatar src={person.profile?.avatar_url || person.avatar_url} name={person.profile?.full_name || person.full_name || person.email} /><div className="sg-right-item-text"><strong>{person.profile?.full_name || person.full_name || person.email}</strong><span>Người chơi SportGo</span></div><button type="button" onClick={() => openChat(person)}>Nhắn tin</button></div>)}</div>}
      <p className="sg-right-footer">SportGo · Chơi cùng nhau, tiến xa hơn.</p>
    </aside>
  </div>;
}
