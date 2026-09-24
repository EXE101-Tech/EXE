import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, PlusCircle, Gamepad2, Trophy, Award, Filter, Sparkles, SlidersHorizontal, RefreshCw, AlertCircle, MessageSquare, Send, X, Crown, CheckCircle2, MapPin, Calendar, DollarSign, Users, ChevronDown, UserRound } from 'lucide-react';
import { gameRoomService, resolveMediaUrl, sportService } from '../../shared/services/api';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import { useAuth } from '../../shared/context/AuthContext';
import RoomCard from './components/RoomCard';
import CreateRoomModal from './components/CreateRoomModal';
import JoinRoomModal from './components/JoinRoomModal';
import ManageRoomModal from './components/ManageRoomModal';
import FilterSelect from '../../shared/components/FilterSelect';
import { useSearchParams } from 'react-router-dom';
import { createSportExperienceMap, sortBySportExperience } from '../../shared/utils/sportExperienceSort';
import { parseStoredCostToVnd } from '../../shared/utils/price';

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

function GameRoom() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();
  const { user } = useAuth();
  const sportExperience = useMemo(() => createSportExperienceMap(user?.sports), [user?.sports]);
  const [rooms, setRooms] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedTime, setSelectedTime] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(null);
  const [managingRoom, setManagingRoom] = useState(null);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, sports] = await Promise.all([gameRoomService.getAll(), sportService.getAll()]);
      const keyById = Object.fromEntries(sports.filter((sport) => sport.id != null).map((sport) => [sport.id, sport.key]));
      const mapped = data.map((match) => ({
        ...match,
        sportId: keyById[match.sport_id] || '',
        sportName: match.sport?.name || 'Môn thể thao',
        start_time: match.start_time?.endsWith('Z') ? match.start_time : `${match.start_time}Z`,
        end_time: match.end_time?.endsWith('Z') ? match.end_time : `${match.end_time}Z`,
        host: {
          id: match.host_id,
          name: match.host?.profile?.full_name || match.host?.email || 'Người chơi',
          avatar: resolveMediaUrl(match.host?.profile?.avatar_url),
          ownerStatus: match.host?.owner_status || 'none',
        },
        participants: (match.participants || []).filter((participant) => participant.role !== 'HOST').map((participant) => ({
          ...participant,
          name: participant.user?.profile?.full_name || participant.user?.email || 'Người chơi',
          user: {
            id: participant.user_id,
            name: participant.user?.profile?.full_name || participant.user?.email || 'Người chơi',
            avatar: resolveMediaUrl(participant.user?.profile?.avatar_url),
            ownerStatus: participant.user?.owner_status || 'none',
          },
        })),
        isMyRoom: match.host_id === user?.id,
      }));
      setRooms(mapped.filter((room) => !['CANCELLED', 'FINISHED'].includes(room.status)));
      setError('');
      return mapped;
    } catch (err) {
      setError(err.message || 'Không tải được danh sách phòng chơi');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Show auto-dismissing toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const visibleRooms = rooms.filter((room) => {
      if (myPostsOnly && Number(room.host_id) !== Number(user?.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return [room.title, room.location, room.host?.name, room.description]
          .some((value) => value?.toLowerCase().includes(q));
      }
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
        const priceVnd = parseStoredCostToVnd(room.price_info);
        if (priceVnd === null) return false;
        if (selectedPrice === 'Free / Miễn phí' && priceVnd !== 0) return false;
        if (selectedPrice === 'Dưới 50k' && (priceVnd === 0 || priceVnd >= 50000)) return false;
        if (selectedPrice === '50k - 100k' && (priceVnd < 50000 || priceVnd > 100000)) return false;
        if (selectedPrice === 'Trên 100k' && priceVnd <= 100000) return false;
      }
      return true;
    });
    return sortBySportExperience(visibleRooms, sportExperience, (room) => room.sportId || room.sportName);
  }, [rooms, selectedSport, selectedLevel, selectedLocation, selectedTime, selectedPrice, searchQuery, sportExperience, myPostsOnly, user?.id]);

  const handleCreateSubmit = async (newRoomData) => {
    setIsLoading(true);
    try {
      await gameRoomService.create({
        title: newRoomData.title.trim(),
        description: newRoomData.description?.trim() || null,
        sport_id: Number(newRoomData.sport_id),
        required_level: newRoomData.required_level,
        start_time: newRoomData.start_time,
        end_time: newRoomData.end_time,
        max_players: Number(newRoomData.max_players),
        location: newRoomData.location.trim(),
        price_info: newRoomData.price_info?.trim() || null,
      });
      await loadRooms();
      showToast('Đã tạo phòng chơi.');
      setIsCreateOpen(false);
    } catch (err) {
      setError(err.message || 'Không tạo được phòng chơi');
      showToast(err.message || 'Không tạo được phòng chơi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinConfirm = async (roomId, note) => {
    setIsLoading(true);
    try {
      await gameRoomService.join(roomId, note);
      await loadRooms();
      showToast('Đã gửi yêu cầu tham gia phòng.');
      setJoiningRoom(null);
    } catch (err) {
      showToast(err.message || 'Không gửi được yêu cầu tham gia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (roomId, userId, status) => {
    setIsLoading(true);
    try {
      await gameRoomService.approveParticipant(roomId, userId, status);
      const refreshed = await loadRooms();
      setManagingRoom(refreshed.find((room) => room.id === roomId) || null);
      showToast(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} thành viên.`);
    } catch (err) {
      showToast(err.message || 'Không cập nhật được thành viên');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Open Chat
  const handleOpenChat = (room) => {
    openChat(room.host);
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
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-1.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] text-white shadow-md flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Tạo phòng</span>
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
              <option value="all">Tất cả phòng</option>
              <option value="mine">Bài của tôi</option>
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
            className="hidden xl:flex px-3.5 py-2 xl:px-5 xl:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="sm:hidden">Mở phòng</span>
            <span className="hidden sm:inline">Mở phòng chờ</span>
          </button>

        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 pt-4 sm:pt-6">

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}


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
                currentUserId={user?.id || 0}
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
