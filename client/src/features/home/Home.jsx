import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogIn, Sparkles, LogOut, Crown, RefreshCw } from 'lucide-react';
import gpsImg from '../../assets/svgs/gps.svg';
import arrowDownImg from '../../assets/svgs/arrow_down.svg';
import notificationImg from '../../assets/svgs/notification.svg';
import searchImg from '../../assets/svgs/search.svg';
import badmintonImg from '../../assets/icons/badminton.png';
import footballImg from '../../assets/icons/football.png';
import pickleballImg from '../../assets/icons/pickelball.png';
import tennisImg from '../../assets/icons/tennis.png';
import PostCard from './components/PostCard';
import { useTranslation } from 'react-i18next';
import { teamService, postService, chatService, apiCache } from '../../shared/services/api';
import { useAuth } from '../../shared/context/AuthContext';
import { useChat } from '../../shared/context/ChatContext';
import Header from '../../shared/components/Header';
import CreatePostModal from './components/CreatePostModal';

/* ─── Danh mục môn thể thao ─── */

const MOCK_SPORTS = [
  { id: 1, name: 'Badminton', image: badmintonImg, key: 'badminton' },
  { id: 2, name: 'Football', image: footballImg, key: 'football' },
  { id: 3, name: 'Pickleball', image: pickleballImg, key: 'pickleball' },
  { id: 4, name: 'Tennis', image: tennisImg, key: 'tennis' },
];

/* ─── Component chính ─── */

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startChat } = useChat();
  const { user } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSport, setSelectedSport] = useState(null);
  const [currentLocation] = useState('Hồ Chí Minh');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [teams, setTeams] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postTab, setPostTab] = useState('all'); // 'all' or 'my'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    let isMounted = true;

    // Hàm chuyển đổi dữ liệu bài viết (khai báo trước để tránh ReferenceError)
    const formatPosts = (rawPosts) => {
      if (!Array.isArray(rawPosts)) return [];
      
      return rawPosts.map(post => {
        try {
          const authorName = post.team ? post.team.name : (post.author?.profile?.full_name || post.author?.email || 'Unknown');
          
          let timeStr = 'Vừa xong';
          if (post.created_at) {
            const timeDiff = Math.floor((new Date() - new Date(post.created_at)) / (1000 * 60 * 60));
            timeStr = timeDiff > 24 ? `${Math.floor(timeDiff/24)} days ago` : (timeDiff > 0 ? `${timeDiff} hours ago` : 'Vừa xong');
          }

          return {
            id: post.id,
            author: authorName,
            hostId: post.user_id,
            isTeam: !!post.team_id,
            avatarBadge: post.team ? (post.team.avatar_badge || authorName.charAt(0)) : (authorName.charAt(0) || 'U').toUpperCase(),
            sport: post.sport?.name?.toLowerCase() || 'unknown',
            sportLabel: post.sport?.name || 'Unknown',
            level: post.required_level || '',
            time: timeStr,
            location: post.location || 'Chưa xác định',
            description: post.content || '',
            images: Array.isArray(post.images) ? post.images.map(img => img.image_url).filter(Boolean) : [],
          };
        } catch (err) {
          console.error("Lỗi khi parse bài viết:", post, err);
          return null;
        }
      }).filter(Boolean); // Bỏ qua các bài viết bị lỗi
    };
    
    const fetchHomeData = async () => {
      const isManualRefresh = refreshKey > 0;
      const filters = selectedSport ? { sport_id: selectedSport } : {};
      
      // Chiến lược Stale-While-Revalidate (SWR): 
      // Lấy dữ liệu từ cache hiển thị NGAY LẬP TỨC nếu có
      const cacheKeyPosts = '/posts' + JSON.stringify(filters);
      const cachedPosts = apiCache.get(cacheKeyPosts);
      
      const cacheKeyTeams = '/teams/top' + JSON.stringify({ sport_id: selectedSport, limit: 10 });
      const cachedTeams = apiCache.get(cacheKeyTeams);

      let hasInitialData = false;

      if (!isManualRefresh && cachedPosts && cachedTeams) {
        // Có cache -> Hiển thị luôn, không hiện hiệu ứng loading
        setTeams(cachedTeams.data || []);
        const formattedCached = formatPosts(cachedPosts.data);
        setPosts(formattedCached || []);
        hasInitialData = true;
      } else {
        setIsPostsLoading(true);
      }

      // VẪN chạy ngầm request lấy dữ liệu mới nhất (buộc bỏ qua cache)
      try {
        const [topTeams, rawPosts] = await Promise.all([
          teamService.getTopTeams(selectedSport, 10, true), // forceRefresh = true
          postService.getAll(filters, true)                 // forceRefresh = true
        ]);
        
        if (isMounted) {
          setTeams(topTeams || []);
          const formattedPosts = formatPosts(rawPosts);
          setPosts(formattedPosts || []);
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        if (isMounted) {
          setIsPostsLoading(false);
        }
      }
    };
    
    fetchHomeData();
    
    return () => {
      isMounted = false;
    };
  }, [selectedSport, refreshKey]);

  const handleFilterSport = (sportId) => {
    const next = sportId === selectedSport ? null : sportId;
    setSelectedSport(next);
  };

  const handleChat = async (postId, authorName, hostId) => {
    if (user?.id === hostId) {
      alert("Bạn không thể tự chat với chính mình.");
      return;
    }
    try {
      // API call to ensure conversation exists
      await chatService.getOrCreateConversation(hostId);
      
      const chatUser = {
        id: hostId, // id của đối phương
        name: authorName,
        avatar: authorName.charAt(0).toUpperCase(),
        lastMessage: 'Bắt đầu trò chuyện...',
        time: 'Vừa xong',
        unread: 0,
        online: true,
      };
      startChat(chatUser);
    } catch (error) {
      console.error("Lỗi tạo cuộc hội thoại:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* ── Thanh tiêu đề ── */}
      <Header 
        currentLocation={currentLocation}
        isDark={isDark}
        setIsDark={setIsDark}
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        searchPlaceholder={t('home.searchPlaceholder')}
      />

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
                  {t(`sports.${sport.key}`, sport.name)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Top Teams ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">{t('home.topTeams')}</h2>
            <button className="text-blue-600 dark:text-blue-400 text-sm font-medium">{t('home.seeAll')}</button>
          </div>
          {teams.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`shrink-0 w-40 h-48 bg-gradient-to-br ${team.bg_gradient || 'from-gray-600 to-gray-800'} rounded-2xl p-4 flex flex-col justify-between relative shadow-md shadow-gray-200 dark:shadow-none`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <span className="text-white font-bold text-sm select-none">{team.avatarBadge || (team.name?.[0] || 'T')}</span>
                    </div>
                    <div className="bg-black/30 backdrop-blur-md rounded-full px-1.5 py-0.5 flex items-center gap-1">
                      <span className="text-yellow-400 text-[10px] leading-none">⭐</span>
                      <span className="text-white text-[10px] font-semibold leading-none">{team.rating || '0.0'}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm leading-tight mb-1">{team.name}</h3>
                    <p className="text-white/80 text-xs flex items-center gap-1">
                       👥 {team.members?.length || 0} {t('home.members')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
               {t('home.noTopTeams')}
             </div>
          )}
        </section>

        {/* ── Recent Posts ── */}
        <section className="pb-24">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-gray-900 dark:text-white font-bold text-lg hidden sm:block">
                {t('home.recentPosts')}
              </h2>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setPostTab('all')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${postTab === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {t('home.allPosts')}
                </button>
                <button
                  onClick={() => setPostTab('my')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${postTab === 'my' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  {t('home.myPosts')}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setRefreshKey(prev => prev + 1)}
                disabled={isPostsLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={16} className={isPostsLoading ? "animate-spin" : ""} />
                {t('home.reload')}
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/30"
              >
                {t('home.newPost')}
              </button>
            </div>
          </div>
          
          {(() => {
            const displayedPosts = postTab === 'my' 
              ? posts.filter(p => user && p.hostId === user.id)
              : posts;
            
            if (isPostsLoading) {
              return (
                <div className="flex justify-center items-center py-16">
                  <RefreshCw className="animate-spin text-blue-500" size={32} />
                </div>
              );
            }
              
            if (displayedPosts.length > 0) {
              return (
                <div className="flex flex-col gap-4">
                  {displayedPosts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onChat={() => handleChat(post.id, post.author, post.hostId)} 
                    />
                  ))}
                </div>
              );
            }
            
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('home.noPosts')}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('home.beTheFirst')}</p>
              </div>
            );
          })()}
        </section>

      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => setRefreshKey(prev => prev + 1)} 
        sports={MOCK_SPORTS}
      />
    </div>
  );
}

export default Home;
