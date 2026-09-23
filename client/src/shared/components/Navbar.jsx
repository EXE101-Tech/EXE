import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Search, Sun, Moon, Bell, Crown, MessageSquare, MapPin, Gamepad2, Users } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import PremiumInfoModal from '../../features/premium/PremiumInfoModal';
import { searchService } from '../services/api';
import forumMobileIcon from '../../../icons/diendan.png';
import bookingsMobileIcon from '../../../icons/datsan.png';
import gameRoomMobileIcon from '../../../icons/phonggame.png';
import teamsMobileIcon from '../../../icons/teams.png';

const SEARCH_KIND_LABELS = {
  venue: 'Sân',
  gameroom: 'Phòng chơi',
  team: 'CLB',
  lfg: 'Tìm người chơi',
};

export function SearchResults({ results, loading, error, hasSearched, onSelect }) {
  if (!hasSearched) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-[1001] mt-2 max-h-[min(65vh,28rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900">
      {loading ? (
        <p className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300">Đang tìm kiếm…</p>
      ) : error ? (
        <p className="px-3 py-4 text-sm text-red-600 dark:text-red-300">{error}</p>
      ) : results.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300">Không tìm thấy kết quả phù hợp.</p>
      ) : (
        <div className="space-y-1" role="listbox" aria-label="Kết quả tìm kiếm">
          {results.map((result) => (
            <button
              key={`${result.kind}-${result.id}`}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => onSelect(result)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                {SEARCH_KIND_LABELS[result.kind] || 'Kết quả'}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{result.title}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{result.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { isChatOpen, toggleChat, closeChat } = useChat();
  const { user } = useAuth();
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSubNavVisible, setIsSubNavVisible] = useState(true);
  const searchInputRef = useRef(null);
  const headerRef = useRef(null);
  const lastScrollYRef = useRef(0);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    const root = document.documentElement;
    const previousChatTop = root.style.getPropertyValue('--mobile-chat-top');
    const updateChatTop = () => {
      root.style.setProperty('--mobile-chat-top', `${header.getBoundingClientRect().bottom}px`);
    };

    updateChatTop();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateChatTop) : null;
    observer?.observe(header);
    window.addEventListener('resize', updateChatTop);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateChatTop);
      if (previousChatTop) root.style.setProperty('--mobile-chat-top', previousChatTop);
      else root.style.removeProperty('--mobile-chat-top');
    };
  }, []);

  const getAvatarLetter = () => {
    const name = user?.profile?.full_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const navItems = [
    { label: 'Diễn Đàn', path: '/tournaments', icon: MessageSquare, mobileIcon: forumMobileIcon },
    { label: 'Đặt Sân', path: '/bookings', match: (p) => p.startsWith('/bookings') || p.startsWith('/courts'), icon: MapPin, mobileIcon: bookingsMobileIcon },
    { label: 'Phòng game', path: '/matches', icon: Gamepad2, mobileIcon: gameRoomMobileIcon },
    { label: 'Teams', path: '/team', icon: Users, mobileIcon: teamsMobileIcon },
    { label: 'Hồ Sơ', path: '/home', isAvatar: true },
  ];
  const navRefs = useRef([]);
  const navContainerRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [isInitialRender, setIsInitialRender] = useState(true);

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
      setSearchResults(await searchService.search(query));
    } catch (error) {
      setSearchResults([]);
      setSearchError(error.message || 'Không thể tìm kiếm lúc này.');
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSearchResult = (result) => {
    navigate(result.href);
    closeChat();
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const activeIndex = navItems.findIndex(item => item.match ? item.match(location.pathname) : location.pathname.startsWith(item.path));

  const updateIndicator = useCallback(() => {
    requestAnimationFrame(() => {
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const el = navRefs.current[idx];
      const container = navContainerRef.current;
      if (el && container) {
        setIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
        });
        if (el.offsetWidth > 0) {
          setTimeout(() => setIsInitialRender(false), 50);
        }
        if (window.innerWidth < 768 && container.scrollWidth > container.clientWidth) {
          const scrollTarget = el.offsetLeft - (container.clientWidth / 2) + (el.offsetWidth / 2);
          container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }
      }
    });
  }, [activeIndex]);

  useEffect(() => {
    updateIndicator();
    document.fonts?.ready?.then(() => updateIndicator());
    const timer = setTimeout(updateIndicator, 150);
    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
      clearTimeout(timer);
    };
  }, [updateIndicator]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return undefined;

    searchInputRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSearchOpen]);

  useEffect(() => {
    if (isChatOpen) {
      lastScrollYRef.current = window.scrollY;
      return undefined;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const previousScrollY = lastScrollYRef.current;

      if (currentScrollY <= 12) {
        setIsSubNavVisible(true);
      } else if (currentScrollY > previousScrollY + 4) {
        setIsSubNavVisible(false);
      } else if (currentScrollY < previousScrollY - 4) {
        setIsSubNavVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isChatOpen]);

  useEffect(() => {
    document.body.classList.toggle('navbar-tabs-hidden', !isSubNavVisible && !isChatOpen);
    return () => document.body.classList.remove('navbar-tabs-hidden');
  }, [isSubNavVisible, isChatOpen]);

  const handleChatToggle = () => {
    if (!isChatOpen) setIsSubNavVisible(true);
    toggleChat();
  };

  const toggleTheme = () => {
    setIsDark(prev => {
      const newDark = !prev;
      if (newDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newDark;
    });
  };

  return (
    <header ref={headerRef} className="w-full bg-gradient-to-r from-[#589470] to-[#74C365] dark:from-[#122A25] dark:to-[#1B3A31] border-b border-transparent dark:border-[#65E6A0]/15 fixed top-0 left-0 right-0 z-[999] shadow-md dark:shadow-[0_8px_30px_rgba(3,10,20,0.35)] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-1 sm:gap-6">
        <div className="flex items-center shrink-0">
          <div
            onClick={() => { closeChat(); navigate('/home'); }}
            className="cursor-pointer group select-none flex items-center gap-1.5"
          >
            <span className="text-xl sm:text-3xl font-black tracking-tight text-white transition-transform group-hover:scale-105">
              Sport<span className={user?.isCourtOwner ? 'owner-water-go' : ''}>Go</span>
            </span>
          </div>
        </div>

        <div className="hidden sm:flex flex-1 max-w-3xl mx-1.5 sm:mx-3 items-center">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center flex-1 bg-white/20 dark:bg-white/10 border-2 border-transparent focus-within:border-white/50 focus-within:bg-white/30 rounded-full transition-all duration-200 shadow-inner group">
            <input
              type="text"
              placeholder="Tìm kiếm phòng chơi, sân bãi, giải đấu, đội nhóm..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Tìm kiếm sân, phòng chơi, CLB và bài tìm người"
              className="w-full bg-transparent pl-3.5 sm:pl-5 pr-11 sm:pr-14 py-1.5 sm:py-2.5 text-xs sm:text-base text-white placeholder-white/80 focus:outline-none truncate"
            />
            <button
              type="submit"
              disabled={isSearchLoading}
              className="absolute right-1 bg-white hover:bg-gray-50 text-black p-1.5 sm:p-2 rounded-full transition-transform active:scale-95 shadow-sm border border-gray-200 dark:bg-[#0a1128] dark:border-gray-700 dark:text-white dark:hover:bg-[#111c43] flex items-center justify-center m-0.5 shrink-0"
              title="Tìm kiếm"
              aria-label="Tìm kiếm"
            >
              <Search className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
            <SearchResults results={searchResults} loading={isSearchLoading} error={searchError} hasSearched={hasSearched} onSelect={handleSearchResult} />
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden w-8 h-8 p-0 bg-white hover:bg-gray-50 rounded-full text-black shadow-sm border border-gray-200 transition-colors flex items-center justify-center"
            title="Tìm kiếm"
            aria-label="Mở tìm kiếm"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={handleChatToggle}
            className={`inline-flex items-center justify-center gap-1.5 w-8 h-8 p-0 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 rounded-full sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all shrink-0 ${
              isChatOpen
                ? 'bg-white text-[#589470] scale-105'
                : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
            }`}
            title="Chat"
            aria-label="Mở chat"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          <button
            onClick={() => setIsPremiumOpen(true)}
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 h-8 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-white font-bold px-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm shadow-[0_0_15px_rgba(234,179,8,0.35)] hover:scale-[1.02] active:scale-95 transition-transform overflow-hidden group relative shrink-0"
            title="Premium"
          >
            <Crown className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
            <span>Premium</span>
            <div className="absolute inset-0 w-[200%] -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse pointer-events-none" />
          </button>

          <button className="w-8 h-8 p-0 sm:w-auto sm:h-auto sm:p-2.5 inline-flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white relative group" title="Thông báo">
            <Bell className="w-4 h-4 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#589470] dark:ring-[#2A593D]" />
          </button>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 p-0 sm:w-auto sm:h-auto sm:p-2.5 inline-flex items-center justify-center hover:bg-white/20 rounded-full transition-colors relative group ml-0 sm:ml-1 text-white"
            title="Chuyển chế độ Sáng / Tối"
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-6 sm:h-6 text-[#DBE64C] group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 sm:w-6 sm:h-6 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>
        </div>
      </div>

      <div className={`w-full max-w-7xl mx-auto px-2 sm:px-6 border-t border-white/20 dark:border-white/5 py-1 sm:py-0 flex items-center justify-between relative overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${isSubNavVisible ? 'max-h-16 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'}`}>
        <nav ref={navContainerRef} className="grid grid-cols-5 md:flex items-center justify-center gap-0 md:gap-10 overflow-x-auto no-scrollbar relative flex-1">
          <div
            className={`absolute bottom-0 h-0.5 sm:h-1 bg-white rounded-t-full ${
              isInitialRender ? 'transition-none' : 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
            } z-10`}
            style={{ left: indicator.left, width: indicator.width }}
          />

          {navItems.map((item, i) => {
            const isActive = activeIndex === i || (activeIndex < 0 && i === 0);
            return (
              <Link
                key={item.path}
                to={item.path}
                ref={el => (navRefs.current[i] = el)}
                className={`relative z-10 py-2 sm:py-3 px-0 sm:px-4 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors duration-200 flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/80 hover:text-white'
                }`}
                title={item.label}
                onClick={closeChat}
              >
                {item.isAvatar ? (
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[11px] sm:text-xs transition-colors shadow-sm ${user?.isCourtOwner ? 'owner-avatar-ring-active p-[2px]' : isActive ? 'bg-white text-[#589470]' : 'bg-white/80 text-[#589470] group-hover:bg-white'}`}>
                    {user?.isCourtOwner ? <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#589470]">{getAvatarLetter()}</span> : getAvatarLetter()}
                  </div>
                ) : (
                  <>
                    {item.mobileIcon ? (
                      <img src={item.mobileIcon} alt="" className="mobile-nav-icon h-6 w-6 object-contain sm:hidden" />
                    ) : (
                      item.icon && <item.icon className="h-5 w-5 stroke-[2.5] sm:hidden" />
                    )}
                    <span className={item.icon ? "hidden sm:inline" : ""}>{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

      </div>

      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[1000] overflow-y-auto bg-black/35 backdrop-blur-sm sm:hidden"
          onClick={() => setIsSearchOpen(false)}
          role="presentation"
        >
          <form
            onSubmit={handleSearchSubmit}
            className="relative mx-3 mt-2 flex items-center rounded-full bg-white/95 p-1.5 shadow-2xl dark:bg-[#0a1128]/95"
            onClick={(event) => event.stopPropagation()}
          >
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm phòng chơi, sân bãi, giải đấu..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              aria-label="Tìm kiếm"
            />
            <button type="submit" disabled={isSearchLoading} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Tìm kiếm">
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              aria-label="Đóng tìm kiếm"
            >
              ×
            </button>
            <SearchResults results={searchResults} loading={isSearchLoading} error={searchError} hasSearched={hasSearched} onSelect={handleSearchResult} />
          </form>
        </div>
      )}

      <PremiumInfoModal
        isOpen={isPremiumOpen}
        onClose={() => setIsPremiumOpen(false)}
      />
    </header>
  );
}
