import React, { useState, useMemo } from 'react';
import { Users, PlusCircle, Sparkles, SlidersHorizontal, Crown, Shield, UserCheck, Trophy } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import TeamCard from './components/TeamCard';
import CreateTeamModal from './components/CreateTeamModal';
import ReviewTeamModal from './components/ReviewTeamModal';
import FilterSelect from '../../shared/components/FilterSelect';

import badmintonImg from '../../assets/sports/badminton.avif';
import footballImg from '../../assets/sports/foodball.avif';
import pickleballImg from '../../assets/sports/pickleball.jpg';
import tennisImg from '../../assets/sports/tennis.jpg';
import basketballImg from '../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../assets/sports/volleyball.jpg';

// ── Mock Data ──
// isCaptain = true  → user hiện tại là chủ CLB
// isMember  = true  → user hiện tại là thành viên CLB
const INITIAL_TEAMS = [
  {
    id: 1,
    name: 'CLB Cầu Lông Proton',
    sportId: 'badminton',
    sportName: 'Cầu lông',
    sportEmoji: '🏸',
    image: badmintonImg,
    logo: badmintonImg,
    description: 'Câu lạc bộ cầu lông chuyên nghiệp tại Q.10, tập luyện 3 buổi/tuần với sân riêng và huấn luyện viên đẳng cấp. Ưu tiên tinh thần thể thao fairplay và giao lưu vui vẻ.',
    location: 'Sân Viettel, Quận 10',
    members: 42,
    totalSlots: 50,
    rating: 4.9,
    ratingCount: 37,
    isVip: true,
    captain: 'Bạn',
    createdAt: '3 tháng trước',
    tags: ['Sân đẹp', 'Bao cầu', 'Nhiệt tình'],
    isCaptain: true,
    isMember: false,
  },
  {
    id: 2,
    name: 'FC Elite Saigon',
    sportId: 'football',
    sportName: 'Bóng đá',
    sportEmoji: '⚽',
    image: footballImg,
    logo: footballImg,
    description: 'Đội bóng đá sân 7 hoạt động tại Quận 7, thường xuyên tham gia giải phong trào và tuyển thành viên mới. Tập luyện thứ 3 & thứ 5 hàng tuần.',
    location: 'Sân Chấu Giang, Quận 7',
    members: 28,
    totalSlots: 30,
    rating: 4.6,
    ratingCount: 15,
    isVip: true,
    captain: 'Quốc Đạt',
    createdAt: '6 tháng trước',
    tags: ['Fairplay', 'Giải phong trào', 'Bao nước'],
    isCaptain: false,
    isMember: true,
  },
  {
    id: 3,
    name: 'Pickleball Fun Club',
    sportId: 'pickleball',
    sportName: 'Pickleball',
    sportEmoji: '🏓',
    image: pickleballImg,
    logo: pickleballImg,
    description: 'CLB pickleball năng động dành cho mọi trình độ, đặc biệt chào đón người mới bắt đầu. Sân chuẩn quốc tế, có vợt cho mượn.',
    location: 'Sân D-Court, TP. Thủ Đức',
    members: 16,
    totalSlots: 20,
    rating: 5.0,
    ratingCount: 8,
    isVip: false,
    captain: 'Thu Hà',
    createdAt: '1 tháng trước',
    tags: ['Vui vẻ', 'Có vợt cho mượn', 'Mọi trình độ'],
    isCaptain: false,
    isMember: true,
  },
  {
    id: 4,
    name: 'Saigon Street Ballers',
    sportId: 'basketball',
    sportName: 'Bóng rổ',
    sportEmoji: '🏀',
    image: basketballImg,
    logo: basketballImg,
    description: 'Giao lưu bóng rổ đường phố 3x3 và 5v5, nhịp độ nhanh, vui vẻ không va chạm mạnh. Anh em ai thích ném 3 điểm hay đột phá thì gia nhập ngay!',
    location: 'Sân Hồ Xuân Hương, Quận 3',
    members: 18,
    totalSlots: 25,
    rating: 4.7,
    ratingCount: 12,
    isVip: true,
    captain: 'Bạn',
    createdAt: '4 tháng trước',
    tags: ['3x3', 'Streetball', 'Giao lưu thoải mái'],
    isCaptain: true,
    isMember: false,
  },
  {
    id: 5,
    name: 'Tennis Stars Phú Thọ',
    sportId: 'tennis',
    sportName: 'Tennis',
    sportEmoji: '🎾',
    image: tennisImg,
    logo: tennisImg,
    description: 'Nhóm tennis cho anh em văn phòng rèn luyện sức khỏe cuối tuần, sân có mái che không lo mưa nắng. Trình 2.5 - 3.5 NTRP.',
    location: 'Sân Tennis Phú Thọ, Quận 11',
    members: 22,
    totalSlots: 24,
    rating: 4.3,
    ratingCount: 9,
    isVip: false,
    captain: 'Quang Vinh',
    createdAt: '2 tháng trước',
    tags: ['Sân mái che', 'Cuối tuần', 'Đánh giải nội bộ'],
    isCaptain: false,
    isMember: false,
  },
  {
    id: 6,
    name: 'Bóng Chuyền Sài Gòn Open',
    sportId: 'volleyball',
    sportName: 'Bóng chuyền',
    sportEmoji: '🏐',
    image: volleyballImg,
    logo: volleyballImg,
    description: 'CLB bóng chuyền giao lưu thân thiện, tổ chức giải nội bộ hàng quý, chào đón mọi trình độ. Sân tại Q. Bình Thạnh.',
    location: 'Sân Bình Thạnh, TP.HCM',
    members: 30,
    totalSlots: 40,
    rating: 4.5,
    ratingCount: 20,
    isVip: false,
    captain: 'Hồng Nhung',
    createdAt: '5 tháng trước',
    tags: ['Mọi trình độ', 'Giải nội bộ', 'Vui vẻ'],
    isCaptain: false,
    isMember: false,
  },
];

const TABS = [
  { id: 'captain', label: 'CLB tôi làm chủ', icon: Crown, emoji: '👑' },
  { id: 'member', label: 'CLB tôi tham gia', icon: UserCheck, emoji: '🤝' },
  { id: 'discover', label: 'Khám phá CLB', icon: Users, emoji: '🌐' },
];

export default function Team() {
  const { selectedSport, setSelectedSport } = useSportFilter();
  const [teams] = useState(INITIAL_TEAMS);
  const [activeTab, setActiveTab] = useState('captain');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewTeam, setReviewTeam] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');

  // Filter by tab (captain / member / discover) + sport from navbar
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchSport = !selectedSport || team.sportId === selectedSport;
      let matchTab = false;
      if (activeTab === 'captain') matchTab = team.isCaptain;
      else if (activeTab === 'member') matchTab = team.isMember;
      else if (activeTab === 'discover') matchTab = !team.isCaptain && !team.isMember;
      return matchSport && matchTab;
    });
  }, [teams, selectedSport, activeTab]);

  const showToast = (msg) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(''), 4500);
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative w-full overflow-x-clip font-sans transition-colors duration-500 selection:bg-[#589470]/30 pb-20">

      {/* Toast Notification Alert */}
      {alertMessage && (
        <div className="fixed top-36 right-6 z-[9999] max-w-md bg-white dark:bg-slate-900 border-2 border-[#589470] text-slate-800 dark:text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right duration-300">
          <Sparkles className="w-5 h-5 text-[#589470] shrink-0 mt-0.5" />
          <div className="text-sm font-bold leading-snug flex-1">{alertMessage}</div>
          <button onClick={() => setAlertMessage('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold">✕</button>
        </div>
      )}

      {/* ── Header Section ── */}
      <div className="relative bg-transparent pt-10 pb-2 px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#589470]/10 dark:bg-[#74C365]/15 text-[#589470] dark:text-[#74C365] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 sm:mb-3 border border-[#589470]/20">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Câu Lạc Bộ • Teams</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Câu Lạc Bộ & Đội Nhóm
            </h1>
            <p className="text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-base max-w-2xl mt-1.5 sm:mt-2 leading-relaxed">
              Quản lý các CLB bạn đang sở hữu hoặc tham gia. Đăng ký thành lập CLB VIP để được ưu tiên hiển thị & nhận đánh giá uy tín từ cộng đồng!
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar Section ── */}
      <div className="pb-4 pt-1 px-4 sm:px-6 sticky top-[104px] sm:top-[124px] z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300">
          
          {/* Tab Buttons & Sport Filter */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 overflow-x-auto no-scrollbar p-1 -m-1 sm:p-0 sm:m-0 sm:flex-wrap sm:overflow-visible">
            {/* Sport Filter */}
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

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 border-2 shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-[#001F3F] text-[#589470] dark:text-[#74C365] border-[#589470] dark:border-[#74C365] shadow-md'
                        : 'bg-white dark:bg-[#001F3F]/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right action: Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-95 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="sm:hidden">Tạo CLB</span>
            <span className="hidden sm:inline">Thành lập CLB</span>
          </button>

        </div>
      </div>

      {/* ── Main Teams Feed ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Filter status header - lướt theo trang */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#589470] dark:text-[#74C365] shrink-0" />
            <span>
              Hiển thị: <strong className="text-[#589470] dark:text-[#74C365] font-black text-sm sm:text-base">{filteredTeams.length}</strong> CLB
            </span>
          </div>
        </div>
        
        {filteredTeams.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center my-6">
            <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              {activeTab === 'captain' ? '👑' : activeTab === 'member' ? '🤝' : '🔍'}
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              {activeTab === 'captain' && 'Bạn chưa sở hữu CLB nào'}
              {activeTab === 'member' && 'Bạn chưa tham gia CLB nào'}
              {activeTab === 'discover' && 'Không tìm thấy CLB nào'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
              {activeTab === 'captain' && 'Hãy thành lập CLB mới để bắt đầu xây dựng cộng đồng thể thao của riêng bạn!'}
              {activeTab === 'member' && 'Hãy khám phá và tham gia các CLB trong tab "Khám phá CLB" để kết nối cộng đồng!'}
              {activeTab === 'discover' && 'Hiện chưa có CLB nào phù hợp với môn thể thao bạn đang chọn. Thử xóa bộ lọc hoặc thành lập CLB mới!'}
            </p>
            {(activeTab === 'captain' || activeTab === 'discover') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                + Thành lập CLB mới
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                activeTab={activeTab}
                onReview={() => setReviewTeam(team)}
              />
            ))}
          </div>
        )}

      </main>

      {/* ── Modals ── */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {reviewTeam && (
        <ReviewTeamModal
          teamId={reviewTeam.id}
          isOpen={!!reviewTeam}
          onClose={() => setReviewTeam(null)}
        />
      )}

    </div>
  );
}
