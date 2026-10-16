import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardList, Crown, Gamepad2, Home, LoaderCircle, Menu, MessageCircle, Moon, Search, Sun, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import useChatUnreadCount from '../hooks/useChatUnreadCount';
import NotificationBell from './NotificationBell';
import { chatService, resolveMediaUrl, searchService } from '../services/api';
import brandLogo from '../../../icons/logo.png';

const links = [
  { to: '/tournaments', label: 'Cộng đồng', icon: Home },
  { to: '/matches', label: 'Tìm trận', icon: Gamepad2 },
  { to: '/team', label: 'Team', icon: Users },
];
const kindLabels = { gameroom: 'Phòng chơi', team: 'CLB', social_post: 'Bài viết', user: 'Người chơi', sport: 'Môn thể thao' };
const sports = [{ id: 'badminton', name: 'Cầu lông' }, { id: 'pickleball', name: 'Pickleball' }, { id: 'football', name: 'Bóng đá' }];

export default function Navbar() {
  const { user } = useAuth();
  const { isChatOpen, toggleChat, openChat } = useChat();
  const unreadChats = useChatUnreadCount();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendActionId, setFriendActionId] = useState(null);
  const [friendActionError, setFriendActionError] = useState('');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const searchRef = useRef(null);
  const themeReadyRef = useRef(false);
  const themeTimerRef = useRef(null);
  const avatar = user?.profile?.avatar_url || user?.avatar;
  const name = user?.profile?.full_name || user?.name || 'Người chơi';
  const isAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    const root = document.documentElement;
    if (themeReadyRef.current) {
      root.classList.add('sg-theme-switching');
      if (themeTimerRef.current) window.clearTimeout(themeTimerRef.current);
      themeTimerRef.current = window.setTimeout(() => {
        root.classList.remove('sg-theme-switching');
        themeTimerRef.current = null;
      }, 460);
    } else {
      themeReadyRef.current = true;
    }
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    return () => {
      if (themeTimerRef.current) window.clearTimeout(themeTimerRef.current);
      root.classList.remove('sg-theme-switching');
      themeTimerRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const [items, people] = await Promise.allSettled([searchService.search(trimmed), chatService.searchUsers(trimmed)]);
      if (!active) return;
      const matches = items.status === 'fulfilled' ? items.value.filter((item) => item.kind !== 'venue') : [];
      const users = people.status === 'fulfilled' ? people.value.slice(0, 3).map((person) => ({
        kind: 'user', id: person.id, title: person.profile?.full_name || person.name || person.email,
        person,
      })) : [];
      const sportMatches = sports.filter((sport) => sport.name.toLocaleLowerCase('vi-VN').includes(trimmed.toLocaleLowerCase('vi-VN')) || sport.id.includes(trimmed.toLowerCase())).map((sport) => ({ kind: 'sport', id: sport.id, title: sport.name, subtitle: 'Tìm phòng theo môn', href: `/matches?sport=${sport.id}` }));
      setResults([...sportMatches, ...users, ...matches].slice(0, 7));
      setLoading(false);
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (query.trim().length < 2) {
      const timer = window.setTimeout(() => { setResults([]); setLoading(false); }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [query]);

  useEffect(() => {
    const dismiss = (event) => { if (!searchRef.current?.contains(event.target)) setSearchOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setSearchOpen(false); setMobileSearchOpen(false); setMobileMenuOpen(false); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);

  const selectResult = (item) => {
    setQuery(''); setSearchOpen(false); setMobileSearchOpen(false);
    if (item.kind === 'user') openChat(item.person);
    else navigate(item.href);
  };
  const updateSearchFriendship = async (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    const person = item.person;
    if (!person || friendActionId === person.id || ['accepted', 'outgoing'].includes(person.friendship_status)) return;
    setFriendActionId(person.id);
    setFriendActionError('');
    try {
      if (person.friendship_status === 'incoming' && person.friendship_id) await chatService.acceptFriendRequest(person.friendship_id);
      else await chatService.sendFriendRequest(person.id);
      const nextStatus = person.friendship_status === 'incoming' ? 'accepted' : 'outgoing';
      setResults((current) => current.map((result) => result.kind === 'user' && result.id === person.id
        ? { ...result, person: { ...result.person, friendship_status: nextStatus } }
        : result));
    } catch (error) {
      setFriendActionError(error.message || 'Không thể cập nhật lời mời kết bạn.');
    } finally {
      setFriendActionId(null);
    }
  };
  const submitSearch = (event) => {
    event.preventDefault();
    if (query.trim().length < 2) { setSearchOpen(true); return; }
    if (results[0]) selectResult(results[0]);
    else setSearchOpen(true);
  };
  const searchBox = (mobile = false) => <form onSubmit={submitSearch} className="sg-search" role="search">
    <Search size={19} aria-hidden="true" />
    <input value={query} onChange={(event) => { setQuery(event.target.value); setFriendActionError(''); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Tìm người chơi, email, CLB, phòng chơi..." aria-label="Tìm kiếm toàn cục" autoFocus={mobile} />
    {query && <button type="button" className="sg-search-clear" onClick={() => { setQuery(''); setResults([]); setFriendActionError(''); }} aria-label="Xóa tìm kiếm"><X size={16} /></button>}
    {searchOpen && query.trim().length >= 2 && <div className="sg-search-results" role="listbox" aria-label="Gợi ý tìm kiếm">
      {friendActionError && <div className="sg-search-status" role="alert">{friendActionError}</div>}
      {loading ? <div className="sg-search-status">Đang tìm kiếm...</div> : results.length ? results.map((item) => {
        if (item.kind === 'user') {
          const friendshipStatus = item.person?.friendship_status || 'none';
          const isFriendActionBusy = friendActionId === item.id;
          return <div key={`${item.kind}-${item.id}`} className="sg-search-result-row" role="option" aria-selected="false">
            <button type="button" className="sg-search-result-main" onClick={() => selectResult(item)}>
              <span className={`sg-search-result-avatar ${item.person?.is_premium ? 'sg-premium-avatar' : ''}`}>
                {item.person?.avatar_url || item.person?.avatar ? <img src={resolveMediaUrl(item.person.avatar_url || item.person.avatar)} alt="" /> : (item.title || 'U').charAt(0).toUpperCase()}
              </span>
              <span><strong className={item.person?.is_premium ? 'sg-premium-name' : ''}>{item.title}</strong></span>
            </button>
            {friendshipStatus === 'none' && <button type="button" className="sg-search-friend-button" onClick={(event) => updateSearchFriendship(event, item)} disabled={isFriendActionBusy}><UserPlus size={13} />{isFriendActionBusy ? <LoaderCircle className="animate-spin" size={13} /> : 'Kết bạn'}</button>}
            {friendshipStatus === 'incoming' && <button type="button" className="sg-search-friend-button" onClick={(event) => updateSearchFriendship(event, item)} disabled={isFriendActionBusy}><Check size={13} />{isFriendActionBusy ? <LoaderCircle className="animate-spin" size={13} /> : 'Chấp nhận'}</button>}
            {friendshipStatus === 'outgoing' && <span className="sg-search-friend-state"><UserCheck size={13} />Đã gửi</span>}
            {friendshipStatus === 'accepted' && <span className="sg-search-friend-state">Bạn bè</span>}
          </div>;
        }
        return <button key={`${item.kind}-${item.id}`} type="button" role="option" aria-selected="false" onClick={() => selectResult(item)}><span className="sg-search-kind">{kindLabels[item.kind] || 'Kết quả'}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>;
      }) : <div className="sg-search-status">Chưa có kết quả phù hợp.</div>}
    </div>}
  </form>;

  return <>
    <header className="sg-topbar"><div className="sg-topbar-inner">
      <div className="sg-topbar-left">
        <Link to="/tournaments" className="sg-brand" aria-label="SportGo, về cộng đồng"><img className="sg-brand-mark" src={brandLogo} alt="" /><span className="sg-brand-wordmark">SPORT<span className={user?.isPremium ? 'sg-brand-go sg-premium-name' : 'sg-brand-go'}>GO</span></span></Link>
        <div className="sg-desktop-search" ref={searchRef}>{searchBox()}</div>
      </div>
      <nav className="sg-primary-nav" aria-label="Điều hướng chính">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `sg-nav-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sg-top-actions">
        <button type="button" className="sg-icon-button sg-mobile-search-toggle" onClick={() => setMobileSearchOpen(true)} aria-label="Mở tìm kiếm"><Search size={20} /></button>
        <button type="button" className="sg-icon-button sg-chat-button" onClick={toggleChat} aria-label="Mở tin nhắn"><MessageCircle size={20} />{unreadChats > 0 && <i>{unreadChats > 9 ? '9+' : unreadChats}</i>}</button>
        <NotificationBell className="sg-icon-button sg-notification-button" />
        <button type="button" className="sg-icon-button sg-theme-toggle" onClick={() => setIsDark((current) => !current)} aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'} title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <Link to={isAdmin ? '/admin' : '/premium'} className="sg-premium-link">{isAdmin ? <ClipboardList size={16} /> : <Crown size={16} />}<span>{isAdmin ? 'Giao dịch' : 'Premium'}</span></Link>
        <Link to="/home" className={`sg-user-avatar ${user?.isPremium ? 'sg-premium-avatar' : ''}`} aria-label="Hồ sơ của tôi">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</Link>
        <button type="button" className="sg-icon-button sg-mobile-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Mở menu"><Menu size={20} /></button>
      </div>
    </div></header>
    {mobileSearchOpen && <div className="sg-mobile-search-overlay"><div className="sg-mobile-search-row" ref={searchRef}>{searchBox(true)}<button type="button" onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); }} aria-label="Đóng tìm kiếm"><X size={22} /></button></div></div>}
    {mobileMenuOpen && <div className="sg-mobile-menu"><Link to={isAdmin ? '/admin' : '/premium'} onClick={() => setMobileMenuOpen(false)}>{isAdmin ? <ClipboardList size={18} /> : <Crown size={18} />} {isAdmin ? 'Giao dịch' : 'Premium'}</Link><Link to="/home" onClick={() => setMobileMenuOpen(false)}><Users size={18} /> Hồ sơ</Link></div>}
    <nav className="sg-bottom-nav" aria-label="Điều hướng di động">
      {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={21} /><span>{label}</span></NavLink>)}
      <button type="button" className={`sg-bottom-chat ${isChatOpen ? 'active' : ''}`} onClick={toggleChat} aria-label="Mở tin nhắn">
        <span className="sg-bottom-chat-icon"><MessageCircle size={21} /></span>
        <span>Chat</span>
        {unreadChats > 0 && <i>{unreadChats > 9 ? '9+' : unreadChats}</i>}
      </button>
      <NavLink to="/home" className={({ isActive }) => isActive ? 'active' : ''}><span className={`sg-bottom-avatar ${user?.isPremium ? 'sg-premium-avatar' : ''}`}>{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span><span>Hồ sơ</span></NavLink>
    </nav>
  </>;
}
