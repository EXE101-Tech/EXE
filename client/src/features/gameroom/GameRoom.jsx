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

/* ─── Danh mục môn thể thao ─── */

const MOCK_SPORTS = [
  { id: 1, name: 'Badminton', image: badmintonImg, key: 'badminton' },
  { id: 2, name: 'Football', image: footballImg, key: 'football' },
  { id: 3, name: 'Pickleball', image: pickleballImg, key: 'pickleball' },
  { id: 4, name: 'Tennis', image: tennisImg, key: 'tennis' },
];

/* ─── Dữ liệu mẫu – các phòng đang mở ─── */

const LEVEL_STYLES = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  ADVANCED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  PRO: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

const BORDER_COLORS = {
  BEGINNER: 'border-green-500',
  INTERMEDIATE: 'border-blue-500',
  ADVANCED: 'border-orange-400',
  PRO: 'border-red-500',
};

const AVATAR_COLORS = {
  B: 'bg-blue-500',
  P: 'bg-purple-500',
  M: 'bg-green-500',
  L: 'bg-pink-500',
  T: 'bg-teal-500',
  D: 'bg-amber-500',
  H: 'bg-indigo-500',
  K: 'bg-rose-500',
};

// MOCK_ROOMS has been cleared so you can test creating new ones.

/* ─── Room Card ─── */

function RoomCard({ room, onJoin }) {
  const { id, hostName, level, sportLabel, time, avatarBadge, players } = room;
  const slotsLeft = players.max - players.current;

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-l-4 ${BORDER_COLORS[level] ?? 'border-gray-400'}`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${AVATAR_COLORS[avatarBadge] ?? 'bg-gray-500'}`}
      >
        <span className="text-white font-bold text-sm select-none">{avatarBadge}</span>
      </div>

      {/* Thông tin */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-900 dark:text-white font-semibold text-sm">{hostName}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLES[level] ?? 'bg-gray-100 text-gray-600'}`}>
            {level}
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
          {sportLabel} • {time}
        </p>
        <p className={`text-[11px] mt-0.5 ${slotsLeft <= 1 ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
          {players.current}/{players.max} players {slotsLeft <= 1 && '• Almost full!'}
        </p>
      </div>

      {/* Nút Join */}
      <button
        onClick={() => onJoin?.(id)}
        className="shrink-0 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all"
      >
        Join
      </button>
    </div>
  );
}

/* ─── Component chính ─── */

function GameRoom() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSport, setSelectedSport] = useState(null);
  const [currentLocation] = useState('Hồ Chí Minh');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isModalRendered, setIsModalRendered] = useState(false);

  // Form State
  const [rooms, setRooms] = useState([]); // Khởi tạo mảng trống
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    sport: 'badminton',
    level: 'BEGINNER',
    date: '',
    time: '',
    maxPlayers: 4,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateRoom = () => {
    // Validate cơ bản
    if (!formData.title || !formData.date || !formData.time) {
      alert("Vui lòng nhập Tên phòng, Ngày và Giờ!");
      return;
    }

    const newRoom = {
      id: Date.now(),
      hostName: 'Bạn (Nguyễn Văn A)',
      level: formData.level,
      sport: formData.sport,
      sportLabel: MOCK_SPORTS.find(s => s.key === formData.sport)?.name || formData.sport,
      time: `${formData.date}, ${formData.time}`,
      avatarBadge: 'U',
      players: { current: 1, max: parseInt(formData.maxPlayers) || 4 },
    };

    setRooms(prev => [newRoom, ...prev]);
    setIsCreateModalOpen(false);
    // Reset form
    setFormData({
      title: '', description: '', location: '', sport: 'badminton',
      level: 'BEGINNER', date: '', time: '', maxPlayers: 4,
    });
  };

  // Handle modal animation out
  useEffect(() => {
    if (isCreateModalOpen) {
      setIsModalRendered(true);
    } else {
      const timer = setTimeout(() => setIsModalRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isCreateModalOpen]);

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

  /* Lọc rooms theo môn thể thao */
  const selectedSportKey = selectedSport
    ? MOCK_SPORTS.find((s) => s.id === selectedSport)?.key
    : null;

  const filteredRooms = selectedSportKey
    ? rooms.filter((r) => r.sport === selectedSportKey)
    : rooms;

  const handleJoin = (roomId) => {
    // TODO: gameRoomService.join(roomId)
    console.log('Join room:', roomId);
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
            placeholder="Search rooms, players or sports..."
            className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
          />
        </div>
      </header>

      <div className="px-4 pt-5 space-y-7">

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

        {/* ── Open Rooms ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">Open Rooms</h2>
            <div className="flex gap-2">
              <button className="text-blue-600 dark:text-blue-400 text-sm font-medium px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors">
                View All
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/30 flex items-center gap-1"
              >
                <span className="text-lg leading-none">+</span> Tạo Phòng
              </button>
            </div>
          </div>
          {filteredRooms.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} onJoin={handleJoin} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="text-2xl">🎮</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No open rooms for this sport</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Be the first to create one!</p>
            </div>
          )}
        </section>

      </div>

      {/* ── Modal Tạo Phòng Mới (Giọt Nước & Glassmorphism) ── */}
      {isModalRendered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop (Click ra ngoài để đóng) */}
          <div 
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
              isCreateModalOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsCreateModalOpen(false)}
          ></div>

          {/* Nội dung Modal */}
          <div 
            className={`relative w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-[2.5rem] rounded-tl-[4rem] rounded-br-[4rem] border border-white/20 dark:border-gray-800/50 p-6 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.3)] transition-all duration-300 ${
              isCreateModalOpen 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-90 translate-y-8'
            }`}
          >
            {/* Nút Đóng (X) */}
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-5 text-center mt-2">
              Tạo Phòng Mới
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide px-1 pb-2">
              {/* Tên / Tiêu đề */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Tên phòng / Chủ đề</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                  placeholder="Giao lưu cuối tuần..." 
                />
              </div>
              
              {/* Mô tả */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Mô tả (Không bắt buộc)</label>
                <textarea 
                  rows="2" 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" 
                  placeholder="Cần tìm người trình độ khá, chia tiền sân..."
                ></textarea>
              </div>

              {/* Địa điểm (Sân) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Địa điểm (Sân)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <img src={gpsImg} alt="location" className="w-4 h-4 opacity-50 dark:invert" />
                  </div>
                  <input 
                    type="text" 
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    placeholder="Tên sân chơi..." 
                  />
                </div>
              </div>

              {/* Trình độ & Môn thể thao */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Môn thể thao</label>
                  <select 
                    name="sport"
                    value={formData.sport}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                  >
                    <option value="badminton">Badminton</option>
                    <option value="football">Football</option>
                    <option value="pickleball">Pickleball</option>
                    <option value="tennis">Tennis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Trình độ</label>
                  <select 
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="PRO">Pro</option>
                  </select>
                </div>
              </div>

              {/* Thời gian chơi & Số lượng */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Thời gian chơi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date" 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" 
                    />
                    <input 
                      type="time" 
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Số lượng</label>
                  <input 
                    type="number" 
                    name="maxPlayers"
                    min="2"
                    value={formData.maxPlayers}
                    onChange={handleInputChange}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" 
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleCreateRoom}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-3.5 rounded-[1.5rem] hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)]"
            >
              Tạo Phòng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default GameRoom;
