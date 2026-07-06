import React, { useState } from 'react';
import { MessageSquare, Users, MapPin, Calendar, Clock, Crown, Plus, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

const LEVEL_CONFIG = {
  Beginner: { label: 'Mới chơi', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
  'Mới chơi': { label: 'Mới chơi', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
  'Mới tập': { label: 'Mới chơi', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
  Intermediate: { label: 'Trung bình', badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]' },
  'Trung bình': { label: 'Trung bình', badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]' },
  Advanced: { label: 'Khá / Giỏi', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
  'Khá giỏi': { label: 'Khá / Giỏi', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
  'Khá / Giỏi': { label: 'Khá / Giỏi', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
  Expert: { label: 'Chuyên nghiệp', badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]' },
  'Chuyên nghiệp': { label: 'Chuyên nghiệp', badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]' },
};

const SPORT_ICONS = {
  'cầu lông': '🏸',
  'badminton': '🏸',
  'bóng đá': '⚽',
  'football': '⚽',
  'pickleball': '🏓',
  'tennis': '🎾',
  'bóng rổ': '🏀',
  'basketball': '🏀',
  'bóng bàn': '🏓',
};

const AVATAR_COLORS = [
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-purple-500 to-pink-600',
  'bg-gradient-to-br from-rose-500 to-red-600',
  'bg-gradient-to-br from-cyan-500 to-blue-600',
];

function RoomCard({ room, currentUserId = 1, onJoin, onChat, onManage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    id,
    title,
    description,
    sportName = 'Cầu lông',
    required_level = 'Intermediate',
    start_time,
    end_time,
    max_players = 6,
    status = 'OPEN',
    location = 'Sân thể thao',
    price_info = 'Chia đều theo thực tế',
    host = { id: 101, name: 'Người chơi', avatar: '' },
    participants = [],
  } = room;

  const levelConfig = LEVEL_CONFIG[required_level] || LEVEL_CONFIG.Intermediate;
  const sportEmoji = SPORT_ICONS[sportName?.toLowerCase()] || '⚡';
  const isHost = host.id === currentUserId || room.isMyRoom;
  const isUserJoined = participants.some((p) => p.user_id === currentUserId || p.id === currentUserId);
  const currentCount = participants.length + 1; // Gồm Trưởng phòng và các thành viên
  const isFull = currentCount >= max_players;
  const emptyCount = Math.max(0, max_players - currentCount);

  // Formatting date and time
  const formatDateTime = (startStr, endStr) => {
    try {
      if (!startStr) return { date: 'Hôm nay', time: '19:00 - 21:00' };
      const start = new Date(startStr);
      const end = endStr ? new Date(endStr) : new Date(start.getTime() + 2 * 3600 * 1000);
      const dateStr = start.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      return { date: dateStr, time: `${startTime} - ${endTime}` };
    } catch (e) {
      return { date: 'Hôm nay', time: '19:00 - 21:00' };
    }
  };

  const { date, time } = formatDateTime(start_time, end_time);

  // Generate slots array for lobby visualization
  const slots = Array.from({ length: max_players }, (_, index) => {
    if (index === 0) {
      // First slot is always the host
      return {
        type: 'host',
        name: host.name || 'Trưởng phòng',
        avatar: host.avatar,
        initials: (host.name || 'H').charAt(0).toUpperCase(),
      };
    }
    const participant = participants[index - 1];
    if (participant) {
      const name = participant.user?.name || participant.name || `Người chơi ${index + 1}`;
      return {
        type: 'player',
        name: name,
        status: participant.status || 'APPROVED',
        initials: name.charAt(0).toUpperCase(),
      };
    }
    return { type: 'empty' };
  });

  return (
    <div className="group relative bg-white dark:bg-[#001F3F]/80 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 p-3.5 sm:p-6 shadow-xl hover:shadow-2xl hover:shadow-[#589470]/15 transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md">
      {/* Top Accent Glow for Host / Special rooms */}
      {isHost && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      )}

      <div>
        {/* Top Header: Author + Sport + Status Badge */}
        <div className="mb-2 sm:mb-3">
          {/* Top Section: Author Header (Avatar + Name over Sport Badge + Status Badge) */}
          <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
            <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
              {/* Host Avatar Circle */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] p-[2px] shadow-sm shrink-0 flex items-center justify-center aspect-square mt-0.5">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-black text-sm sm:text-base text-[#589470] dark:text-[#74C365]">
                  {(host.name || 'H').charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Author Info Column: Name on Top, Sport Badge directly Underneath (như Hình 2) */}
              <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-1.5 max-w-full">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight break-words">
                    {host.name || 'Trưởng phòng'}
                  </h4>
                  {isHost && (
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      <Crown className="w-3 h-3 text-emerald-500" /> Của bạn
                    </span>
                  )}
                </div>
                {/* Sport Badge always on line 2 under author name */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#589470]/15 dark:bg-[#74C365]/20 text-[#589470] dark:text-[#74C365] text-[11px] sm:text-xs font-bold shrink-0">
                  <span>{sportEmoji}</span>
                  <span>{sportName}</span>
                </span>
              </div>
            </div>

            {/* Status Badge (Nút màu xanh "Đang chờ") */}
            <div className="shrink-0 ml-1">
              <span className={`text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${
                isFull
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse'
              }`}>
                {isFull ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Đã đầy</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="sm:hidden">Đang chờ</span>
                    <span className="hidden sm:inline">Đang chờ người</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Bottom Row: Skill Level & Member Count */}
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 font-semibold mt-1 sm:mt-1.5">
            <span className="flex items-center gap-1 shrink-0">
              <span className="font-bold text-slate-700 dark:text-slate-300">Trình độ:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] sm:text-xs ${levelConfig.badge}`}>
                {levelConfig.label}
              </span>
            </span>
            <span className="text-slate-400 shrink-0">•</span>
            <span className="font-semibold">
              <strong className="text-[#589470] dark:text-[#74C365] font-black">{currentCount}/{max_players}</strong> thành viên
            </span>
          </div>
        </div>

        {/* Room Title */}
        <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#589470] dark:group-hover:text-[#74C365] mb-1.5 sm:mb-2 transition-colors leading-snug">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <div className="mb-4 sm:mb-5">
            <p className={`text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2 sm:line-clamp-none'}`}>
              {description}
            </p>
            {description.length > 60 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:hidden text-[11px] font-bold text-[#589470] dark:text-[#74C365] mt-1 inline-flex items-center hover:underline focus:outline-none"
              >
                {isExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
              </button>
            )}
          </div>
        )}

        {/* Match Details & Price */}
        <div className="mb-5 space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 sm:gap-y-2.5 gap-x-4">
            <div className="flex items-start sm:items-center gap-2">
              <Calendar className="w-4 h-4 text-[#589470] dark:text-[#74C365] shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-semibold">{date}</span>
              <span className="text-slate-400">|</span>
              <span className="font-bold text-slate-900 dark:text-white">{time}</span>
            </div>

            <div className="flex items-start sm:items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-semibold break-words flex-1">{location}</span>
            </div>
          </div>

          {/* Chi phí nằm dưới địa chỉ */}
          <div className="flex items-start sm:items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Chi phí:</span>
            <span className="font-black text-[#589470] dark:text-[#74C365] break-words">
              {price_info}
            </span>
          </div>
        </div>

        {/* Lobby Slots Visualizer (The "Game Room" vibe) */}
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span>Sảnh chờ người chơi (Lobby Slots):</span>
            <span className="text-[#589470] dark:text-[#74C365] font-bold">{emptyCount} chỗ trống</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {slots.map((slot, idx) => {
              if (slot.type === 'host') {
                return (
                  <div key={idx} className="flex flex-col items-center group/slot relative" title={`Trưởng phòng: ${slot.name}`}>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold flex items-center justify-center shadow-md relative border-2 border-amber-300 dark:border-amber-400">
                      <span>{slot.initials}</span>
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow">
                        <Crown className="w-3 h-3" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 truncate max-w-[50px]">
                      Host
                    </span>
                  </div>
                );
              }

              if (slot.type === 'player') {
                const colorClass = AVATAR_COLORS[(idx + 1) % AVATAR_COLORS.length];
                return (
                  <div key={idx} className="flex flex-col items-center group/slot relative" title={`Thành viên: ${slot.name}`}>
                    <div className={`w-10 h-10 rounded-2xl ${colorClass} text-white font-bold flex items-center justify-center shadow-md border border-white/20 relative`}>
                      <span>{slot.initials}</span>
                      {slot.status === 'PENDING' && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900" title="Đang chờ duyệt" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[50px]">
                      {slot.name.split(' ').pop()}
                    </span>
                  </div>
                );
              }

              // Empty slot
              return (
                <div
                  key={idx}
                  onClick={() => !isHost && !isUserJoined && !isFull && onJoin?.(room)}
                  className={`flex flex-col items-center justify-center w-full aspect-square max-w-[40px] mx-auto rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 text-slate-400 dark:text-slate-400 transition-all ${
                    !isHost && !isUserJoined && !isFull ? 'hover:border-[#589470] dark:hover:border-[#DBE64C] hover:text-[#589470] dark:hover:text-[#DBE64C] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5' : 'opacity-60 cursor-default'
                  }`}
                  title="Ô trống — Bấm để tham gia"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[9px] font-semibold mt-0.5">Trống</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-3.5 sm:pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2.5 sm:gap-3 mt-auto">
        {/* Chat Button */}
        <button
          onClick={() => onChat?.(room)}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm active:scale-95 shrink-0"
          title="Nhắn tin với Trưởng phòng"
        >
          <MessageSquare className="w-4 h-4 text-[#589470] dark:text-[#74C365] shrink-0" />
          <span className="hidden sm:inline">Nhắn tin</span>
        </button>

        {/* Action Button: Manage or Join */}
        {isHost ? (
          <button
            onClick={() => onManage?.(room)}
            className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#589470]/25 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2"
          >
            <UserCheck className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Quản lý ({participants.length})</span>
          </button>
        ) : isUserJoined ? (
          <button
            disabled
            className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm cursor-default flex items-center gap-1.5 sm:gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-[#589470] shrink-0" />
            <span>Đã tham gia</span>
          </button>
        ) : isFull ? (
          <button
            disabled
            className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 font-bold text-xs sm:text-sm cursor-not-allowed border border-rose-500/20 flex items-center gap-1.5"
          >
            <span>Phòng đã đầy</span>
          </button>
        ) : (
          <button
            onClick={() => onJoin?.(room)}
            className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#589470]/25 hover:shadow-lg hover:shadow-[#589470]/30 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Tham gia</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default RoomCard;
