import React, { useState, useMemo } from 'react';
import { Search, PlusCircle, Users, Sparkles, Filter, MessageSquare, CheckCircle2, SlidersHorizontal, MapPin, Calendar, DollarSign, Award, Trophy, ChevronDown } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import PostCard from './components/PostCard';
import JoinModal from './components/JoinModal';
import CreatePostModal from './components/CreatePostModal';
import FilterSelect from '../../shared/components/FilterSelect';

import badmintonImg from '../../assets/sports/badminton.avif';
import footballImg from '../../assets/sports/foodball.avif';
import pickleballImg from '../../assets/sports/pickleball.jpg';
import tennisImg from '../../assets/sports/tennis.jpg';
import basketballImg from '../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../assets/sports/volleyball.jpg';

const INITIAL_POSTS = [
  {
    id: 1,
    sportId: 'badminton',
    sportName: 'Cầu lông',
    sportEmoji: '🏸',
    image: badmintonImg,
    authorName: 'Minh Khang',
    teamName: 'CLB Cầu Lông Proton',
    timeAgo: '2 giờ trước',
    title: 'Nhóm Cầu Lông Viettel tối nay cần giao lưu thêm 2 bạn nam/nữ',
    description: 'Nhóm mình cố định 2-4-6 tại sân số 2 Viettel Q.10. Tối nay có 2 bạn bận đột xuất nên cần tìm 2 vđv trình độ trung bình yếu đến đánh giao lưu vui vẻ, bao cầu Yonex, trà đá đầy đủ!',
    location: 'Sân cầu lông Viettel, Quận 10',
    timeSlot: '19:00 - 21:00',
    date: 'Tối nay (02/07)',
    currentMembers: 4,
    totalMembers: 6,
    price: '~50.000đ / người (Chia đều)',
    skillLevel: 'Trung bình yếu',
    isVerified: true,
    hasJoined: false,
  },
  {
    id: 2,
    sportId: 'football',
    sportName: 'Bóng đá',
    sportEmoji: '⚽',
    image: footballImg,
    authorName: 'Hoàng Long',
    teamName: 'FC Elite Saigon',
    timeAgo: '4 giờ trước',
    title: 'FC Elite cần tìm 2 hậu vệ đá sân 7 tối mai tại Sân Chấu Giang',
    description: 'Đội hình đá giải cần rà soát lại lối chơi, tìm 2 anh em đá vị trí hậu vệ biên hoặc trung vệ có thể lực tốt, chơi fairplay không quạu. Sân đẹp, nước suối bao trọn gói.',
    location: 'Sân bóng đá Chấu Giang, Quận 7',
    timeSlot: '20:00 - 21:30',
    date: 'Tối mai (03/07)',
    currentMembers: 12,
    totalMembers: 14,
    price: '70.000đ / người',
    skillLevel: 'Khá / Nâng cao',
    isVerified: true,
    hasJoined: false,
  },
  {
    id: 3,
    sportId: 'pickleball',
    sportName: 'Pickleball',
    sportEmoji: '🏓',
    image: pickleballImg,
    authorName: 'Thu Hà',
    teamName: 'Thảo Điền Pickleball Club',
    timeAgo: '5 giờ trước',
    title: 'Giao lưu Pickleball đôi nam nữ chiều nay, sân chuẩn quốc tế',
    description: 'Nhóm 3 người đang thiếu 1 bạn nữ để đánh đôi nam nữ. Nhóm vui vẻ thân thiện, hướng dẫn luật chơi nhiệt tình cho người mới. Có sẵn vợt cho bạn nào chưa có trang bị nhé.',
    location: 'Sân Pickleball Thảo Điền, TP. Thủ Đức',
    timeSlot: '17:00 - 19:00',
    date: 'Chiều nay',
    currentMembers: 3,
    totalMembers: 4,
    price: '80.000đ / người',
    skillLevel: 'Mới chơi / Vui vẻ',
    isVerified: false,
    hasJoined: false,
  },
  {
    id: 4,
    sportId: 'tennis',
    sportName: 'Tennis',
    sportEmoji: '🎾',
    image: tennisImg,
    authorName: 'Quang Vinh',
    teamName: 'Hội Tennis Phú Thọ',
    timeAgo: '1 ngày trước',
    title: 'Tuyển 1 tay vợt trình 2.5 - 3.0 đánh đôi cố định sáng Chủ Nhật',
    description: 'Hội anh em văn phòng chơi thể thao rèn luyện sức khỏe, đánh sân có mái che không lo mưa nắng. Cần tìm 1 tay vợt giao lưu cố định hàng tuần.',
    location: 'Cụm sân Tennis Phú Thọ, Quận 11',
    timeSlot: '07:00 - 09:00',
    date: 'Sáng Chủ Nhật',
    currentMembers: 3,
    totalMembers: 4,
    price: '100.000đ / buổi',
    skillLevel: 'Khá (2.5 - 3.0)',
    isVerified: true,
    hasJoined: false,
  },
  {
    id: 5,
    sportId: 'basketball',
    sportName: 'Bóng rổ',
    sportEmoji: '🏀',
    image: basketballImg,
    authorName: 'Tuấn Kiệt',
    teamName: 'Saigon Street Ballers',
    timeAgo: '1 ngày trước',
    title: 'Tuyển 2 ballers thi đấu 3v3 nửa sân tối thứ 6 tuần này',
    description: 'Giao lưu bóng rổ đường phố 3x3, nhịp độ nhanh, vui vẻ không va chạm mạnh. Anh em nào thích ném 3 điểm hay đột phá thì tham gia ngay cùng nhóm!',
    location: 'Sân bóng rổ Hồ Xuân Hương, Quận 3',
    timeSlot: '18:30 - 20:30',
    date: 'Tối Thứ 6',
    currentMembers: 4,
    totalMembers: 6,
    price: '40.000đ / người',
    skillLevel: 'Trung bình',
    isVerified: false,
    hasJoined: false,
  },
];

export default function Tournament() {
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');
  const [filterSkill, setFilterSkill] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Filter posts based on selected sport in Navbar and 4 dropdown filters
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchSport = !selectedSport || post.sportId === selectedSport;
      
      const matchLocation = filterLocation === 'all' || post.location.toLowerCase().includes(filterLocation.toLowerCase());
      
      const matchTime = filterTime === 'all' || post.date.toLowerCase().includes(filterTime.toLowerCase()) || post.timeSlot.toLowerCase().includes(filterTime.toLowerCase());
      
      const matchPrice = filterPrice === 'all' || 
        (filterPrice === 'Dưới 60k' && (post.price.includes('40') || post.price.includes('50'))) ||
        (filterPrice === '60k - 80k' && (post.price.includes('60') || post.price.includes('70') || post.price.includes('80'))) ||
        (filterPrice === 'Trên 80k' && (post.price.includes('90') || post.price.includes('100')));
        
      const matchSkill = filterSkill === 'all' || post.skillLevel.toLowerCase().includes(filterSkill.toLowerCase());

      return matchSport && matchLocation && matchTime && matchPrice && matchSkill;
    });
  }, [posts, selectedSport, filterLocation, filterTime, filterPrice, filterSkill]);

  const handleJoinClick = (post) => {
    setSelectedPost(post);
    setIsJoinModalOpen(true);
  };

  const handleConfirmJoin = (post) => {
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return { ...p, currentMembers: p.currentMembers + 1, hasJoined: true };
      }
      return p;
    }));
    showToast(`🎉 Đã gửi yêu cầu tham gia kèo "${post.title.slice(0, 30)}..." thành công! Trưởng nhóm sẽ liên hệ bạn sớm.`);
  };

  const handleChatClick = (post) => {
    openChat(post.authorName || 'Trưởng nhóm');
  };

  const handleCreatePost = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    showToast('✨ Đăng bài tìm thành viên thành công! Bài viết của bạn đã xuất hiện trên trang đầu.');
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
      <div className="pb-4 pt-2 px-4 sm:px-6 sticky top-[112px] sm:top-[132px] z-40 transition-all duration-300">
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

        
        {filteredPosts.length === 0 ? (
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
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePost}
      />

    </div>
  );
}
