import { Search, Menu, Sun, Moon, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import NotificationBell from './NotificationBell';
import useChatUnreadCount from '../hooks/useChatUnreadCount';
import { useSportFilter } from '../context/SportFilterContext';
import { searchService } from '../services/api';
import { SearchResults } from './Navbar';

const CATEGORIES = [
  { id: 'badminton', name: 'Badminton', emoji: '🏸' },
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'volleyball', name: 'Volleyball', emoji: '🏐' },
];

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toggleChat } = useChat();
  const chatUnreadCount = useChatUnreadCount();
  const { selectedSport, setSelectedSport } = useSportFilter();
  
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

  const pathName = location.pathname.substring(1) || 'home';
  const pageTitle = pathName.charAt(0).toUpperCase() + pathName.slice(1);

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
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="sticky top-6 z-30 flex justify-center w-full px-4 mb-6 transition-all duration-500">
      <nav className="flex items-center gap-6 px-4 py-2 bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)]">
        {/* Page Title */}
        <div className="shrink-0 pl-2 pr-4 border-r border-slate-200/50 dark:border-white/10 hidden md:block">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white capitalize tracking-tight">{pageTitle}</h1>
        </div>

      {/* Center: Sports Category Bar */}
      <div className="hidden lg:flex justify-center items-center">
        <div className="flex items-center justify-center gap-4">
          {CATEGORIES.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => setSelectedSport(prev => prev === cat.id ? null : cat.id)}
              className="flex items-center justify-center cursor-pointer group shrink-0 select-none outline-none"
              title={cat.name}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center p-0.5 transition-all duration-300 shadow-sm ${
                selectedSport === cat.id 
                  ? 'bg-brand-primary/20 border-2 border-brand-primary scale-110 shadow-brand-primary/20' 
                  : 'bg-blue-50 dark:bg-slate-800/50 border border-blue-200 dark:border-slate-600 group-hover:scale-105 group-hover:border-brand-primary/50'
              }`}>
                <div className={`w-full h-full rounded-full flex items-center justify-center shadow-inner transition-colors duration-300 ${
                  selectedSport === cat.id
                    ? 'bg-gradient-to-br from-brand-primary to-brand-secondary'
                    : 'bg-white dark:bg-slate-900 group-hover:bg-brand-primary/5'
                }`}>
                  <span className={`text-xl transition-transform duration-300 pointer-events-none select-none ${selectedSport === cat.id ? 'scale-110 drop-shadow-md' : 'grayscale-[0.5] group-hover:grayscale-0'}`}>
                    {cat.emoji}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-5 pl-4 border-l border-slate-200/50 dark:border-white/10 pr-2">
        <form onSubmit={handleSearchSubmit} className="relative hidden xl:block">
          <button type="submit" aria-label="Tìm kiếm" disabled={isSearchLoading} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400">
            <Search className="w-4 h-4" />
          </button>
          <input
            type="text" 
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm sân, phòng chơi, CLB..."
            aria-label="Tìm kiếm SportGo"
            className="bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full pl-10 pr-4 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary/50 transition-colors w-48"
          />
          <SearchResults results={searchResults} loading={isSearchLoading} error={searchError} hasSearched={hasSearched} onSelect={handleSearchResult} />
        </form>

        <button onClick={toggleTheme} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors relative">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <NotificationBell className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors relative group rounded-full p-1" />

        <button onClick={toggleChat} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors relative">
          <MessageCircle className="w-5 h-5" />
          {chatUnreadCount > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>}
        </button>

        <button className="md:hidden text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
      </nav>
    </div>
  );
}
