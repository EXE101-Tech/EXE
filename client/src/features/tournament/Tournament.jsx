import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusCircle, Sparkles, Filter, MapPin, Calendar, DollarSign, Award, Trophy, ChevronDown, UserRound } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import PostCard from './components/PostCard';
import JoinModal from './components/JoinModal';
import CreatePostModal from './components/CreatePostModal';
import LfgParticipantsModal from './components/LfgParticipantsModal';
import FilterSelect from '../../shared/components/FilterSelect';
import { lfgService, resolveMediaUrl, storageService } from '../../shared/services/api';
import { useAuth } from '../../shared/context/AuthContext';
import { createSportExperienceMap, sortBySportExperience } from '../../shared/utils/sportExperienceSort';
import { parseStoredCostToVnd } from '../../shared/utils/price';

import badmintonImg from '../../assets/sports/badminton.avif';
import footballImg from '../../assets/sports/foodball.avif';
import pickleballImg from '../../assets/sports/pickleball.jpg';
import tennisImg from '../../assets/sports/tennis.jpg';
import basketballImg from '../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../assets/sports/volleyball.jpg';

export default function Tournament() {
  const [searchParams] = useSearchParams();
  const routeSearch = (searchParams.get('search') || '').trim().toLowerCase();
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();
  const { user } = useAuth();
  const sportExperience = useMemo(() => createSportExperienceMap(user?.sports), [user?.sports]);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');
  const [filterSkill, setFilterSkill] = useState('all');
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [managingPost, setManagingPost] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await lfgService.getAll({ status: 'ALL', sport_id: selectedSport || undefined });
      const emojis = { badminton: '🏸', football: '⚽', pickleball: '🏓', tennis: '🎾', basketball: '🏀', volleyball: '🏐' };
      const images = { badminton: badmintonImg, football: footballImg, pickleball: pickleballImg, tennis: tennisImg, basketball: basketballImg, volleyball: volleyballImg };
      const mapped = items.filter((post) => post.status !== 'CANCELLED').map((post) => ({
        ...post,
        sportId: post.sport_id,
        sportEmoji: emojis[post.sport_id] || '🏅',
        image: resolveMediaUrl(post.image_url) || images[post.sport_id] || badmintonImg,
        authorName: post.author_name || 'Người chơi',
        authorAvatar: resolveMediaUrl(post.author_avatar_url),
        teamName: '',
        timeAgo: new Date(post.created_at).toLocaleString('vi-VN'),
        timeSlot: post.time_slot,
        date: post.date_label,
        currentMembers: post.current_members,
        totalMembers: post.total_members,
        skillLevel: post.skill_level,
        isAuthor: Number(post.author_id) === Number(user?.id),
        hasJoined: post.has_joined,
        isVerified: false,
      }));
      setPosts(mapped);
      setError('');
    } catch (err) {
      setError(err.message || 'Không tải được bài tìm người chơi');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSport, user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Filter posts based on selected sport in Navbar and 4 dropdown filters
  const filteredPosts = useMemo(() => {
    const visiblePosts = posts.filter(post => {
      if (myPostsOnly && Number(post.author_id) !== Number(user?.id)) return false;
      if (routeSearch) {
        return [post.title, post.location, post.description, post.authorName]
          .some((value) => value?.toLowerCase().includes(routeSearch));
      }
      const matchSport = !selectedSport || post.sportId === selectedSport;
      const postPrice = parseStoredCostToVnd(post.price);
      
      const matchLocation = filterLocation === 'all' || post.location.toLowerCase().includes(filterLocation.toLowerCase());
      
      const matchTime = filterTime === 'all' || post.date.toLowerCase().includes(filterTime.toLowerCase()) || post.timeSlot.toLowerCase().includes(filterTime.toLowerCase());
      
      const matchPrice = filterPrice === 'all' ||
        (postPrice !== null && filterPrice === 'Dưới 60k' && postPrice < 60000) ||
        (postPrice !== null && filterPrice === '60k - 80k' && postPrice >= 60000 && postPrice <= 80000) ||
        (postPrice !== null && filterPrice === 'Trên 80k' && postPrice > 80000);
        
      const matchSkill = filterSkill === 'all' || post.skillLevel.toLowerCase().includes(filterSkill.toLowerCase());

      return matchSport && matchLocation && matchTime && matchPrice && matchSkill;
    });
    return sortBySportExperience(visiblePosts, sportExperience, (post) => post.sportId);
  }, [posts, selectedSport, filterLocation, filterTime, filterPrice, filterSkill, routeSearch, sportExperience, myPostsOnly, user?.id]);

  const handleJoinClick = (post) => {
    setSelectedPost(post);
    setIsJoinModalOpen(true);
  };

  const handleConfirmJoin = async (post) => {
    await lfgService.join(post.id);
    await loadPosts();
    showToast('Đã gửi yêu cầu tham gia. Đang chờ chủ bài kiểm duyệt.');
    setIsJoinModalOpen(false);
  };

  const handleChatClick = (post) => {
    openChat({ id: post.author_id, name: post.authorName });
  };

  const handleSavePost = async (postData) => {
    const { image_file: imageFile, ...payload } = postData;
    if (imageFile) payload.image_url = await storageService.uploadImage(imageFile);
    if (editingPost) await lfgService.update(editingPost.id, payload);
    else await lfgService.create(payload);
    await loadPosts();
    showToast(editingPost ? 'Đã cập nhật bài đăng.' : 'Đã đăng bài tìm người chơi.');
    setIsCreateModalOpen(false);
    setEditingPost(null);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setIsCreateModalOpen(true);
  };

  const handleCancelPost = async (post) => {
    try {
      await lfgService.cancel(post.id);
      await loadPosts();
      showToast('Đã hủy bài đăng.');
    } catch (err) { showToast(err.message || 'Không hủy được bài đăng'); }
  };

  const showToast = (msg) => {
    setAlertMessage(msg);
    setTimeout(() => {
      setAlertMessage('');
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative w-full overflow-x-clip font-sans transition-colors duration-500 pb-20">
      
      {/* Toast Notification Alert */}
      {alertMessage && (
        <div className="fixed top-36 right-6 z-[9999] max-w-md bg-white dark:bg-slate-900 border-2 border-[#589470] text-slate-800 dark:text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right duration-300">
          <Sparkles className="w-5 h-5 text-[#589470] shrink-0 mt-0.5" />
          <div className="text-sm font-bold leading-snug flex-1">{alertMessage}</div>
          <button onClick={() => setAlertMessage('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold">✕</button>
        </div>
      )}



      {/* ── Filter Bar Section ── */}
      <div className="navbar-filter-bar pb-4 pt-2 px-4 sm:px-6 sticky top-[112px] sm:top-[132px] z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 xl:gap-3 transition-all duration-300">
          
          {/* Mobile Header (Toggle + Action Button) */}
          <div className="flex xl:hidden items-center justify-between gap-2 w-full">
            <button 
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="flex items-center justify-center gap-1.5 flex-1 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-sm shadow-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Bộ lọc</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] text-white shadow-md flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Đăng bài</span>
            </button>
          </div>

          {/* Filter Boxes Grid */}
          <div className={`${isMobileFilterOpen ? 'flex' : 'hidden'} xl:flex flex-col xl:flex-row items-stretch xl:items-center gap-2 xl:gap-2.5 flex-1 overflow-x-auto no-scrollbar p-1.5 -m-1.5 xl:p-0 xl:m-0 xl:flex-wrap xl:overflow-visible`}>
            
            {/* 0. Môn thể thao (Sport) */}
            <FilterSelect
              icon={Trophy}
              iconColor="text-amber-500"
              value={selectedSport || 'all'}
              onChange={(e) => setSelectedSport(e.target.value === 'all' ? null : e.target.value)}
            >
              <option value="all">Tất cả môn</option>
              <option value="football">⚽ Bóng đá</option>
              <option value="badminton">🏸 Cầu lông</option>
              <option value="pickleball">🏓 Pickleball</option>
              <option value="tennis">🎾 Tennis</option>
              <option value="basketball">🏀 Bóng rổ</option>
              <option value="volleyball">🏐 Bóng chuyền</option>
            </FilterSelect>

            <FilterSelect
              icon={UserRound}
              iconColor="text-violet-500"
              value={myPostsOnly ? 'mine' : 'all'}
              onChange={(event) => setMyPostsOnly(event.target.value === 'mine')}
            >
              <option value="all">Tất cả bài</option>
              <option value="mine">Bài của tôi</option>
            </FilterSelect>

            {/* 1. Địa điểm (Location) */}
            <FilterSelect
              icon={MapPin}
              iconColor="text-rose-500"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="all">Tất cả khu vực</option>
              <option value="Quận 10">Quận 10</option>
              <option value="Quận 7">Quận 7</option>
              <option value="Thủ Đức">TP. Thủ Đức</option>
              <option value="Quận 11">Quận 11</option>
              <option value="Quận 3">Quận 3</option>
            </FilterSelect>

            {/* 2. Thời gian (Time) */}
            <FilterSelect
              icon={Calendar}
              iconColor="text-blue-500"
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
            >
              <option value="all">Tất cả giờ</option>
              <option value="Tối nay">Tối nay</option>
              <option value="Tối mai">Tối mai</option>
              <option value="Chiều">Chiều nay</option>
              <option value="Sáng">Sáng Chủ Nhật</option>
              <option value="Thứ 6">Tối Thứ 6</option>
            </FilterSelect>

            {/* 3. Giá (Price) */}
            <FilterSelect
              icon={DollarSign}
              iconColor="text-amber-500"
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
            >
              <option value="all">Tất cả giá</option>
              <option value="Dưới 60k">Dưới 60.000đ</option>
              <option value="60k - 80k">60.000đ - 80.000đ</option>
              <option value="Trên 80k">Trên 80.000đ</option>
            </FilterSelect>

            {/* 4. Trình độ (Skill) */}
            <FilterSelect
              icon={Award}
              iconColor="text-[#589470] dark:text-[#74C365]"
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
            >
              <option value="all">Tất cả trình độ</option>
              <option value="Mới chơi">Mới chơi / Vui vẻ</option>
              <option value="Trung bình yếu">Trung bình yếu</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Khá">Khá / Nâng cao</option>
            </FilterSelect>

          </div>

          {/* Right action: Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden xl:flex px-3.5 py-2 xl:px-5 xl:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span>Đăng bài</span>
          </button>

        </div>
      </div>

      {/* ── Main Posts Feed ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        {isLoading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">Đang tải bài đăng…</div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center my-6">
            <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Không tìm thấy bài đăng phù hợp</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
              Hiện chưa có kèo tìm người nào khớp với bộ lọc hiện tại của bạn.
            </p>
            <button
              onClick={() => {
                setFilterLocation('all');
                setFilterTime('all');
                setFilterPrice('all');
                setFilterSkill('all');
              }}
              className="px-5 py-2.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-white rounded-2xl font-bold text-xs sm:text-sm transition-colors"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onJoin={handleJoinClick} 
                onChat={handleChatClick} 
                onCancel={handleCancelPost}
                onEdit={handleEditPost}
                onManageParticipants={setManagingPost}
              />
            ))}
          </div>
        )}

      </main>

      {/* ── Modals ── */}
      <JoinModal 
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        post={selectedPost}
        onConfirm={handleConfirmJoin}
      />

      <CreatePostModal 
        key={`${editingPost?.id || 'new-post'}-${isCreateModalOpen ? 'open' : 'closed'}`}
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingPost(null); }}
        onCreate={handleSavePost}
        initialPost={editingPost}
      />

      <LfgParticipantsModal
        isOpen={Boolean(managingPost)}
        post={managingPost}
        onClose={() => setManagingPost(null)}
        onChanged={loadPosts}
      />

    </div>
  );
}
