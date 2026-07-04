import React from 'react';
import { Star, MapPin, MessageSquare, Calendar, ShieldCheck, Wifi, Car, Droplets, Coffee, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FACILITY_ICONS = {
  wifi: { label: 'WiFi', icon: Wifi, color: 'text-blue-500 bg-blue-500/10' },
  parking: { label: 'Bãi xe', icon: Car, color: 'text-emerald-500 bg-emerald-500/10' },
  shower: { label: 'Tắm rửa', icon: Droplets, color: 'text-cyan-500 bg-cyan-500/10' },
  canteen: { label: 'Căng-tin', icon: Coffee, color: 'text-amber-500 bg-amber-500/10' },
  rental: { label: 'Thuê đồ', icon: Package, color: 'text-purple-500 bg-purple-500/10' },
};

export default function VenueCard({ venue, onChat }) {
  const navigate = useNavigate();

  const handleBookClick = () => {
    navigate(`/courts/${venue.id}`, { state: { venueData: venue } });
  };

  return (
    <div className="group relative rounded-3xl bg-white dark:bg-[#001F3F]/80 border border-gray-200 dark:border-white/10 p-4 shadow-xl hover:shadow-2xl hover:shadow-[#589470]/15 transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md">
      {/* Glow Aura */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[#74C365]/20 to-[#589470]/0 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

      <div>
        {/* Thumbnail Section */}
        <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800">
          <img 
            src={venue.image} 
            alt={venue.name} 
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />

          {/* Sport Badge */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <span>{venue.sportEmoji || '🏸'}</span>
            <span>{venue.sportName || 'Cầu lông'}</span>
          </div>

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-xs font-black flex items-center gap-1 shadow-lg">
            <Star className="w-3.5 h-3.5 fill-white text-white" />
            <span>{venue.rating || 4.8}</span>
            <span className="text-[10px] font-normal opacity-90">({venue.reviewCount || 24})</span>
          </div>

          {/* Court Count Tag */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] text-white text-[11px] font-bold shadow-md flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{venue.courtCount || 4} sân hoạt động</span>
          </div>
        </div>

        {/* Title & Address */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-[#589470] dark:group-hover:text-[#74C365] transition-colors line-clamp-1" title={venue.name}>
              {venue.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{venue.address}</span>
            {venue.distance && (
              <span className="shrink-0 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium ml-auto">
                {venue.distance}
              </span>
            )}
          </div>
        </div>

        {/* Price Tag (Per 30 mins) */}
        <div className="py-2.5 flex items-center justify-between mb-3 border-t border-slate-100 dark:border-white/5">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Giá thuê khung giờ (30p):
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black bg-gradient-to-r from-[#74C365] to-[#589470] bg-clip-text text-transparent">
              {venue.price || '50.000đ'}
            </span>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">/ 30 phút</span>
          </div>
        </div>

        {/* Facilities Icons */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Tiện ích & Dịch vụ:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(venue.facilities || {}).map(([key, available]) => {
              if (!available) return null;
              const fac = FACILITY_ICONS[key];
              if (!fac) return null;
              const IconComp = fac.icon;
              return (
                <div 
                  key={key} 
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border border-transparent ${fac.color} transition-transform hover:scale-105`}
                >
                  <IconComp className="w-3 h-3" />
                  <span>{fac.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/10 grid grid-cols-12 gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onChat && onChat(venue)}
          className="col-span-5 py-2.5 px-3 rounded-2xl font-bold text-xs bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          title={`Nhắn tin với ${venue.hostName || 'Chủ sân'}`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
          <span className="truncate">Nhắn chủ sân</span>
        </button>

        <button
          type="button"
          onClick={handleBookClick}
          className="col-span-7 py-2.5 px-4 rounded-2xl font-bold text-xs bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-lg shadow-[#589470]/30 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Đặt sân ngay</span>
        </button>
      </div>
    </div>
  );
}
