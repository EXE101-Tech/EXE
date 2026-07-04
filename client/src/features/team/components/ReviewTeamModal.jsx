import React, { useState } from 'react';
import { X, Star, CheckCircle2, MessageSquare } from 'lucide-react';

const QUICK_TAGS = [
  'Sân đẹp', 'Chủ CLB nhiệt tình', 'Fairplay', 'Đúng trình độ', 'Bao trà đá', 
  'Bầu không khí vui vẻ', 'Đúng giờ', 'Sân sạch sẽ', 'Giá hợp lý', 'Tổ chức tốt',
];

export default function ReviewTeamModal({ teamId, isOpen, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  if (!isOpen) return null;

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      alert('Vui lòng chọn số sao đánh giá!');
      return;
    }
    alert(`🎉 Cảm ơn bạn đã đánh giá ${rating} sao! Đánh giá của bạn giúp cộng đồng chọn CLB phù hợp.`);
    onClose();
    setRating(0);
    setComment('');
    setSelectedTags([]);
  };

  const getRatingLabel = (stars) => {
    switch (stars) {
      case 1: return 'Chưa tốt 😞';
      case 2: return 'Tạm được 😐';
      case 3: return 'Bình thường 🙂';
      case 4: return 'Tốt 😊';
      case 5: return 'Xuất sắc 🤩';
      default: return 'Chọn số sao';
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-400 to-yellow-500 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Star className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Đánh giá Câu Lạc Bộ</h3>
              <p className="text-xs opacity-90">Chia sẻ trải nghiệm của bạn với cộng đồng</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* Star Rating */}
          <div className="text-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Đánh giá tổng quan *
            </label>
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  type="button"
                  key={i}
                  onMouseEnter={() => setHoveredStar(i)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(i)}
                  className="transition-transform hover:scale-125 active:scale-95"
                >
                  <Star className={`w-10 h-10 transition-colors ${
                    i <= (hoveredStar || rating) 
                      ? 'text-amber-400 fill-amber-400 drop-shadow-md' 
                      : 'text-slate-200 dark:text-slate-600'
                  }`} />
                </button>
              ))}
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {getRatingLabel(hoveredStar || rating)}
            </span>
          </div>

          {/* Quick Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Điểm nổi bật (chọn nhanh)
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedTags.includes(tag) 
                      ? 'bg-[#589470]/15 dark:bg-[#74C365]/20 border-[#589470] dark:border-[#74C365] text-[#589470] dark:text-[#74C365]' 
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Nhận xét chi tiết (tùy chọn)
            </label>
            <textarea
              rows={3}
              placeholder="VD: CLB rất tuyệt, sân đẹp, anh em nhiệt tình hướng dẫn người mới..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors resize-none"
            />
          </div>

          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-xs sm:text-sm font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-95 text-white shadow-md hover:shadow-lg flex items-center gap-2 transition-all duration-200 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Gửi đánh giá</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
