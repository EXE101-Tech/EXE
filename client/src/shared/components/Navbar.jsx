import { useEffect, useRef, useState } from 'react';
import { Crown, Gamepad2, Home, Menu, MessageCircle, Search, Users, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import useChatUnreadCount from '../hooks/useChatUnreadCount';
import NotificationBell from './NotificationBell';
import { chatService, searchService } from '../services/api';
import brandLogo from '../../../icons/logo.png';

const links = [
  { to: '/tournaments', label: 'Bảng tin', icon: Home },
  { to: '/matches', label: 'Tìm trận', icon: Gamepad2 },
  { to: '/team', label: 'Cộng đồng', icon: Users },
];
const kindLabels = { gameroom: 'Phòng chơi', team: 'CLB', social_post: 'Bài viết', user: 'Người chơi', sport: 'Môn thể thao' };
const sports = [{ id: 'badminton', name: 'Cầu lông' }, { id: 'pickleball', name: 'Pickleball' }, { id: 'football', name: 'Bóng đá' }];

export default function Navbar() {
  const { user } = useAuth();
  const { toggleChat, openChat } = useChat();
  const unreadChats = useChatUnreadCount();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const avatar = user?.profile?.avatar_url || user?.avatar;
  const name = user?.profile?.full_name || user?.name || 'Người chơi';

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

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
        subtitle: 'Người chơi', person,
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
  const submitSearch = (event) => {
    event.preventDefault();
    if (query.trim().length < 2) { setSearchOpen(true); return; }
    if (results[0]) selectResult(results[0]);
    else setSearchOpen(true);
  };
  const searchBox = (mobile = false) => <form onSubmit={submitSearch} className="sg-search" role="search">
    <Search size={19} aria-hidden="true" />
    <input value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Tìm người chơi, CLB, phòng chơi..." aria-label="Tìm kiếm toàn cục" autoFocus={mobile} />
    {query && <button type="button" className="sg-search-clear" onClick={() => { setQuery(''); setResults([]); }} aria-label="Xóa tìm kiếm"><X size={16} /></button>}
    {searchOpen && query.trim().length >= 2 && <div className="sg-search-results" role="listbox" aria-label="Gợi ý tìm kiếm">
      {loading ? <div className="sg-search-status">Đang tìm kiếm...</div> : results.length ? results.map((item) => <button key={`${item.kind}-${item.id}`} type="button" role="option" aria-selected="false" onClick={() => selectResult(item)}><span className="sg-search-kind">{kindLabels[item.kind] || 'Kết quả'}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>) : <div className="sg-search-status">Chưa có kết quả phù hợp.</div>}
    </div>}
  </form>;

  return <>
    <header className="sg-topbar"><div className="sg-topbar-inner">
      <Link to="/tournaments" className="sg-brand" aria-label="SportGo, về bảng tin"><img className="sg-brand-mark" src={brandLogo} alt="" /><span>SPORTGO</span></Link>
      <nav className="sg-primary-nav" aria-label="Điều hướng chính">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `sg-nav-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sg-desktop-search" ref={searchRef}>{searchBox()}</div>
      <div className="sg-top-actions">
        <button type="button" className="sg-icon-button sg-mobile-search-toggle" onClick={() => setMobileSearchOpen(true)} aria-label="Mở tìm kiếm"><Search size={20} /></button>
        <button type="button" className="sg-icon-button sg-chat-button" onClick={toggleChat} aria-label="Mở tin nhắn"><MessageCircle size={20} />{unreadChats > 0 && <i>{unreadChats > 9 ? '9+' : unreadChats}</i>}</button>
        <NotificationBell className="sg-icon-button sg-notification-button" />
        <Link to="/premium" className="sg-premium-link"><Crown size={16} /><span>Premium</span></Link>
        <Link to="/home" className="sg-user-avatar" aria-label="Hồ sơ của tôi">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</Link>
        <button type="button" className="sg-icon-button sg-mobile-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Mở menu"><Menu size={20} /></button>
      </div>
    </div></header>
    {mobileSearchOpen && <div className="sg-mobile-search-overlay"><div className="sg-mobile-search-row" ref={searchRef}>{searchBox(true)}<button type="button" onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); }} aria-label="Đóng tìm kiếm"><X size={22} /></button></div></div>}
    {mobileMenuOpen && <div className="sg-mobile-menu"><Link to="/premium" onClick={() => setMobileMenuOpen(false)}><Crown size={18} /> Premium</Link><Link to="/home" onClick={() => setMobileMenuOpen(false)}><Users size={18} /> Hồ sơ</Link></div>}
    <nav className="sg-bottom-nav" aria-label="Điều hướng di động">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={21} /><span>{label}</span></NavLink>)}<NavLink to="/home" className={({ isActive }) => isActive ? 'active' : ''}><span className="sg-bottom-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span><span>Hồ sơ</span></NavLink></nav>
  </>;
}
