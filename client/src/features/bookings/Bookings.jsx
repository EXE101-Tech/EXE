import React, { useState, useMemo } from 'react';
import { Search, MapPin, DollarSign, Building2, PlusCircle, Sparkles, Filter, RefreshCw, Trophy, Calendar, SlidersHorizontal, Award, Users } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import { useChat } from '../../shared/context/ChatContext';
import VenueCard from './components/VenueCard';
import HostSetupModal from './components/HostSetupModal';

import badmintonCenterImg from '../../assets/images/ProtonBadmintonCenter.png';
import footballArenaImg from '../../assets/images/EliteFootballArena.png';
import heroBgImg from '../../assets/images/hero_bg.png';

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
    image: badmintonCenterImg,
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
    image: footballArenaImg,
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
    image: heroBgImg,
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
    image: heroBgImg,
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
    image: footballArenaImg,
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
    image: badmintonCenterImg,
    hostName: 'Anh Hoàng Tân Bình',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: false },
  },
];

export default function Bookings() {
  const { selectedSport } = useSportFilter();
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#589470]/10 dark:bg-[#74C365]/15 text-[#589470] dark:text-[#74C365] text-xs font-black uppercase tracking-wider mb-3 border border-[#589470]/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Đặt Sân • Online Booking</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Khám Phá & Đặt Sân Thể Thao
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-2xl mt-2 leading-relaxed">
              Hệ thống tra cứu và đặt sân thể thao trực tuyến 24/7. Tìm sân gần bạn nhất, so sánh mức giá và đặt lịch nhanh chóng chỉ trong vài giây!
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar Section ── */}
      <div className="pb-4 pt-1 px-4 sm:px-6 sticky top-[104px] sm:top-[124px] z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-3xl p-3.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all duration-300">
          
          {/* Filter Box: Chỉ lọc theo Địa điểm (Location) */}
          <div className="w-full sm:max-w-xs flex-1">
            <div className="relative">
              <MapPin className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full bg-white dark:bg-[#001F3F]/80 border border-slate-200 dark:border-white/15 rounded-2xl pl-10 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-[#589470] dark:focus:border-[#74C365] shadow-sm appearance-none cursor-pointer hover:border-slate-300 transition-all truncate"
              >
                <option value="all">Tất cả địa điểm</option>
                <option value="Quận 10">Quận 10</option>
                <option value="Quận 7">Quận 7</option>
                <option value="Thủ Đức">TP. Thủ Đức</option>
                <option value="Quận 11">Quận 11</option>
                <option value="Quận 3">Quận 3</option>
                <option value="Tân Bình">Quận Tân Bình</option>
              </select>
            </div>
          </div>

          {/* Right actions: Filter status + Create Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 px-2">
              <SlidersHorizontal className="w-4 h-4 text-[#589470] dark:text-[#74C365]" />
              <span>
                Hiển thị: <strong className="text-slate-900 dark:text-white font-bold">{filteredVenues.length}</strong> sân
              </span>
            </div>

            <button
              onClick={() => setIsHostModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 group shrink-0"
            >
              <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span>Đăng ký làm chủ sân</span>
            </button>
          </div>

        </div>
      </div>

      {/* Venues Grid Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-10">
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
