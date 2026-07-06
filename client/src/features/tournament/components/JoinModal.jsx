import React from 'react';
import { X, CheckCircle, AlertCircle, MapPin, Calendar, Users, DollarSign, Award, ShieldAlert } from 'lucide-react';

export default function JoinModal({ isOpen, onClose, post, onConfirm }) {
  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-[#74C365] to-[#589470] p-6 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
              {post.sportEmoji}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Xác nhận tham gia kèo đấu
              </span>
              <h3 className="text-xl font-black mt-1 break-words leading-snug">{post.title}</h3>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Author info */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
              {post.authorName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-400">Người đăng / Trưởng nhóm:</p>
              <h4 className="font-black text-slate-900 dark:text-white text-base truncate">{post.authorName} ({post.teamName || 'Cá nhân'})</h4>
            </div>
          </div>

          {/* Details Summary */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi tiết lịch chơi</h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50/80 dark:bg-white/5 rounded-xl">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-slate-800 dark:text-slate-100 font-bold break-words flex-1">{post.location}</span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50/80 dark:bg-white/5 rounded-xl">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-slate-800 dark:text-slate-100 font-bold break-words flex-1">{post.timeSlot}</span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/80 dark:bg-white/5 rounded-xl">
                <Users className="w-4 h-4 text-[#589470] dark:text-[#74C365] shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 font-bold">Còn trống: <strong className="text-[#589470] dark:text-[#74C365] font-black">{post.totalMembers - post.currentMembers} slot</strong></span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/80 dark:bg-white/5 rounded-xl">
                <span className="text-slate-700 dark:text-slate-200 font-bold">Chi phí: <strong className="text-[#589470] dark:text-[#74C365] font-black">{post.price}</strong></span>
              </div>
            </div>
          </div>

          {/* Warning / Notice Box */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-2xl text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Lưu ý trước khi tham gia:</p>
              <p className="opacity-90 leading-relaxed">
                Vui lòng đến đúng giờ, mang theo trang bị phù hợp và tuân thủ nội quy của nhóm chơi. Bấm xác nhận sẽ gửi thông báo đến chủ bài đăng để ghép kèo cho bạn!
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-2 bg-gray-50 dark:bg-[#001F3F]/50 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Hủy bỏ
          </button>
          
          <button
            onClick={() => {
              onConfirm(post);
              onClose();
            }}
            className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-lg shadow-[#589470]/30 flex items-center gap-2 transition-transform active:scale-95"
          >
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Xác nhận tham gia kèo</span>
          </button>
        </div>

      </div>
    </div>
  );
}
