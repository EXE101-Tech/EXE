import React, { useState, useMemo } from 'react';
import { Search, MapPin, DollarSign, Building2, PlusCircle, Sparkles, Filter, RefreshCw, Trophy, Calendar, SlidersHorizontal, Award, Users } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import VenueCard from './components/VenueCard';
import HostSetupModal from './components/HostSetupModal';
import FilterSelect from '../../shared/components/FilterSelect';

import badmintonImg from '../../assets/sports/badminton.avif';
import footballImg from '../../assets/sports/foodball.avif';
import pickleballImg from '../../assets/sports/pickleball.jpg';
import tennisImg from '../../assets/sports/tennis.jpg';
import basketballImg from '../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../assets/sports/volleyball.jpg';

const INITIAL_VENUES = [
  {
    id: 1,
    name: 'Sân Cầu Lông Proton VIP Q10',
    sport: 'badminton',
    sportName: 'Cầu lông',
    sportEmoji: '🏸',
    address: '286 Thành Thái, Phường 14, Quận 10, TP.HCM',
    distance: '0.8 km',
    rating: 4.9,
    reviewCount: 42,
    price: '50.000đ',
    priceNumber: 50000,
    courtCount: 6,
    image: badmintonImg,
    hostName: 'Anh Tuấn Proton',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
  },
  {
    id: 2,
    name: 'Sân Bóng Đá Cỏ Nhân Tạo Elite Q7',
    sport: 'football',
    sportName: 'Bóng đá',
    sportEmoji: '⚽',
    address: '45 Nguyễn Thị Thập, Tân Phong, Quận 7, TP.HCM',
    distance: '2.5 km',
    rating: 4.8,
    reviewCount: 56,
    price: '80.000đ',
    priceNumber: 80000,
    courtCount: 4,
    image: footballImg,
    hostName: 'Chị Mai Elite',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
  },
  {
    id: 3,
    name: 'CLB Pickleball Thảo Điền Smash',
    sport: 'pickleball',
    sportName: 'Pickleball',
    sportEmoji: '🏓',
    address: '12 Quốc Hương, Thảo Điền, TP. Thủ Đức, TP.HCM',
    distance: '4.1 km',
    rating: 5.0,
    reviewCount: 31,
    price: '60.000đ',
    priceNumber: 60000,
    courtCount: 8,
    image: pickleballImg,
    hostName: 'Coach Hùng Pickle',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
  },
  {
    id: 4,
    name: 'Cụm Sân Tennis Phú Thọ Thể Thao',
    sport: 'tennis',
    sportName: 'Tennis',
    sportEmoji: '🎾',
    address: '219 Lý Thường Kiệt, Phường 15, Quận 11, TP.HCM',
    distance: '1.7 km',
    rating: 4.7,
    reviewCount: 28,
    price: '90.000đ',
    priceNumber: 90000,
    courtCount: 5,
    image: tennisImg,
    hostName: 'Ban Quản Lý Phú Thọ',
    facilities: { wifi: true, parking: true, shower: true, canteen: false, rental: true },
  },
  {
    id: 5,
    name: 'Trung Tâm Bóng Rổ SSA Arena Q3',
    sport: 'basketball',
    sportName: 'Bóng rổ',
    sportEmoji: '🏀',
    address: '141 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
    distance: '3.0 km',
    rating: 4.9,
    reviewCount: 19,
    price: '70.000đ',
    priceNumber: 70000,
    courtCount: 3,
    image: basketballImg,
    hostName: 'Coach Long SSA',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
  },
  {
    id: 6,
    name: 'Nhà Thi Đấu Bóng Chuyền Tân Bình',
    sport: 'volleyball',
    sportName: 'Bóng chuyền',
    sportEmoji: '🏐',
    address: '448 Hoàng Văn Thụ, Phường 4, Tân Bình, TP.HCM',
    distance: '3.8 km',
    rating: 4.6,
    reviewCount: 22,
    price: '55.000đ',
    priceNumber: 55000,
    courtCount: 4,
    image: volleyballImg,
    hostName: 'Anh Hoàng Tân Bình',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: false },
  },
];

export default function Bookings() {
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();

  const [venues, setVenues] = useState(INITIAL_VENUES);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);

  const handleHostSave = (newVenue) => {
    setVenues(prev => [newVenue, ...prev]);
  };

  const handleOpenChat = (venue) => {
    openChat(venue.hostName || venue.name);
  };

  const filteredVenues = useMemo(() => {
    return venues.filter(venue => {
      // 1. Sport Filter
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
  }, [venues, selectedSport, searchTerm, locationFilter]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white pb-24 font-sans animate-in fade-in duration-300">
      
      {/* Hero Banner Section */}
      <div className="relative bg-transparent pt-10 pb-2 px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#589470]/10 dark:bg-[#74C365]/15 text-[#589470] dark:text-[#74C365] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 sm:mb-3 border border-[#589470]/20">
              <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Đặt Sân • Online Booking</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Khám Phá & Đặt Sân Thể Thao
            </h1>
            <p className="text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-base max-w-2xl mt-1.5 sm:mt-2 leading-relaxed">
              Hệ thống tra cứu và đặt sân thể thao trực tuyến 24/7. Tìm sân gần bạn nhất, so sánh mức giá và đặt lịch nhanh chóng chỉ trong vài giây!
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar Section ── */}
      <div className="pb-4 pt-1 px-4 sm:px-6 sticky top-[104px] sm:top-[124px] z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300">
          
          {/* Filter Boxes Grid: Lọc theo Môn thể thao và Địa điểm */}
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
            onClick={() => setIsHostModalOpen(true)}
            className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="sm:hidden">Đăng ký sân</span>
            <span className="hidden sm:inline">Đăng ký làm chủ sân</span>
          </button>

        </div>
      </div>

      {/* Venues Grid Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Filter status header - lướt theo trang */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#589470] dark:text-[#74C365] shrink-0" />
            <span>
              Hiển thị: <strong className="text-[#589470] dark:text-[#74C365] font-black text-sm sm:text-base">{filteredVenues.length}</strong> sân
            </span>
          </div>
        </div>
        {filteredVenues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} onChat={handleOpenChat} />
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
        onClose={() => setIsHostModalOpen(false)} 
        onSave={handleHostSave} 
      />

    </div>
  );
}
