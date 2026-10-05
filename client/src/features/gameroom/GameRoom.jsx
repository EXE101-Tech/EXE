import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, Trophy, Award, Filter, RefreshCw, CheckCircle2, MapPin, DollarSign, ChevronDown, UserRound, Sparkles } from 'lucide-react';
import { gameRoomService, resolveMediaUrl, sportService } from '../../shared/services/api';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import { useAuth } from '../../shared/context/AuthContext';
import RoomCard from './components/RoomCard';
import CreateRoomModal from './components/CreateRoomModal';
import JoinRoomModal from './components/JoinRoomModal';
import ManageRoomModal from './components/ManageRoomModal';
import AutoRoomSearchModal from './components/AutoRoomSearchModal';
import FilterSelect from '../../shared/components/FilterSelect';
import { useSearchParams } from 'react-router-dom';
import { createSportExperienceMap, sortBySportExperience } from '../../shared/utils/sportExperienceSort';
import { parseStoredCostToVnd } from '../../shared/utils/price';
import { isActiveSport } from '../../shared/constants/sports';
import { LOCATION_FILTER_OPTIONS } from '../../shared/constants/districts';

function GameRoom() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const routeSport = searchParams.get('sport');
  const { selectedSport, setSelectedSport } = useSportFilter();
  useEffect(() => { if (['badminton', 'pickleball', 'football'].includes(routeSport)) setSelectedSport(routeSport); }, [routeSport, setSelectedSport]);
  const { openChat } = useChat();
  const { user } = useAuth();
  const sportExperience = useMemo(() => createSportExperienceMap(user?.sports), [user?.sports]);
  const [rooms, setRooms] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [myPostsOnly, setMyPostsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(null);
  const [managingRoom, setManagingRoom] = useState(null);
  const [isAutoSearchOpen, setIsAutoSearchOpen] = useState(false);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, sports] = await Promise.all([
        myPostsOnly ? gameRoomService.getMine() : gameRoomService.getAll(),
        sportService.getAll(),
      ]);
      const activeSports = sports.filter((sport) => sport.id != null && isActiveSport(sport));
      const keyById = Object.fromEntries(activeSports.map((sport) => [sport.id, sport.key]));
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
          isPremium: Boolean(match.host?.is_premium || (match.host?.premium_until && new Date(match.host.premium_until).getTime() > Date.now())),
          ownerStatus: match.host?.owner_status || 'none',
          attendance_status: (match.participants || []).find((participant) => participant.role === 'HOST')?.attendance_status || null,
        },
        participants: (match.participants || []).filter((participant) => participant.role !== 'HOST').map((participant) => ({
          ...participant,
          name: participant.user?.profile?.full_name || participant.user?.email || 'Người chơi',
          user: {
            id: participant.user_id,
            name: participant.user?.profile?.full_name || participant.user?.email || 'Người chơi',
            avatar: resolveMediaUrl(participant.user?.profile?.avatar_url),
            isPremium: Boolean(participant.user?.is_premium || (participant.user?.premium_until && new Date(participant.user.premium_until).getTime() > Date.now())),
            ownerStatus: participant.user?.owner_status || 'none',
          },
        })),
        isMyRoom: Number(match.host_id) === Number(user?.id),
      }));
      setRooms(mapped.filter((room) => isActiveSport(room.sportId) && (
        myPostsOnly || !['CLOSED', 'CANCELLED', 'FINISHED'].includes(room.status)
      )));
      setError('');
      return mapped;
    } catch (err) {
      setError(err.message || 'Không tải được danh sách phòng chơi');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, myPostsOnly]);

  useEffect(() => { const timer = window.setTimeout(loadRooms, 0); return () => window.clearTimeout(timer); }, [loadRooms]);

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
          (s === 'pickleball' && room.sportName?.toLowerCase().includes('pickleball'));
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
  }, [rooms, selectedSport, selectedLevel, selectedLocation, selectedPrice, searchQuery, sportExperience, myPostsOnly, user?.id]);

  const handleCreateSubmit = async (newRoomData) => {
    setIsLoading(true);
    try {
      const payload = {
        title: newRoomData.title.trim(),
        description: newRoomData.description?.trim() || null,
        sport_id: Number(newRoomData.sport_id),
        court_id: newRoomData.court_id || null,
        required_level: newRoomData.required_level,
        start_time: newRoomData.start_time,
        end_time: newRoomData.end_time,
        max_players: Number(newRoomData.max_players),
        location: newRoomData.location.trim(),
        price_info: newRoomData.price_info.trim(),
      };
      if (editingRoom) await gameRoomService.update(editingRoom.id, payload);
      else await gameRoomService.create(payload);
      await loadRooms();
      showToast(editingRoom ? 'Đã cập nhật phòng chơi.' : 'Đã tạo phòng chơi.');
      setIsCreateOpen(false);
      setEditingRoom(null);
    } catch (err) {
      const message = err.message || (editingRoom ? 'Không cập nhật được phòng chơi' : 'Không tạo được phòng chơi');
      setError(message);
      showToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoom = (room) => {
    setManagingRoom(null);
    setEditingRoom(room);
    setIsCreateOpen(true);
  };

  const handleDeleteRoom = async (room) => {
    const confirmed = window.confirm(`Xóa phòng “${room.title}”? Các thành viên đã tham gia sẽ nhận được thông báo.`);
    if (!confirmed) return;
    setIsLoading(true);
    try {
      await gameRoomService.remove(room.id);
      setManagingRoom(null);
      await loadRooms();
      showToast('Đã xóa phòng. Thành viên trong phòng đã được thông báo.');
    } catch (err) {
      showToast(err.message || 'Không xóa được phòng chơi');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRoom(null);
    setIsCreateOpen(true);
  };

  const openAutoSearchModal = () => {
    if (!user?.isPremium) {
      showToast('Tự động tìm phòng là tính năng dành cho tài khoản Premium.');
      return;
    }
    setIsAutoSearchOpen(true);
  };

  const handleJoinConfirm = async (roomId, note) => {
    setIsLoading(true);
    try {
      await gameRoomService.join(roomId, note);
      await loadRooms();
      showToast(joiningRoom?.isAutoInvite ? 'Đã nhận lời mời vào phòng.' : 'Đã gửi yêu cầu tham gia phòng.');
      setJoiningRoom(null);
    } catch (err) {
      showToast(err.message || 'Không gửi được yêu cầu tham gia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineInvite = async (room) => {
    setIsLoading(true);
    try {
      await gameRoomService.respondInvite(room.id, 'REJECT');
      await loadRooms();
      showToast('Đã từ chối lời mời tự động.');
    } catch (err) {
      showToast(err.message || 'Không thể từ chối lời mời');
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

  const handleUpdateAttendance = async (roomId, userId, attendanceStatus) => {
    setIsLoading(true);
    try {
      await gameRoomService.updateAttendance(roomId, userId, attendanceStatus);
      const refreshed = await loadRooms();
      const refreshedRoom = refreshed?.find((room) => room.id === roomId);
      if (refreshedRoom) {
        setManagingRoom(refreshedRoom);
      } else {
        setManagingRoom((current) => current?.id === roomId ? {
          ...current,
          status: 'CLOSED',
          host: Number(current.host?.id) === Number(userId)
            ? { ...current.host, attendance_status: attendanceStatus }
            : current.host,
          participants: current.participants.map((participant) =>
            Number(participant.user_id ?? participant.user?.id) === Number(userId)
              ? { ...participant, attendance_status: attendanceStatus }
              : participant
          ),
        } : current);
      }
      showToast(attendanceStatus === 'ATTENDED' ? 'Đã xác nhận người chơi tham gia trận.' : 'Đã ghi nhận người chơi không tham gia.');
    } catch (err) {
      showToast(err.message || 'Không cập nhật được trạng thái tham gia');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Open Chat
  const handleOpenChat = (room) => {
    openChat(room.host);
  };

  return (
    <div className="sg-collection min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative w-full overflow-x-clip font-sans pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-36 right-6 z-[9999] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}



      {/* ── Filter Bar Section ── */}
      <div className="navbar-filter-bar pb-4 pt-0 px-4 sm:px-6 sticky top-[112px] sm:top-[132px] z-40 transition-all duration-300">
        <div className="member-filter-panel max-w-[1600px] mx-auto rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 xl:gap-3 transition-all duration-300">
          
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
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={openAutoSearchModal} className="sg-auto-search-button sg-action-button flex items-center justify-center gap-1.5 whitespace-nowrap" title="Thiết lập tự động tìm phòng">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Thiết lập</span>
              </button>
              <button type="button" onClick={openCreateModal} className="sg-action-button flex items-center justify-center gap-1.5 whitespace-nowrap">
                <PlusCircle className="h-4 w-4 shrink-0" />
                <span>Mở phòng</span>
              </button>
            </div>
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
              <option value="badminton">🏸 Cầu lông</option>
              <option value="pickleball">🏓 Pickleball</option>
              <option value="football">⚽ Bóng đá</option>
            </FilterSelect>

            <FilterSelect
              icon={UserRound}
              iconColor="text-violet-500"
              value={myPostsOnly ? 'mine' : 'all'}
              onChange={(event) => setMyPostsOnly(event.target.value === 'mine')}
            >
              <option value="all">Tất cả phòng</option>
              <option value="mine">Phòng của tôi</option>
            </FilterSelect>

            {/* 1. Địa điểm (Location) */}
            <FilterSelect
              icon={MapPin}
              iconColor="text-rose-500"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              {LOCATION_FILTER_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </FilterSelect>

            {/* 2. Phí giao lưu (Price) */}
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

            {/* 3. Trình độ (Skill) */}
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
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <button type="button" onClick={openAutoSearchModal} className="sg-auto-search-button sg-action-button flex items-center justify-center gap-1.5 whitespace-nowrap" title="Thiết lập tự động tìm phòng">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Thiết lập</span>
            </button>
            <button type="button" onClick={openCreateModal} className="sg-action-button flex items-center justify-center gap-1.5 group whitespace-nowrap">
              <PlusCircle className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" />
              <span>Mở phòng</span>
            </button>
          </div>

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
              onClick={openCreateModal}
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
                onDecline={handleDeclineInvite}
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
        initialRoom={editingRoom}
        onClose={() => { setIsCreateOpen(false); setEditingRoom(null); }}
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
        onUpdateAttendance={handleUpdateAttendance}
        onEdit={handleEditRoom}
        onDelete={handleDeleteRoom}
        isLoading={isLoading}
      />

      <AutoRoomSearchModal
        isOpen={isAutoSearchOpen}
        onClose={() => setIsAutoSearchOpen(false)}
        onSaved={() => showToast('Đã lưu thiết lập tự động tìm phòng. Bạn sẽ nhận thông báo khi có phòng phù hợp.')}
      />
    </div>
  );
}

export default GameRoom;
