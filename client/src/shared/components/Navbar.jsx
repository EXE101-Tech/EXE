import { useEffect, useRef, useState } from 'react';
import { Crown, Gamepad2, MessageSquare, MessageSquarePlus, Moon, Plus, Search, Sun, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import NotificationBell from './NotificationBell';
import useChatUnreadCount from '../hooks/useChatUnreadCount';
import PremiumInfoModal from '../../features/premium/PremiumInfoModal';
import { searchService } from '../services/api';
import logoIcon from '../../../icons/logo.png';
import communityIcon from '../../../icons/diendan.png';
import matchesIcon from '../../../icons/phonggame.png';
import teamsIcon from '../../../icons/teams.png';

const CommunityIcon = (props) => <img src={communityIcon} alt="" aria-hidden="true" {...props} />;
const MatchesIcon = (props) => <img src={matchesIcon} alt="" aria-hidden="true" {...props} />;
const TeamsIcon = (props) => <img src={teamsIcon} alt="" aria-hidden="true" {...props} />;

const NAV_ITEMS = [
  { label: 'Cộng đồng', path: '/tournaments', icon: CommunityIcon },
  { label: 'Phòng game', path: '/matches', icon: MatchesIcon },
  { label: 'CLB', path: '/team', icon: TeamsIcon },
];
const CREATE_ITEMS = [
  { label: 'Tạo bài viết', path: '/tournaments', create: 'post', icon: MessageSquarePlus },
  { label: 'Tạo phòng', path: '/matches', create: 'room', icon: Gamepad2 },
  { label: 'Tạo CLB', path: '/team', create: 'club', icon: Users },
];

export function SearchResults({ results, loading, error, hasSearched, onSelect }) {
  if (!hasSearched) return null;
  return (
    <div className="member-search-results">
      {loading ? <p className="px-3 py-4 text-sm text-slate-500">Đang tìm kiếm…</p> : error ? <p className="px-3 py-4 text-sm text-red-600">{error}</p> : results.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">Không tìm thấy kết quả phù hợp.</p> : (
        <div role="listbox" aria-label="Kết quả tìm kiếm">
          {results.map((result) => (
            <button key={`${result.kind}-${result.id}`} type="button" role="option" aria-selected="false" onClick={() => onSelect(result)} className="member-search-result">
              <span className="member-search-kind">{{ venue: 'Sân', gameroom: 'Trận', team: 'CLB', social_post: 'Bài viết' }[result.kind] || 'Kết quả'}</span>
              <span className="min-w-0"><b className="block truncate text-sm">{result.title}</b><small className="mt-0.5 block truncate text-xs text-slate-500">{result.subtitle}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconAction({ label, children, onClick, className = '' }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`member-icon-action ${className}`}>
      {children}
    </button>
  );
}

function SideNavLink({ item, pathname, onClick }) {
  const Icon = item.icon;
  const active = item.path === '/profile'
    ? pathname === '/home' || pathname === '/profile'
    : pathname === item.path || pathname.startsWith(item.path + '/');
  return (
    <Link to={item.path} onClick={onClick} aria-label={item.label} aria-current={active ? 'page' : undefined} title={item.label} className={'member-side-link' + (active ? ' is-active' : '')}>
      {item.avatar ? <span className="member-avatar member-side-avatar">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : item.avatarLetter}</span> : <Icon className="h-6 w-6" />}
      <span className="member-side-label">{item.label}</span>
      {active && <span className="member-side-active" />}
    </Link>
  );
}

function MobileNavLink({ item, pathname, onClick }) {
  const Icon = item.icon;
  const active = item.path === '/profile'
    ? pathname === '/home' || pathname === '/profile'
    : pathname === item.path || pathname.startsWith(item.path + '/');
  return (
    <Link to={item.path} onClick={onClick} aria-label={item.label} aria-current={active ? 'page' : undefined} className={'member-mobile-tab' + (active ? ' is-active' : '')}>
      {item.avatar ? <span className="member-mobile-avatar">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : item.avatarLetter}</span> : <Icon className="h-6 w-6" />}
      <span>{item.label}</span>
    </Link>
  );
}

export default function Navbar() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isChatOpen, toggleChat, closeChat } = useChat();
  const chatUnreadCount = useChatUnreadCount();
  const displayName = user?.profile?.full_name || user?.email || 'Thành viên';
  const avatarUrl = user?.profile?.avatar_url || user?.avatar || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  useEffect(() => {
    if (!isSearchOpen) return undefined;
    searchInputRef.current?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsSearchOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSearchOpen]);

  const toggleTheme = () => setIsDark((previous) => {
    const next = !previous;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    return next;
  });

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (isSearchLoading) return;
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('Nhập ít nhất 2 ký tự để tìm kiếm.');
      setHasSearched(true);
      return;
    }
    setIsSearchLoading(true);
    setSearchError('');
    setHasSearched(true);
    try {
      setSearchResults((await searchService.search(query)).filter((result) => result.kind !== 'venue'));
    } catch (error) {
      setSearchResults([]);
      setSearchError(error.message || 'Không thể tìm kiếm lúc này.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const selectResult = (result) => {
    navigate(result.href);
    closeChat();
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const chooseCreateAction = (action) => {
    setIsCreateMenuOpen(false);
    closeChat();
    navigate(action.path + '?create=' + action.create);
  };
  const closeNavigationMenus = () => {
    setIsCreateMenuOpen(false);
    closeChat();
  };

  const chatAction = (
    <IconAction label={isChatOpen ? 'Đóng chat' : 'Mở chat'} onClick={toggleChat} className={isChatOpen ? 'is-selected' : ''}>
      <MessageSquare className="h-[18px] w-[18px]" />
      {chatUnreadCount > 0 && <span className="member-chat-count">{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>}
    </IconAction>
  );
  const notification = <NotificationBell className="member-icon-action" />;
  const themeAction = <IconAction label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} onClick={toggleTheme}>{isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</IconAction>;

  return (
    <>
      {isCreateMenuOpen && <button type="button" className="member-create-backdrop" aria-label="Đóng menu tạo mới" onClick={() => setIsCreateMenuOpen(false)} />}
      <aside className="member-sidebar" aria-label="Điều hướng chính">
        <Link to="/home" className="member-brand" onClick={closeChat} aria-label="SportGo">
          <img src={logoIcon} alt="" className="member-brand-logo" /><span className="member-brand-name">SportGo<span className="member-brand-period">.</span></span>
        </Link>
        <nav className="member-side-links">
          {NAV_ITEMS.slice(0, 2).map((item) => <SideNavLink key={item.path} item={item} pathname={location.pathname} onClick={closeNavigationMenus} />)}
          <div className={'member-create-entry' + (isCreateMenuOpen ? ' is-open' : '')}>
            <button type="button" onClick={() => setIsCreateMenuOpen((open) => !open)} aria-label="Tạo mới" aria-expanded={isCreateMenuOpen} className="member-create-button">
              <Plus className="h-7 w-7" />
            </button>
            <span className="member-create-label">Tạo</span>
            <div className="member-create-fan" aria-hidden={!isCreateMenuOpen}>
              {CREATE_ITEMS.map((item) => {
                const Icon = item.icon;
                return <button key={item.create} type="button" tabIndex={isCreateMenuOpen ? 0 : -1} onClick={() => chooseCreateAction(item)} className="member-create-option"><span><Icon className="h-5 w-5" /></span><b>{item.label}</b></button>;
              })}
            </div>
          </div>
          <SideNavLink key={NAV_ITEMS[2].path} item={NAV_ITEMS[2]} pathname={location.pathname} onClick={closeNavigationMenus} />
          <SideNavLink item={{ path: '/profile', label: 'Hồ sơ', avatar: true, avatarUrl, avatarLetter }} pathname={location.pathname} onClick={closeNavigationMenus} />
        </nav>
      </aside>

      <header className="member-workbar">
        <div className="member-workbar-search">
          <form onSubmit={handleSearchSubmit} className="member-search-form">
            <Search className="h-4 w-4 shrink-0 text-[#738177]" />
            <input type="search" placeholder="Tìm sân, trận đấu, CLB..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Tìm sân, trận đấu, CLB" />
            <kbd>Enter</kbd>
            <SearchResults results={searchResults} loading={isSearchLoading} error={searchError} hasSearched={hasSearched} onSelect={selectResult} />
          </form>
        </div>
        <div className="member-workbar-actions">
          <button type="button" onClick={() => setIsPremiumOpen(true)} className="member-plus-button"><Crown className="h-4 w-4" /><span>Plus</span></button>
          {chatAction}{notification}{themeAction}
        </div>
      </header>

      <header className="member-mobilebar">
        <Link to="/home" className="member-mobile-brand" aria-label="SportGo" onClick={closeChat}><img src={logoIcon} alt="" className="member-brand-logo" /><b>SportGo<span className="member-brand-period">.</span></b></Link>
        <div className="member-mobile-actions">
          <IconAction label="Tìm kiếm" onClick={() => setIsSearchOpen(true)}><Search className="h-[18px] w-[18px]" /></IconAction>
          {chatAction}{notification}
        </div>
      </header>

      <nav className={'member-mobile-tabs' + (isCreateMenuOpen ? ' has-create-open' : '')} aria-label="Điều hướng chính">
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return <Link key={item.path} to={item.path} onClick={closeNavigationMenus} aria-current={active ? 'page' : undefined} className={'member-mobile-tab' + (active ? ' is-active' : '')}><Icon className="h-6 w-6" /><span>{item.label}</span></Link>;
        })}
        <div className={'member-mobile-create-entry' + (isCreateMenuOpen ? ' is-open' : '')}>
          <button type="button" onClick={() => setIsCreateMenuOpen((open) => !open)} aria-label="Tạo mới" aria-expanded={isCreateMenuOpen} className="member-create-button">
            <Plus className="h-7 w-7" />
          </button>
          <div className="member-mobile-create-fan" aria-hidden={!isCreateMenuOpen}>
            {CREATE_ITEMS.map((item) => {
              const Icon = item.icon;
              return <button key={item.create} type="button" tabIndex={isCreateMenuOpen ? 0 : -1} onClick={() => chooseCreateAction(item)} className="member-mobile-create-option"><span><Icon className="h-5 w-5" /></span><b>{item.label}</b></button>;
            })}
          </div>
        </div>
        <MobileNavLink item={NAV_ITEMS[2]} pathname={location.pathname} onClick={closeNavigationMenus} />
        <MobileNavLink item={{ path: '/profile', label: 'Hồ sơ', avatar: true, avatarUrl, avatarLetter }} pathname={location.pathname} onClick={closeNavigationMenus} />
      </nav>

      {isSearchOpen && <div className="member-mobile-search-backdrop" onClick={() => setIsSearchOpen(false)} role="presentation"><form onSubmit={handleSearchSubmit} className="member-mobile-search" onClick={(event) => event.stopPropagation()}><Search className="h-4 w-4 text-[#738177]" /><input ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm sân, trận đấu, CLB..." aria-label="Tìm kiếm" /><button type="button" onClick={() => setIsSearchOpen(false)} aria-label="Đóng tìm kiếm">Đóng</button><SearchResults results={searchResults} loading={isSearchLoading} error={searchError} hasSearched={hasSearched} onSelect={selectResult} /></form></div>}
      <PremiumInfoModal isOpen={isPremiumOpen} onClose={() => setIsPremiumOpen(false)} />
    </>
  );
}
