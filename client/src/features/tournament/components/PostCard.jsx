import React from 'react';
import { MessageSquare, UserPlus, MapPin, Calendar, Users, DollarSign, CheckCircle2, Clock, Award } from 'lucide-react';

export default function PostCard({ post, onJoin, onChat }) {
  const isFull = post.currentMembers >= post.totalMembers;
  const needed = post.totalMembers - post.currentMembers;

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
      case 'volleyball':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="group relative bg-white dark:bg-[#001F3F]/80 border border-gray-100 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_45px_rgba(88,148,112,0.12)] dark:hover:shadow-[0_15px_45px_rgba(116,195,101,0.15)] transition-all duration-300 hover:-translate-y-1 flex flex-col md:flex-row gap-6 overflow-hidden">
      
      {/* Decorative subtle background aura like landing page */}
      <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-gradient-to-br from-[#74C365]/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
      
      {/* ── Left Column: Thumbnail Image ── */}
      <div className="w-full md:w-72 lg:w-80 h-56 md:h-auto min-h-[220px] rounded-2xl overflow-hidden relative shrink-0 shadow-sm border border-gray-100 dark:border-white/5">
        <img 
          src={post.image} 
          alt={post.title} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        {/* Sport Tag on top left of image */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${getSportBadgeColors(post.sportId)} bg-white/90 dark:bg-slate-900/90`}>
            <span>{post.sportEmoji}</span>
            <span>{post.sportName}</span>
          </span>
        </div>

        {/* Skill Level Tag on bottom left of image */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/60 text-white backdrop-blur-sm">
            <Award className="w-3.5 h-3.5 text-[#74C365]" />
            <span>Trình độ: {post.skillLevel}</span>
          </span>
        </div>
      </div>

      {/* ── Right Column: Post Details & Actions ── */}
      <div className="flex-1 flex flex-col justify-between relative z-10">
        
        {/* Author Header */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] p-0.5 shadow-sm">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-bold text-sm text-[#589470] dark:text-[#74C365]">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                    {post.authorName}
                  </h4>
                  {post.isVerified && (
                    <CheckCircle2 className="w-4 h-4 text-[#589470] dark:text-[#74C365] shrink-0" title="Nhóm đã xác thực" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.timeAgo}
                  </span>
                  <span>•</span>
                  <span>{post.teamName || 'Thành viên cá nhân'}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isFull ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                  Đã đủ người
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#589470]/15 dark:bg-[#74C365]/20 text-[#589470] dark:text-[#74C365] border border-[#589470]/30 animate-pulse">
                  Đang tìm {needed} thành viên
                </span>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-[#589470] dark:group-hover:text-[#74C365] transition-colors">
            {post.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5 line-clamp-2 sm:line-clamp-3">
            {post.description}
          </p>
        </div>

        {/* Info Grid (4 pills in landing page style) */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate" title={post.location}>
              {post.location}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate" title={post.timeSlot}>
              {post.timeSlot} ({post.date})
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-xs sm:text-sm">
            <Users className="w-4 h-4 text-[#589470] dark:text-[#74C365] shrink-0" />
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
              Thành viên: <strong className="text-[#589470] dark:text-[#74C365] font-bold">{post.currentMembers}/{post.totalMembers}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-xs sm:text-sm">
            <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
              Chi phí: <strong>{post.price}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
          <button
            onClick={() => onChat(post)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-[#589470] dark:text-[#74C365]" />
            <span>Nhắn tin</span>
          </button>

          <button
            onClick={() => onJoin(post)}
            disabled={isFull || post.hasJoined}
            className={`px-5 sm:px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
              post.hasJoined
                ? 'bg-blue-600 text-white cursor-default opacity-90 shadow-blue-500/20'
                : isFull
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-[#589470]/25 hover:shadow-lg hover:shadow-[#589470]/30 active:scale-95'
            }`}
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>{post.hasJoined ? 'Đã yêu cầu tham gia' : isFull ? 'Đã đủ người' : 'Tham gia ngay (Join)'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
