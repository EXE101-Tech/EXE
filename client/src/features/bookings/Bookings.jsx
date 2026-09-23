import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, PlusCircle, Filter, Trophy, Calendar, ChevronDown } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import VenueCard from './components/VenueCard';
import HostSetupModal from './components/HostSetupModal';
import OwnerRegistrationModal from './components/OwnerRegistrationModal';
import OwnerScheduleModal from './components/OwnerScheduleModal';
import FilterSelect from '../../shared/components/FilterSelect';
import { useAuth } from '../../shared/context/AuthContext';
import { courtService, ownerService } from '../../shared/services/api';

import badmintonImg from '../../assets/sports/badminton.avif';
import footballImg from '../../assets/sports/foodball.avif';
import pickleballImg from '../../assets/sports/pickleball.jpg';
import tennisImg from '../../assets/sports/tennis.jpg';
import basketballImg from '../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../assets/sports/volleyball.jpg';

export default function Bookings() {
  const navigate = useNavigate();
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();
  const { user, applyOwnerRegistration } = useAuth();

  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [venueScope, setVenueScope] = useState('all');
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [scheduleVenue, setScheduleVenue] = useState(null);

  const [isOwnerTermsOpen, setIsOwnerTermsOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const loadVenues = useCallback(async () => {
    try {
      const rows = await courtService.getVenues();
      const sportMeta = {
        badminton: { name: 'Cầu lông', emoji: '🏸', image: badmintonImg },
        football: { name: 'Bóng đá', emoji: '⚽', image: footballImg },
        pickleball: { name: 'Pickleball', emoji: '🏓', image: pickleballImg },
        tennis: { name: 'Tennis', emoji: '🎾', image: tennisImg },
        basketball: { name: 'Bóng rổ', emoji: '🏀', image: basketballImg },
        volleyball: { name: 'Bóng chuyền', emoji: '🏐', image: volleyballImg },
      };
      setVenues(rows.map((venue) => {
        const meta = sportMeta[venue.sport_key] || {};
        return {
          ...venue,
          sport: venue.sport_key || '',
          sportName: meta.name || 'Môn thể thao',
          sportEmoji: meta.emoji || '🏅',
          image: venue.image_url || meta.image,
          price: venue.price_label || '',
          courtCount: venue.court_count,
          rating: venue.rating,
          reviewCount: venue.review_count,
          hostName: venue.owner_name,
          isOwnedByUser: venue.owner_id === user?.id,
          facilities: venue.facilities || {},
        };
      }));
      setError('');
    } catch (err) {
      setError(err.message || 'Không tải được danh sách sân');
    } finally { setIsLoading(false); }
  }, [user?.id]);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const handleHostSave = async (venueData) => {
    if (editingVenue) await ownerService.updateVenue(editingVenue.id, venueData);
    else await ownerService.createVenue(venueData);
    await loadVenues();
    setEditingVenue(null);
    setIsHostModalOpen(false);
  };

  const handleEditVenue = (venue) => {
    setEditingVenue(venue);
    setIsHostModalOpen(true);
  };

  const handleDeleteVenue = async (venue) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ ${venue.name} khỏi danh sách không?`)) return;
    try {
      await ownerService.removeVenue(venue.id);
      await loadVenues();
    } catch (err) { setError(err.message || 'Không gỡ được sân'); }
  };

  const handleOpenChat = (venue) => {
    openChat({ id: venue.owner_id, name: venue.hostName || venue.name });
  };

  const handleOwnerRegistration = async () => {
    await applyOwnerRegistration();
    setIsOwnerTermsOpen(false);
    setIsHostModalOpen(true);
  };

  const openOwnerFlow = () => {
    if (user?.ownerStatus === 'registered') {
      setIsHostModalOpen(true);
    } else {
      setIsOwnerTermsOpen(true);
    }
  };

  const filteredVenues = useMemo(() => {
    return venues.filter(venue => {
      // 1. Sport Filter
      if (venueScope === 'mine' && !venue.isOwnedByUser) return false;
      if (selectedSport && selectedSport !== 'all' && venue.sport !== selectedSport) {
        return false;
      }
      // 2. Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = venue.name.toLowerCase().includes(q);
        const matchAddr = venue.address.toLowerCase().includes(q);
        if (!matchName && !matchAddr) return false;
      }
      // 3. Location Filter
      if (locationFilter !== 'all') {
        if (!venue.address.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [venues, selectedSport, searchTerm, locationFilter, venueScope]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white pb-24 font-sans animate-in fade-in duration-300">
      <div className="mx-auto flex max-w-[1600px] justify-end px-4 pt-3 sm:px-6">
        <button type="button" onClick={() => navigate('/my-bookings')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white">
          <Calendar className="h-4 w-4 text-emerald-600" /> Lịch đặt của tôi
        </button>
      </div>
      {/* Hero Banner Section */}


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
              onClick={openOwnerFlow}
              className="px-3.5 py-1.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] text-white shadow-md flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{user?.ownerStatus === 'registered' ? 'Thêm sân' : 'Đăng ký chủ sân'}</span>
            </button>
          </div>

          {/* Filter Boxes Grid: Lọc theo Môn thể thao và Địa điểm */}
          <div className={`${isMobileFilterOpen ? 'flex' : 'hidden'} xl:flex flex-col xl:flex-row items-stretch xl:items-center gap-2 xl:gap-2.5 flex-1 overflow-x-auto no-scrollbar p-1.5 -m-1.5 xl:p-0 xl:m-0 xl:flex-wrap xl:overflow-visible`}>
            {user?.ownerStatus === 'registered' && (
              <div className="flex w-full items-center gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-white/10 xl:w-auto">
                {[['all', 'Toàn bộ sân'], ['mine', 'Sân của tôi']].map(([scope, label]) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setVenueScope(scope)}
                    className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-bold transition-all sm:px-4 xl:flex-none ${venueScope === scope ? 'bg-white text-[#589470] shadow-sm dark:bg-[#0b2538] dark:text-[#74C365]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
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

            {/* 1. Địa điểm (Location / District) */}
            <FilterSelect
              icon={MapPin}
              iconColor="text-rose-500"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">Tất cả khu vực</option>
              <option value="Quận 10">Quận 10</option>
              <option value="Quận 7">Quận 7</option>
              <option value="Thủ Đức">TP. Thủ Đức</option>
              <option value="Quận 11">Quận 11</option>
              <option value="Quận 3">Quận 3</option>
              <option value="Tân Bình">Quận Tân Bình</option>
            </FilterSelect>
          </div>

          {/* Right action: Create Button */}
          <button
            onClick={openOwnerFlow}
            className="hidden xl:flex px-3.5 py-2 xl:px-5 xl:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="sm:hidden">Đăng ký sân</span>
            <span className="hidden sm:inline">{user?.ownerStatus === 'registered' ? 'Thêm sân' : 'Đăng ký làm chủ sân'}</span>
          </button>

        </div>
      </div>

      {/* Venues Grid Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        {isLoading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">Đang tải danh sách sân…</div>
        ) : filteredVenues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} onChat={handleOpenChat} onEdit={handleEditVenue} onDelete={handleDeleteVenue} onSchedule={setScheduleVenue} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white/50 dark:bg-[#001F3F]/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-white/10 my-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Không tìm thấy khu sân nào phù hợp
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khu vực, mức giá khác xem sao nhé.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setLocationFilter('all');
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#74C365] to-[#589470] text-white font-bold text-sm shadow-lg shadow-[#589470]/20 hover:opacity-90 transition-all"
            >
              Xem tất cả sân hiện có
            </button>
          </div>
        )}
      </main>

      {/* Host Setup Modal */}
      <HostSetupModal 
        isOpen={isHostModalOpen} 
        initialVenue={editingVenue}
        onClose={() => { setIsHostModalOpen(false); setEditingVenue(null); }} 
        onSave={handleHostSave} 
      />
      <OwnerRegistrationModal isOpen={isOwnerTermsOpen} onClose={() => setIsOwnerTermsOpen(false)} onAgree={handleOwnerRegistration} />
      <OwnerScheduleModal venue={scheduleVenue} isOpen={!!scheduleVenue} onClose={() => setScheduleVenue(null)} />

    </div>
  );
}
