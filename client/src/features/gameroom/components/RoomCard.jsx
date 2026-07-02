import React from 'react';
import { MessageSquare, Users, MapPin, Calendar, Clock, Crown, Plus, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

const LEVEL_CONFIG = {
  Beginner: {
    label: 'Beginner (Mới chơi)',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
  },
  Intermediate: {
    label: 'Intermediate (Trung bình)',
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]',
  },
  Advanced: {
    label: 'Advanced (Khá/Giỏi)',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  },
  Expert: {
    label: 'Expert (Chuyên nghiệp)',
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
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
    <div className="group relative bg-white dark:bg-[#001F3F]/80 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm hover:shadow-xl dark:hover:shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Top Accent Glow for Host / Special rooms */}
      {isHost && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      )}

      <div>
        {/* Top Header: Sport, Status, Level */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xl shadow-inner shrink-0">
              {sportEmoji}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                {sportName}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${levelConfig.badge} ${levelConfig.glow}`}>
                  {levelConfig.label}
                </span>
                {isHost && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-emerald-500" /> Của bạn
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isFull ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse'
            }`}>
              {isFull ? '🔴 Đã đầy phòng' : '🟢 Đang chờ người'}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 mt-1 font-medium">
              {currentCount} / {max_players} thành viên
            </span>
          </div>
        </div>

        {/* Room Title */}
        <h3 className="text-lg md:text-xl font-bold text-[#589470] dark:text-[#DBE64C] mb-1.5 transition-colors leading-snug">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-300/90 mb-4 font-normal leading-relaxed">
            {description}
          </p>
        )}

        {/* Match Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 mb-5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#589470] dark:text-[#DBE64C] shrink-0" />
            <span className="font-semibold">{date}</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-slate-900 dark:text-white">{time}</span>
          </div>

          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate font-medium">{location}</span>
          </div>
        </div>

        {/* Lobby Slots Visualizer (The "Game Room" vibe) */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <span>Sảnh chờ người chơi (Lobby Slots):</span>
            <span className="text-[#589470] dark:text-[#DBE64C] font-bold">{emptyCount} chỗ trống</span>
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
      <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 mt-auto">
        {/* Host Info & Price */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-300 dark:border-white/10">
            {(host.name || 'H').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
              {host.name || 'Trưởng phòng'}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
              💰 {price_info}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Chat Button */}
          <button
            onClick={() => onChat?.(room)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white font-medium transition-all flex items-center gap-1.5 text-xs shadow-sm active:scale-95"
            title="Nhắn tin với Trưởng phòng"
          >
            <MessageSquare className="w-4 h-4 text-[#589470] dark:text-[#DBE64C]" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* Action Button: Manage or Join */}
          {isHost ? (
            <button
              onClick={() => onManage?.(room)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Quản lý ({participants.length})</span>
            </button>
          ) : isUserJoined ? (
            <button
              disabled
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-default flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Đã tham gia</span>
            </button>
          ) : isFull ? (
            <button
              disabled
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 font-bold text-xs cursor-not-allowed border border-rose-500/20"
            >
              Phòng đã đầy
            </button>
          ) : (
            <button
              onClick={() => onJoin?.(room)}
              className="px-5 py-2.5 rounded-xl bg-[#589470] hover:bg-[#4a7c5d] dark:bg-[#DBE64C] dark:hover:bg-[#c8d438] text-white dark:text-[#001F3F] font-black text-xs shadow-lg shadow-[#589470]/20 dark:shadow-[#DBE64C]/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Join Ngay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomCard;
