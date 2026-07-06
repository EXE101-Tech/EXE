import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, PlusCircle, Gamepad2, Trophy, Award, Filter, Sparkles, SlidersHorizontal, RefreshCw, AlertCircle, MessageSquare, Send, X, Crown, CheckCircle2, MapPin, Calendar, DollarSign, Users } from 'lucide-react';
import { gameRoomService } from '../../shared/services/api';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import RoomCard from './components/RoomCard';
import CreateRoomModal from './components/CreateRoomModal';
import JoinRoomModal from './components/JoinRoomModal';
import ManageRoomModal from './components/ManageRoomModal';
import FilterSelect from '../../shared/components/FilterSelect';

const SPORTS_TABS = [
  { id: 'all', name: 'Tất cả môn', emoji: '🌟' },
  { id: 'badminton', name: 'Cầu lông', emoji: '🏸' },
  { id: 'football', name: 'Bóng đá', emoji: '⚽' },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀' },
];

const LEVEL_TABS = [
  { id: 'all', label: 'Tất cả trình độ' },
  { id: 'Beginner', label: 'Mới chơi' },
  { id: 'Intermediate', label: 'Trung bình' },
  { id: 'Advanced', label: 'Khá / Giỏi' },
  { id: 'Expert', label: 'Chuyên nghiệp' },
];

// Rich Mock Fallback Data
const INITIAL_ROOMS = [
  {
    id: 101,
    title: 'Kèo Cầu lông tối thứ 5 giao lưu trình độ Trung bình - Khá',
    description: 'Nhóm cố định 2-4-6 tại sân số 2 Viettel Q.10. Tối nay có 2 bạn bận đột xuất nên cần tìm 2 vđv trình độ trung bình yếu đến đánh giao lưu vui vẻ, bao cầu Yonex, trà đá đầy đủ!',
    sportId: 'badminton',
    sportName: 'Cầu lông',
    required_level: 'Intermediate',
    start_time: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    max_players: 6,
    status: 'OPEN',
    location: 'Sân cầu lông Viettel, Số 1 Đào Duy Anh, Q.10',
    price_info: '~50.000đ / người (Chia đều)',
    host: { id: 201, name: 'Minh Khang', avatar: '' },
    participants: [
      { id: 301, user_id: 301, name: 'Hoàng Long', status: 'APPROVED' },
      { id: 302, user_id: 302, name: 'Thu Thảo', status: 'APPROVED' },
      { id: 303, user_id: 303, name: 'Tuấn Anh', status: 'PENDING' },
    ],
  },
  {
    id: 102,
    title: 'FC Elite tìm 2 hậu vệ đá sân 7 tối mai tại Sân Chấu Giang',
    description: 'Đội hình đá giải cần rà soát lại lối chơi, tìm 2 anh em đá vị trí hậu vệ biên hoặc trung vệ có thể lực tốt, chơi fairplay không quạu. Sân đẹp, nước suối bao trọn gói.',
    sportId: 'football',
    sportName: 'Bóng đá',
    required_level: 'Advanced',
    start_time: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    max_players: 14,
    status: 'OPEN',
    location: 'Sân bóng đá Chấu Giang, Quận 7',
    price_info: '70.000đ / người',
    host: { id: 202, name: 'Quốc Đạt', avatar: '' },
    participants: [
      { id: 304, user_id: 304, name: 'Văn Toàn', status: 'APPROVED' },
      { id: 305, user_id: 305, name: 'Đức Huy', status: 'APPROVED' },
      { id: 306, user_id: 306, name: 'Tiến Linh', status: 'APPROVED' },
      { id: 307, user_id: 307, name: 'Quang Hải', status: 'APPROVED' },
      { id: 308, user_id: 308, name: 'Hùng Dũng', status: 'APPROVED' },
      { id: 309, user_id: 309, name: 'Thành Chung', status: 'APPROVED' },
      { id: 310, user_id: 310, name: 'Tấn Tài', status: 'APPROVED' },
      { id: 311, user_id: 311, name: 'Tuấn Hải', status: 'APPROVED' },
      { id: 312, user_id: 312, name: 'Duy Mạnh', status: 'APPROVED' },
      { id: 313, user_id: 313, name: 'Hoàng Đức', status: 'APPROVED' },
      { id: 314, user_id: 314, name: 'Bùi Hoàng', status: 'PENDING' },
    ],
  },
  {
    id: 103,
    title: 'Pickleball chiều Chủ Nhật trình 2.0+ vui vẻ ra mồ hôi',
    description: 'Tìm 2 bạn đánh đôi nam nữ hoặc đôi nam vui vẻ, sân mát mẻ, anh em thân thiện hòa đồng.',
    sportId: 'pickleball',
    sportName: 'Pickleball',
    required_level: 'Beginner',
    start_time: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 50 * 3600 * 1000).toISOString(),
    max_players: 4,
    status: 'OPEN',
    location: 'Sân Pickleball D-Court, Quận 2',
    price_info: '~60.000đ / người',
    host: { id: 203, name: 'Thanh Vân', avatar: '' },
    participants: [
      { id: 315, user_id: 315, name: 'Minh Tùng', status: 'APPROVED' },
    ],
  },
  {
    id: 104,
    title: 'Giao lưu Tennis đơn nam trình độ Khá, đánh giải nội bộ mini',
    description: 'Cần tìm đối thủ ngang trình đánh giao lưu 3 set chuẩn, sân đẹp bóng mới.',
    sportId: 'tennis',
    sportName: 'Tennis',
    required_level: 'Expert',
    start_time: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    end_time: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    max_players: 4,
    status: 'OPEN',
    location: 'Cụm sân Tennis Lan Anh, Quận 10',
    price_info: '100.000đ / người',
    host: { id: 204, name: 'Victor Vũ', avatar: '' },
    participants: [
      { id: 316, user_id: 316, name: 'Alex Trần', status: 'APPROVED' },
      { id: 317, user_id: 317, name: 'David Nguyễn', status: 'APPROVED' },
    ],
  },
];

function GameRoom() {
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(null);
  const [managingRoom, setManagingRoom] = useState(null);

  // Load from API on mount (Tạm thời vô hiệu hóa endpoint theo yêu cầu, sử dụng trực tiếp dữ liệu mẫu INITIAL_ROOMS)
  useEffect(() => {
    // const fetchRooms = async () => {
    //   setIsLoading(true);
    //   try {
    //     const data = await gameRoomService.getAll();
    //     if (data && Array.isArray(data) && data.length > 0) {
    //       setRooms(data);
    //     }
    //   } catch (err) {
    //     console.warn('GameRoom API fallback:', err.message);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchRooms();
  }, []);

  // Show auto-dismissing toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Filter by Sport from Navbar
      if (selectedSport && selectedSport !== 'all') {
        const s = selectedSport.toLowerCase();
        const matchSport = room.sportId === s ||
          (s === 'badminton' && room.sportName?.toLowerCase().includes('cầu lông')) ||
          (s === 'football' && room.sportName?.toLowerCase().includes('bóng đá')) ||
          (s === 'pickleball' && room.sportName?.toLowerCase().includes('pickleball')) ||
          (s === 'tennis' && room.sportName?.toLowerCase().includes('tennis')) ||
          (s === 'basketball' && room.sportName?.toLowerCase().includes('bóng rổ')) ||
          (s === 'volleyball' && room.sportName?.toLowerCase().includes('bóng chuyền'));
        if (!matchSport) return false;
      }
      // Filter by Level
      if (selectedLevel !== 'all' && room.required_level !== selectedLevel) {
        return false;
      }
      // Filter by Location
      if (selectedLocation !== 'all' && !room.location?.toLowerCase().includes(selectedLocation.toLowerCase())) {
        return false;
      }
      // Filter by Time
      if (selectedTime !== 'all' && !room.start_time?.toLowerCase().includes(selectedTime.toLowerCase())) {
        return false;
      }
      // Filter by Price
      if (selectedPrice !== 'all') {
        const p = parseInt(room.price_info?.replace(/\D/g, '')) || 50000;
        if (selectedPrice === 'duoi50' && p > 50000) return false;
        if (selectedPrice === '50-80' && (p <= 50000 || p > 80000)) return false;
        if (selectedPrice === 'tren80' && p <= 80000) return false;
      }
      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = room.title?.toLowerCase().includes(q);
        const matchLoc = room.location?.toLowerCase().includes(q);
        const matchHost = room.host?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchHost) return false;
      }
      return true;
    });
  }, [rooms, selectedSport, selectedLevel, selectedLocation, selectedTime, selectedPrice, searchQuery]);

  // Handle Create Room (Sử dụng hoàn toàn mock data tạm thời không gọi API endpoint)
  const handleCreateSubmit = async (newRoomData) => {
    setIsLoading(true);
    setTimeout(() => {
      const mockCreated = {
        id: Date.now(),
        ...newRoomData,
        host: { id: 1, name: 'Bạn (Trưởng phòng)', avatar: '' },
        status: 'OPEN',
        participants: [],
        isMyRoom: true,
      };
      setRooms((prev) => [mockCreated, ...prev]);
      showToast('🎉 Đã khởi tạo Phòng chờ mới thành công! Bạn là Trưởng phòng.');
      setIsLoading(false);
      setIsCreateOpen(false);
    }, 400);
  };

  // Handle Join Room Confirm (Sử dụng mock data tạm thời)
  const handleJoinConfirm = async (roomId, note) => {
    setIsLoading(true);
    setTimeout(() => {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === roomId) {
            const exists = r.participants.some((p) => p.user_id === 1 || p.id === 1);
            if (!exists) {
              return {
                ...r,
                participants: [
                  ...r.participants,
                  { id: 1, user_id: 1, name: 'Bạn', status: 'PENDING', note },
                ],
              };
            }
          }
          return r;
        })
      );
      showToast('🚀 Đã gửi yêu cầu xin vào phòng! Trạng thái: Đang chờ duyệt.');
      setIsLoading(false);
      setJoiningRoom(null);
    }, 400);
  };

  // Handle Host Approve / Reject Participant (Sử dụng mock data tạm thời)
  const handleUpdateStatus = async (roomId, userId, status) => {
    setIsLoading(true);
    setTimeout(() => {
      const updateFn = (r) => {
        if (r.id === roomId) {
          if (status === 'REJECTED') {
            return {
              ...r,
              participants: r.participants.filter((p) => (p.user_id || p.id) !== userId),
            };
          } else {
            return {
              ...r,
              participants: r.participants.map((p) =>
                (p.user_id || p.id) === userId ? { ...p, status: 'APPROVED' } : p
              ),
            };
          }
        }
        return r;
      };

      setRooms((prev) => prev.map(updateFn));
      if (managingRoom && managingRoom.id === roomId) {
        setManagingRoom((prev) => updateFn(prev));
      }
      showToast(`✔ Đã cập nhật trạng thái thành viên: ${status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}`);
      setIsLoading(false);
    }, 300);
  };

  // Handle Open Chat
  const handleOpenChat = (room) => {
    openChat(room.host?.name || 'Trưởng phòng');
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative w-full overflow-x-clip font-sans transition-colors duration-500 selection:bg-[#589470]/30 pb-20">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-36 right-6 z-[9999] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="relative bg-transparent pt-10 pb-2 px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#589470]/10 dark:bg-[#74C365]/15 text-[#589470] dark:text-[#74C365] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 sm:mb-3 border border-[#589470]/20">
              <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Sảnh Game • Game Rooms</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Game Rooms & Ghép Đấu
            </h1>
            <p className="text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-base max-w-2xl mt-1.5 sm:mt-2 leading-relaxed">
              Bạn là người chơi lẻ chưa có nhóm? Hãy tự mở phòng chờ hoặc tham gia các sảnh đấu đang tìm bạn chơi phù hợp theo thời gian, trình độ và địa điểm ngay hôm nay!
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar Section ── */}
      <div className="pb-4 pt-1 px-4 sm:px-6 sticky top-[104px] sm:top-[124px] z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300">
          
          {/* Filter Boxes Grid */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 overflow-x-auto no-scrollbar p-1.5 -m-1.5 sm:p-0 sm:m-0 sm:flex-wrap sm:overflow-visible">
            
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
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
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
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            >
              <option value="all">Tất cả giờ</option>
              <option value="Tối nay">Tối nay</option>
              <option value="Tối mai">Tối mai</option>
              <option value="Chiều">Chiều nay</option>
              <option value="Sáng">Sáng Chủ Nhật</option>
              <option value="Thứ 6">Tối Thứ 6</option>
            </FilterSelect>

            {/* 3. Phí giao lưu (Price) */}
            <FilterSelect
              icon={DollarSign}
              iconColor="text-amber-500"
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
            >
              <option value="all">Tất cả phí</option>
              <option value="Free / Miễn phí">Miễn phí / Chia tiền sân</option>
              <option value="Dưới 50k">Dưới 50.000đ</option>
              <option value="50k - 100k">50.000đ - 100.000đ</option>
              <option value="Trên 100k">Trên 100.000đ</option>
            </FilterSelect>

            {/* 4. Trình độ (Skill) */}
            <FilterSelect
              icon={Award}
              iconColor="text-[#589470] dark:text-[#74C365]"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="all">Tất cả trình độ</option>
              <option value="Beginner">Mới chơi</option>
              <option value="Intermediate">Trung bình</option>
              <option value="Advanced">Khá / Giỏi</option>
              <option value="Expert">Chuyên nghiệp</option>
            </FilterSelect>

          </div>

          {/* Right action: Create Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="sm:hidden">Mở phòng</span>
            <span className="hidden sm:inline">Mở phòng chờ</span>
          </button>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 pt-4 sm:pt-6">
        {/* Filter status header - lướt theo trang */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#589470] dark:text-[#74C365] shrink-0" />
            <span>
              Hiển thị: <strong className="text-[#589470] dark:text-[#74C365] font-black text-sm sm:text-base">{filteredRooms.length}</strong> phòng
            </span>
          </div>
        </div>

        {/* Room Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-[#589470] dark:text-[#DBE64C] animate-spin mb-3" />
            <span className="text-sm font-semibold text-slate-500">Đang tải danh sách sảnh chờ...</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-20 text-center bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 p-8">
            <div className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-white/10 flex items-center justify-center mx-auto mb-4 text-3xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Không tìm thấy phòng chờ phù hợp</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Bạn có thể thử chọn môn thể thao khác, thay đổi bộ lọc trình độ, hoặc tự mở một phòng chờ mới cho riêng bạn ngay!
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-3 rounded-2xl bg-[#589470] dark:bg-[#DBE64C] text-white dark:text-[#001F3F] font-bold text-xs shadow-lg active:scale-95 transition-all"
            >
              + Mở Phòng Chờ Mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={1}
                onJoin={(r) => setJoiningRoom(r)}
                onChat={(r) => handleOpenChat(r)}
                onManage={(r) => setManagingRoom(r)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── MODALS ── */}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={isLoading}
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={!!joiningRoom}
        room={joiningRoom}
        onClose={() => setJoiningRoom(null)}
        onConfirm={handleJoinConfirm}
        isLoading={isLoading}
      />

      {/* Manage Room Modal (For Host) */}
      <ManageRoomModal
        isOpen={!!managingRoom}
        room={managingRoom}
        onClose={() => setManagingRoom(null)}
        onUpdateStatus={handleUpdateStatus}
        isLoading={isLoading}
      />
    </div>
  );
}

export default GameRoom;
