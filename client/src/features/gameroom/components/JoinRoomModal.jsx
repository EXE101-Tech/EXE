import React, { useState } from 'react';
import { X, Sparkles, Trophy, MapPin, Calendar, Users, DollarSign, AlertTriangle, ShieldCheck, MessageSquare } from 'lucide-react';
import { formatStoredCost } from '../../../shared/utils/price';

function JoinRoomModal({ isOpen, onClose, onConfirm, room, isLoading = false }) {
  const [note, setNote] = useState('');

  if (!isOpen || !room) return null;

  const {
    title,
    sportName = 'Cầu lông',
    required_level = 'Intermediate',
    start_time,
    end_time,
    max_players = 6,
    location = 'Sân thể thao',
    price_info = 'Chia đều',
    host = { name: 'Trưởng phòng' },
    host_id,
    participants = [],
  } = room;

  const formatDateTime = (startStr, endStr) => {
    try {
      if (!startStr) return 'Tối nay 19:00 - 21:00';
      const start = new Date(startStr);
      const end = endStr ? new Date(endStr) : new Date(start.getTime() + 2 * 3600 * 1000);
      const dateStr = start.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${dateStr} (${startTime} - ${endTime})`;
    } catch (e) {
      return 'Tối nay 19:00 - 21:00';
    }
  };

  const LEVEL_VI = {
    'Beginner': 'Mới chơi',
    'Intermediate': 'Trung bình',
    'Advanced': 'Khá / Giỏi',
    'Expert': 'Chuyên nghiệp',
  };
  const displayLevel = LEVEL_VI[required_level] || required_level;
  const approvedCount = participants.filter((participant) => (
    participant.status === 'APPROVED'
    && participant.role !== 'HOST'
    && Number(participant.user_id) !== Number(host?.id || host_id)
  )).length + 1;

  const timeStr = formatDateTime(start_time, end_time);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(room.id, note);
  };

  return (
    <div className="sg-modal-backdrop fixed inset-0 z-[1050] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="sg-modal-card relative my-8 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sg-modal-header relative flex items-center justify-between p-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="sg-modal-header-icon flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Xác Nhận Tham Gia Phòng</h3>
              <p className="text-xs opacity-90">Gia nhập nhóm và chuẩn bị thi đấu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="sg-modal-close rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="sg-modal-body space-y-5 p-6">
          {/* Room summary card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {sportName}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> {displayLevel}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white break-words leading-snug">{title}</h3>

            <div className="space-y-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500 shrink-0" />
                <span><span className="font-bold text-slate-700 dark:text-slate-300">Chủ phòng:</span> <strong className="text-slate-900 dark:text-white font-black">{host.name}</strong> ({approvedCount}/{max_players} thành viên)</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#589470] dark:text-[#DBE64C] shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">{timeStr}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-semibold break-words flex-1 text-slate-800 dark:text-slate-100">{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Chi phí/người:</span>
                <strong className="text-[#589470] dark:text-[#74C365] font-black">{formatStoredCost(price_info)}</strong>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Lưu ý về trình độ & thái độ:</strong>
              Vui lòng tự đánh giá đúng trình độ <strong className="underline font-black">{displayLevel}</strong> để đảm bảo trải nghiệm thi đấu vui vẻ, cân kèo cho toàn bộ các thành viên trong phòng.
            </div>
          </div>

          {/* Optional Message to Host */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#589470] dark:text-[#DBE64C]" /> Lời nhắn đến Trưởng phòng (Không bắt buộc)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Mình có đem theo vợt và cầu phụ, mình đến đúng giờ nhé!"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#589470] dark:focus:border-[#DBE64C] focus:outline-none text-xs font-medium text-slate-900 dark:text-white transition-all"
            />
          </div>

          {/* Modal Footer */}
          <div className="sg-modal-footer flex items-center justify-end gap-3 border-t pt-3">
            <button
              type="button"
              onClick={onClose}
              className="sg-modal-secondary rounded-xl px-5 py-2.5 text-xs font-bold transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="sg-modal-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black shadow-lg active:scale-95 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'Đang gửi yêu cầu...' : 'Xác Nhận Tham Gia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinRoomModal;
