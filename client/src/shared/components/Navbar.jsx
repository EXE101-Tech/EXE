import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sun, Moon, Bell, Crown, MessageSquare, ChevronDown, Menu, LogOut, Check, MapPin, Gamepad2, Users } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import CreateTeamModal from '../../features/team/components/CreateTeamModal';

export default function Navbar() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { isChatOpen, toggleChat } = useChat();
  const { user } = useAuth();
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);

  const getAvatarLetter = () => {
    const name = user?.profile?.full_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const navItems = [
    { label: 'Diễn Đàn', path: '/tournaments', icon: MessageSquare },
    { label: 'Đặt Sân', path: '/bookings', match: (p) => p.startsWith('/bookings') || p.startsWith('/courts'), icon: MapPin },
    { label: 'Phòng game', path: '/matches', icon: Gamepad2 },
    { label: 'Teams', path: '/team', icon: Users },
    { label: 'Hồ Sơ', path: '/home', isAvatar: true },
  ];
  const navRefs = useRef([]);
  const navContainerRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [isInitialRender, setIsInitialRender] = useState(true);

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
    <header className="w-full bg-gradient-to-r from-[#589470] to-[#74C365] dark:from-[#1E3F2B] dark:to-[#2A593D] border-b border-transparent dark:border-white/10 fixed top-0 left-0 right-0 z-[999] shadow-md transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-1 sm:gap-6">
        <div className="flex items-center shrink-0">
          <div
            onClick={() => navigate('/home')}
            className="cursor-pointer group select-none flex items-center gap-1.5"
          >
            <span className="text-xl sm:text-3xl font-black tracking-tight text-white transition-transform group-hover:scale-105">
              SportGo
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-3xl mx-1.5 sm:mx-6 flex items-center">

          <div className="relative flex items-center flex-1 bg-white/20 dark:bg-white/10 border-2 border-transparent focus-within:border-white/50 focus-within:bg-white/30 rounded-full transition-all duration-200 shadow-inner group">
            <input
              type="text"
              placeholder="Tìm kiếm phòng chơi, sân bãi, giải đấu, đội nhóm..."
              className="w-full bg-transparent pl-3.5 sm:pl-5 pr-11 sm:pr-14 py-1.5 sm:py-2.5 text-xs sm:text-base text-white placeholder-white/80 focus:outline-none truncate"
            />
            <button
              className="absolute right-1 bg-white hover:bg-gray-50 text-black p-1.5 sm:p-2 rounded-full transition-transform active:scale-95 shadow-sm border border-gray-200 dark:bg-[#0a1128] dark:border-gray-700 dark:text-white dark:hover:bg-[#111c43] flex items-center justify-center m-0.5 shrink-0"
              title="Tìm kiếm"
            >
              <Search className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsPremiumOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-white font-bold px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm shadow-[0_0_15px_rgba(234,179,8,0.35)] hover:scale-[1.02] active:scale-95 transition-transform overflow-hidden group relative shrink-0"
            title="Premium"
          >
            <Crown className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
            <span>Premium</span>
            <div className="absolute inset-0 w-[200%] -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse pointer-events-none" />
          </button>

          <button className="p-1.5 sm:p-2.5 hover:bg-white/20 rounded-full transition-colors text-white relative group" title="Thông báo">
            <Bell className="w-4 h-4 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#589470] dark:ring-[#2A593D]" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2.5 hover:bg-white/20 rounded-full transition-colors relative group ml-0.5 sm:ml-1 text-white"
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

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 border-t border-white/20 dark:border-white/5 py-1 sm:py-0 flex items-center justify-between relative">
        <nav ref={navContainerRef} className="flex items-center justify-start md:justify-center gap-1 sm:gap-10 overflow-x-auto no-scrollbar relative flex-1 pr-2 md:pr-0">
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
                className={`relative z-10 py-2 sm:py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors duration-200 flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/80 hover:text-white'
                }`}
                title={item.label}
              >
                {item.isAvatar ? (
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[11px] sm:text-xs transition-colors shadow-sm ${isActive ? 'bg-white text-[#589470]' : 'bg-white/80 text-[#589470] group-hover:bg-white'}`}>
                    {getAvatarLetter()}
                  </div>
                ) : (
                  <>
                    {item.icon && <item.icon className="w-5 h-5 stroke-[2.5] sm:hidden" />}
                    <span className={item.icon ? "hidden sm:inline" : ""}>{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex md:absolute right-4 sm:right-6 md:top-1/2 md:-translate-y-1/2 z-20 items-center gap-1.5 sm:gap-2 shrink-0 pl-1.5 md:pl-0 border-l border-white/20 dark:border-white/10 md:border-l-0 ml-1">
          <button
            onClick={toggleChat}
            className={`inline-flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all shrink-0 ${
              isChatOpen 
                ? 'bg-white text-[#589470] scale-105' 
                : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>
      </div>

      <CreateTeamModal
        isOpen={isPremiumOpen}
        onClose={() => setIsPremiumOpen(false)}
        initialView="info"
      />
    </header>
  );
}