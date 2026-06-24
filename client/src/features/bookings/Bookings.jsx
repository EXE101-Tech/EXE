import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogIn, Sparkles, LogOut, Crown } from 'lucide-react';
import gpsImg from '../../assets/svgs/gps.svg';
import arrowDownImg from '../../assets/svgs/arrow_down.svg';
import notificationImg from '../../assets/svgs/notification.svg';
import searchImg from '../../assets/svgs/search.svg';
import badmintonImg from '../../assets/icons/badminton.png';
import footballImg from '../../assets/icons/football.png';
import pickleballImg from '../../assets/icons/pickelball.png';
import tennisImg from '../../assets/icons/tennis.png';
import protonImg from '../../assets/images/ProtonBadmintonCenter.png';
import eliteImg from '../../assets/images/EliteFootballArena.png';
import CourtCard from '../home/components/CourtCard';

/* ─── Ưu đãi nhanh ─── */

const MOCK_FLASH_DEALS = [
  {
    id: 1,
    tag: 'HAPPY HOUR',
    tagStyle: 'bg-[#CDFF00] text-gray-900',
    headline: '40% OFF Weekday Mornings',
    bgClass: 'bg-[#0D1117]',
    watermark: 'HAPPY HOUR',
  },
  {
    id: 2,
    tag: 'LIMITED TIME',
    tagStyle: 'bg-green-600 text-white',
    headline: 'Book First Go Free',
    bgClass: 'bg-[#0A2010]',
    watermark: 'LIMITED TIME',
  },
];

/* ─── Danh mục môn thể thao ─── */

const MOCK_SPORTS = [
  { id: 1, name: 'Badminton', image: badmintonImg, key: 'badminton' },
  { id: 2, name: 'Football', image: footballImg, key: 'football' },
  { id: 3, name: 'Pickleball', image: pickleballImg, key: 'pickleball' },
  { id: 4, name: 'Tennis', image: tennisImg, key: 'tennis' },
];

/* ─── Dữ liệu mẫu – danh sách sân ─── */

const MOCK_COURTS = [
  {
    id: 1,
    name: 'Proton Badminton Center',
    rating: 4.8,
    distance: '1.2 km',
    district: 'Quận 7',
    price: '120k/h',
    sport: 'badminton',
    image: protonImg,
  },
  {
    id: 2,
    name: 'Elite Football Arena',
    rating: 4.6,
    distance: '2.8 km',
    district: 'Quận 2',
    price: '450k/h',
    sport: 'football',
    image: eliteImg,
  },
  {
    id: 3,
    name: 'VinCity Tennis Club',
    rating: 4.7,
    distance: '3.5 km',
    district: 'Quận 9',
    price: '200k/h',
    sport: 'tennis',
    image: null,
  },
  {
    id: 4,
    name: 'Riverside Pickle Court',
    rating: 4.5,
    distance: '1.8 km',
    district: 'Quận 1',
    price: '150k/h',
    sport: 'pickleball',
    image: null,
  },
  {
    id: 5,
    name: 'SSport Arena',
    rating: 4.9,
    distance: '0.8 km',
    district: 'Quận 2',
    price: '100k/h',
    sport: 'badminton',
    image: null,
  },
  {
    id: 6,
    name: 'Thủ Đức Football Park',
    rating: 4.3,
    distance: '5.2 km',
    district: 'Thủ Đức',
    price: '350k/h',
    sport: 'football',
    image: null,
  },
];

/* ─── Component chính ─── */

function Bookings() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSport, setSelectedSport] = useState(null);
  const [currentLocation] = useState('Hồ Chí Minh');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleFilterSport = (sportId) => {
    const next = sportId === selectedSport ? null : sportId;
    setSelectedSport(next);
  };

  /* Lọc sân theo môn thể thao */
  const selectedSportKey = selectedSport
    ? MOCK_SPORTS.find((s) => s.id === selectedSport)?.key
    : null;

  const filteredCourts = selectedSportKey
    ? MOCK_COURTS.filter((c) => c.sport === selectedSportKey)
    : MOCK_COURTS;

  const handleBookCourt = (courtId) => {
    navigate(`/courts/${courtId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">

      {/* ── Thanh tiêu đề — giống Home ── */}
      <header className="sticky top-0 bg-white dark:bg-gray-900 z-40 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          {/* Chọn vị trí */}
          <button className="flex items-center gap-1.5">
            <img src={gpsImg} alt="location" className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{currentLocation}</span>
            <img src={arrowDownImg} alt="expand" className="w-3.5 h-3.5 dark:invert" />
          </button>

          {/* Các icon bên phải */}
          <div className="flex items-center gap-2">
            {/* Chuyển đổi giao diện sáng/tối */}
            <button
              onClick={() => setIsDark((d) => !d)}
              className="p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark
                ? <Sun className="w-4 h-4 text-yellow-400" />
                : <Moon className="w-4 h-4 text-gray-600" />
              }
            </button>

            {/* Thông báo */}
            <button className="relative p-1">
              <img src={notificationImg} alt="notifications" className="w-5 h-5 dark:invert" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900" />
            </button>

            {/* Nút Premium */}
            <button className="relative overflow-hidden group bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.4)] hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Premium</span>
              <div className="absolute inset-0 w-[200%] -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer pointer-events-none"></div>
            </button>

            {/* Nút đăng nhập */}
            <button
              onClick={() => navigate('/login')}
              className="hidden md:flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>

            {/* Avatar người dùng có Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
              >
                <span className="text-white text-xs font-bold select-none">U</span>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 text-white text-lg font-bold">U</div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white leading-tight">Nguyễn Văn A</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">van.a@example.com</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sport Levels</h5>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                          <img src={badmintonImg} alt="Badminton" className="w-5 h-5 rounded-md object-cover" />
                          Badminton
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md text-xs">Intermediate</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                          <img src={tennisImg} alt="Tennis" className="w-5 h-5 rounded-md object-cover" />
                          Tennis
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md text-xs">Advanced</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button className="w-full flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-500 font-bold py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2.5">
          <img src={searchImg} alt="search" className="w-4 h-4 shrink-0 opacity-40 dark:invert" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search sports, courts or areas..."
            className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
          />
        </div>
      </header>

      <div className="px-4 pt-5 space-y-7">

        {/* ── Ưu đãi nhanh ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">Flash Deals</h2>
            <button className="text-blue-600 dark:text-blue-400 text-sm font-medium">See All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {MOCK_FLASH_DEALS.map((deal) => (
              <div
                key={deal.id}
                className={`shrink-0 w-72 h-40 ${deal.bgClass} rounded-2xl p-4 flex flex-col justify-end relative overflow-hidden cursor-pointer`}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <span className="text-white/[0.07] text-6xl font-black tracking-widest whitespace-nowrap">
                    {deal.watermark}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-2 ${deal.tagStyle}`}>
                  {deal.tag}
                </span>
                <p className="text-white font-bold text-sm leading-snug">{deal.headline}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Danh mục môn thể thao ── */}
        <section>
          <div className="flex justify-around">
            {MOCK_SPORTS.map((sport) => (
              <button
                key={sport.id}
                onClick={() => handleFilterSport(sport.id)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`relative w-14 h-14 rounded-full overflow-hidden transition-all flex items-center justify-center ${
                    selectedSport === sport.id ? 'scale-105' : 'hover:scale-105'
                  }`}
                >
                  <img src={sport.image} alt={sport.name} className="w-full h-full object-cover" />
                  {selectedSport === sport.id && (
                    <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 pointer-events-none"></div>
                  )}
                </div>
                <span className={`text-xs font-medium ${selectedSport === sport.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {sport.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Nearby Courts ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">Nearby Courts</h2>
            <button className="text-blue-600 dark:text-blue-400 text-sm font-medium">View Map</button>
          </div>
          {filteredCourts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredCourts.map((court) => (
                <CourtCard key={court.id} court={court} onBook={handleBookCourt} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="text-2xl">🏟️</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No courts found for this sport</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Try selecting a different sport</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default Bookings;
