import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Check, Bell, ChevronDown, Menu, LogOut, User, Crown, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import EditProfileModal from '../../features/profile/EditProfileModal';
import CreateTeamModal from '../../features/team/components/CreateTeamModal';

export default function Navbar() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateProfile } = useAuth();
  const { isChatOpen, toggleChat } = useChat();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const profileRef = useRef(null);

  const getAvatarLetter = () => {
    const name = user?.profile?.full_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Trang Chủ', path: '/home' },
    { label: 'Diễn Đàn', path: '/tournaments' },
    { label: 'Đặt Sân', path: '/bookings', match: (p) => p.startsWith('/bookings') || p.startsWith('/courts') },
    { label: 'Phòng game', path: '/matches' },
    { label: 'Teams', path: '/team' },
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
    <header className="w-full bg-white dark:bg-[#001F3F] border-b border-gray-200 dark:border-white/10 fixed top-0 left-0 right-0 z-[999] shadow-sm transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-1 sm:gap-6">
        <div className="flex items-center shrink-0">
          <div
            onClick={() => navigate('/home')}
            className="cursor-pointer group select-none flex items-center gap-1.5"
          >
            <span className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-transform group-hover:scale-105">
              Sport<span className="text-[#74C365]">Go</span>
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-3xl mx-1.5 sm:mx-6 flex items-center">

          <div className="relative flex items-center flex-1 bg-gray-100 dark:bg-white/10 border-2 border-transparent focus-within:border-[#589470] dark:focus-within:border-[#74C365] focus-within:bg-white dark:focus-within:bg-[#001F3F] rounded-full transition-all duration-200 shadow-inner group">
            <input
              type="text"
              placeholder="Tìm kiếm phòng chơi, sân bãi, giải đấu, đội nhóm..."
              className="w-full bg-transparent pl-3.5 sm:pl-5 pr-11 sm:pr-14 py-1.5 sm:py-2.5 text-xs sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none truncate"
            />
            <button
              className="absolute right-1 bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-90 text-white p-1.5 sm:p-2 rounded-full transition-transform active:scale-95 shadow-md flex items-center justify-center m-0.5 shrink-0"
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

          <button className="p-1.5 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-700 dark:text-gray-200 relative group" title="Thông báo">
            <Bell className="w-4 h-4 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-2 h-2 bg-[#589470] dark:bg-[#74C365] rounded-full ring-2 ring-white dark:ring-[#001F3F]" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors relative group"
            title="Chuyển chế độ Sáng / Tối"
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-6 sm:h-6 text-[#DBE64C] group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 sm:w-6 sm:h-6 text-gray-700 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-1 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors pl-1 sm:pl-1.5 pr-1 sm:pr-2 group ml-0.5 sm:ml-1"
              title="Tài khoản cá nhân"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm ring-2 ring-transparent group-hover:ring-[#589470]/30 transition-all">
                {getAvatarLetter()}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-transform hidden sm:block ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100 dark:border-white/10">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] flex items-center justify-center shrink-0 text-white text-base font-bold shadow-sm">
                    {getAvatarLetter()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight truncate text-sm">
                      {user?.profile?.full_name || 'Người dùng SportGo'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {user?.email || 'user@sportgo.vn'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setIsEditProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <User className="w-4 h-4 text-[#589470] dark:text-[#74C365]" />
                    <span>Chỉnh sửa hồ sơ</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 border-t border-gray-100 dark:border-white/5 py-1 sm:py-0 flex items-center justify-between relative">
        <nav ref={navContainerRef} className="flex items-center justify-start md:justify-center gap-1 sm:gap-10 overflow-x-auto no-scrollbar relative flex-1 pr-2 md:pr-0">
          <div
            className={`absolute bottom-0 h-0.5 sm:h-1 bg-gradient-to-r from-[#74C365] to-[#589470] rounded-t-full ${
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
                className={`relative z-10 py-2 sm:py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors duration-200 flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                  isActive
                    ? 'text-[#589470] dark:text-[#74C365]'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex md:absolute right-4 sm:right-6 md:top-1/2 md:-translate-y-1/2 z-20 items-center gap-1.5 sm:gap-2 shrink-0 pl-1.5 md:pl-0 border-l border-gray-200 dark:border-white/10 md:border-l-0 ml-1">
          <button
            onClick={toggleChat}
            className={`inline-flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all shrink-0 ${
              isChatOpen 
                ? 'bg-[#74C365] text-white shadow-[0_0_15px_rgba(116,195,101,0.5)] scale-105' 
                : 'bg-white/50 dark:bg-white/10 hover:bg-[#74C365]/10 dark:hover:bg-[#74C365]/20 text-slate-700 dark:text-gray-200 hover:text-[#74C365] dark:hover:text-[#74C365] border border-gray-200/80 dark:border-white/10'
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

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onSave={(data) => {
          updateProfile(data);
        }}
      />
    </header>
  );
}