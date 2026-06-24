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
import PostCard from './components/PostCard';
import { useChat } from '../../shared/context/ChatContext';

/* ─── Danh mục môn thể thao ─── */

const MOCK_SPORTS = [
  { id: 1, name: 'Badminton', image: badmintonImg, key: 'badminton' },
  { id: 2, name: 'Football', image: footballImg, key: 'football' },
  { id: 3, name: 'Pickleball', image: pickleballImg, key: 'pickleball' },
  { id: 4, name: 'Tennis', image: tennisImg, key: 'tennis' },
];

/* ─── Dữ liệu mẫu - Top Teams ─── */

const MOCK_TOP_TEAMS = [
  {
    id: 1,
    name: 'FC Tiến Phát',
    sport: 'football',
    rating: '4.9',
    members: 15,
    avatarBadge: 'TP',
    bgGradient: 'from-green-600 to-green-800',
  },
  {
    id: 2,
    name: 'Pro Badminton Team',
    sport: 'badminton',
    rating: '4.8',
    members: 8,
    avatarBadge: 'PB',
    bgGradient: 'from-blue-600 to-blue-800',
  },
  {
    id: 3,
    name: 'Saigon Pickleball',
    sport: 'pickleball',
    rating: '4.7',
    members: 12,
    avatarBadge: 'SP',
    bgGradient: 'from-teal-600 to-teal-800',
  },
  {
    id: 4,
    name: 'Elite Tennis',
    sport: 'tennis',
    rating: '4.8',
    members: 6,
    avatarBadge: 'ET',
    bgGradient: 'from-orange-500 to-red-600',
  },
];

/* ─── Dữ liệu mẫu - Bài đăng (Posts) ─── */

const MOCK_POSTS = [
  {
    id: 1,
    author: 'Minh Tran',
    isTeam: false,
    avatarBadge: 'M',
    sport: 'badminton',
    sportLabel: 'Badminton',
    level: 'INTERMEDIATE',
    time: '2 hours ago',
    location: 'Proton Badminton Center, Quận 7',
    description: 'Mình cần tìm 2 bạn đánh đôi tối nay lúc 19:00. Trình độ trung bình khá, nam nữ đều được, share tiền sân, ai rảnh ib mình nha!',
    images: [protonImg],
  },
  {
    id: 2,
    author: 'FC Tiến Phát',
    isTeam: true,
    avatarBadge: 'TP',
    sport: 'football',
    sportLabel: 'Football',
    level: 'ADVANCED',
    time: '5 hours ago',
    location: 'Elite Football Arena, Quận 2',
    description: 'Team mình đang thiếu 1 thủ môn cứng cho trận đấu giao hữu 7v7 tối mai lúc 20:00. Đối thủ đá hay, fairplay. Anh em nào muốn thử sức thì liên hệ, tiền nước nôi team bao.',
    images: [eliteImg],
  },
  {
    id: 3,
    author: 'Lan Nguyen',
    isTeam: false,
    avatarBadge: 'L',
    sport: 'pickleball',
    sportLabel: 'Pickleball',
    level: 'BEGINNER',
    time: '1 day ago',
    location: 'Riverside Pickle Court, Quận 1',
    description: 'Có nhóm bạn nào mới tập chơi pickleball cho mình tham gia với. Mình mới sắm vợt, biết luật cơ bản nhưng chưa có team để giao lưu.',
    images: [],
  },
  {
    id: 4,
    author: 'Huy Pham',
    isTeam: false,
    avatarBadge: 'H',
    sport: 'tennis',
    sportLabel: 'Tennis',
    level: 'PRO',
    time: '2 days ago',
    location: 'VinCity Tennis Club, Quận 9',
    description: 'Sáng cuối tuần (7:00 AM) ai rảnh giao lưu không? Kèo giao lưu vui vẻ nâng cao sức khỏe, đánh đơn hoặc đôi đều ok. Ai rảnh thì cmt sđt mình add zalo nhé.',
    images: [],
  },
];

/* ─── Component chính ─── */

function Home() {
  const navigate = useNavigate();
  const { startChat } = useChat(); // Dùng context để mở chat
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

  /* Lọc dữ liệu theo môn thể thao */
  const selectedSportKey = selectedSport
    ? MOCK_SPORTS.find((s) => s.id === selectedSport)?.key
    : null;

  const filteredTeams = selectedSportKey
    ? MOCK_TOP_TEAMS.filter((t) => t.sport === selectedSportKey)
    : MOCK_TOP_TEAMS;

  const filteredPosts = selectedSportKey
    ? MOCK_POSTS.filter((p) => p.sport === selectedSportKey)
    : MOCK_POSTS;

  const handleChat = (postId, authorName) => {
    // Tạo mock user từ tác giả bài viết để nhảy thẳng vào chat
    const chatUser = {
      id: `post-${postId}`,
      name: authorName,
      avatar: authorName.charAt(0).toUpperCase(),
      lastMessage: 'Chào bạn, mình quan tâm đến bài đăng này!',
      time: 'Vừa xong',
      unread: 0,
      online: true,
    };
    startChat(chatUser);
    console.log(`Bắt đầu chat với: ${authorName} từ bài viết ${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* ── Thanh tiêu đề ── */}
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
              onClick={() => setIsDark(d => !d)}
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
              {/* Hiệu ứng ánh gương lấp lánh */}
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
            placeholder="Search teams, posts, or sports..."
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

        {/* ── Top Teams ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">Top Teams</h2>
            <button className="text-blue-600 dark:text-blue-400 text-sm font-medium">See All</button>
          </div>
          {filteredTeams.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className={`shrink-0 w-40 h-48 bg-gradient-to-br ${team.bgGradient} rounded-2xl p-4 flex flex-col justify-between relative shadow-md shadow-gray-200 dark:shadow-none`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <span className="text-white font-bold text-sm select-none">{team.avatarBadge}</span>
                    </div>
                    <div className="bg-black/30 backdrop-blur-md rounded-full px-1.5 py-0.5 flex items-center gap-1">
                      <span className="text-yellow-400 text-[10px] leading-none">⭐</span>
                      <span className="text-white text-[10px] font-semibold leading-none">{team.rating}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm leading-tight mb-1">{team.name}</h3>
                    <p className="text-white/80 text-xs flex items-center gap-1">
                       👥 {team.members} members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
               No top teams found for this sport.
             </div>
          )}
        </section>

        {/* ── Posts / Bảng tin ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">Recent Posts</h2>
            <button className="text-blue-600 dark:text-blue-400 text-sm font-medium">New Post</button>
          </div>
          {filteredPosts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} onChat={handleChat} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No posts for this sport yet.</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Be the first to post!</p>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}

export default Home;

