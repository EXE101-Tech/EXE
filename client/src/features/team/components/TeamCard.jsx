import React, { useState } from 'react';
import { Star, Crown, Users, MapPin, MessageSquare, CheckCircle2, UserPlus, Award, Settings } from 'lucide-react';

const getSportBadgeColors = (sportId) => {
  switch (sportId) {
    case 'football':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'badminton':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'pickleball':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'tennis':
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
    case 'basketball':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
    default:
      return 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30';
  }
};

export default function TeamCard({ team, activeTab, onReview }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFull = team.members >= team.totalSlots;
  const available = team.totalSlots - team.members;

  return (
    <div className="group relative bg-white dark:bg-[#001F3F]/80 border border-gray-100 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_45px_rgba(88,148,112,0.12)] dark:hover:shadow-[0_15px_45px_rgba(116,195,101,0.15)] transition-all duration-300 hover:-translate-y-1 flex flex-col md:flex-row gap-6 overflow-hidden">
      
      {/* Decorative subtle background aura */}
      <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-gradient-to-br from-[#74C365]/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

      {/* Green accent bar for captain-owned clubs */}
      {team.isCaptain && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
      )}
      
      {/* ── Left Column: Thumbnail Image ── */}
      <div className="w-full md:w-72 lg:w-80 h-56 md:h-auto min-h-[220px] rounded-2xl overflow-hidden relative shrink-0 shadow-sm border border-gray-100 dark:border-white/5">
        <img 
          src={team.image} 
          alt={team.name} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        {/* Sport Tag on top left of image */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${getSportBadgeColors(team.sportId)} bg-white/90 dark:bg-slate-900/90`}>
            <span>{team.sportEmoji}</span>
            <span>{team.sportName}</span>
          </span>
        </div>

        {/* Role badge on top right of image */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black shadow-lg ${
            team.isCaptain
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
              : team.isMember
                ? 'bg-white/90 dark:bg-slate-900/90 text-[#589470] dark:text-[#74C365] border border-[#589470]/30 dark:border-[#74C365]/30'
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/20'
          }`}>
            {team.isCaptain ? <Crown className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
            {team.isCaptain ? 'Chủ CLB' : team.isMember ? 'Thành viên' : `${team.members} thành viên`}
          </span>
        </div>

        {/* Rating on bottom left of image */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/60 text-white backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>{team.rating.toFixed(1)}</span>
            <span className="text-white/60">({team.ratingCount} đánh giá)</span>
          </span>
        </div>
      </div>

      {/* ── Right Column: Team Details & Actions ── */}
      <div className="flex-1 flex flex-col justify-between relative z-10">
        
        {/* Captain Header */}
        <div>
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] p-0.5 shadow-sm shrink-0">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-bold text-sm text-[#589470] dark:text-[#74C365]">
                  {team.captain.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-1.5 max-w-full">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight break-words">
                    {team.captain.replace(/\s*\(\s*Me\s*\)/i, '')}
                  </h4>
                  {team.isVip && (
                    <CheckCircle2 className="w-4 h-4 text-[#589470] dark:text-[#74C365] shrink-0" title="CLB đã xác thực" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Trưởng CLB</span>
                  <span>•</span>
                  <span>{team.createdAt}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 ml-1">
              <span className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${
                isFull ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}>
                {isFull ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Đã đầy</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="sm:hidden">Còn {available} slot</span>
                    <span className="hidden sm:inline">Còn {available} chỗ trống</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Team Name (Title) */}
          <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-[#589470] dark:group-hover:text-[#74C365] mb-1.5 sm:mb-2 transition-colors leading-snug break-words">
            {team.name}
          </h3>

          {/* Description */}
          <div className="mb-4 sm:mb-5">
            <p className={`text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2 sm:line-clamp-none'}`}>
              {team.description}
            </p>
            {team.description && team.description.length > 60 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:hidden text-[11px] font-bold text-[#589470] dark:text-[#74C365] mt-1 inline-flex items-center hover:underline focus:outline-none"
              >
                {isExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
              </button>
            )}
          </div>

          {/* Info Grid */}
          <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5 text-xs sm:text-sm text-slate-800 dark:text-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 sm:gap-y-2.5 gap-x-4">
              <div className="flex items-start sm:items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
                <span className="font-bold text-slate-800 dark:text-slate-100 break-words flex-1">{team.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Thành viên: <strong className="text-[#589470] dark:text-[#74C365] font-black">{team.members} / {team.totalSlots}</strong></span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {team.tags && team.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
              {team.tags.map((tag, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons – context-aware based on tab */}
        <div className="flex items-center gap-2 sm:gap-3 mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
          {activeTab === 'captain' ? (
            /* Captain actions */
            <>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-[#589470]/10 dark:bg-[#74C365]/15 text-[#589470] dark:text-[#74C365] border border-[#589470]/20 hover:bg-[#589470]/20 transition-all"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Quản lý thành viên</span>
              </button>
              <button
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-all"
                title="Chỉnh sửa CLB"
              >
                <Settings className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-200" />
                <span className="hidden sm:inline">Chỉnh sửa CLB</span>
                <span className="sm:hidden">Sửa</span>
              </button>
            </>
          ) : activeTab === 'member' ? (
            /* Member actions – only view members, no rating */
            <>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-[#589470]/10 dark:bg-[#74C365]/15 text-[#589470] dark:text-[#74C365] border border-[#589470]/20 hover:bg-[#589470]/20 transition-all"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Xem thành viên</span>
              </button>
              <button
                className="p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-all flex items-center justify-center shrink-0"
                title="Nhắn tin với Trưởng CLB"
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </button>
            </>
          ) : (
            /* Discover actions – rate + join */
            <>
              <button
                onClick={() => onReview && onReview(team)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all shrink-0"
              >
                <Star className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Đánh giá CLB</span>
                <span className="sm:hidden">Đánh giá</span>
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm bg-[#589470] hover:bg-[#4a7c5d] dark:bg-[#74C365] dark:hover:bg-[#63a855] text-white dark:text-[#001F3F] shadow-md transition-all"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Xin gia nhập CLB</span>
                <span className="sm:hidden">Tham gia</span>
              </button>
              <button
                className="p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-all flex items-center justify-center shrink-0"
                title="Nhắn tin với Trưởng CLB"
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
