import React, { useState } from 'react';
import { X, Gamepad2, Trophy, MapPin, Calendar, Clock, Users, DollarSign, AlignLeft, Sparkles, AlertCircle } from 'lucide-react';

const SPORTS_LIST = [
  { id: 1, name: 'Cầu lông', emoji: '🏸' },
  { id: 2, name: 'Bóng đá', emoji: '⚽' },
  { id: 3, name: 'Pickleball', emoji: '🏓' },
  { id: 4, name: 'Tennis', emoji: '🎾' },
  { id: 5, name: 'Bóng rổ', emoji: '🏀' },
  { id: 6, name: 'Bóng bàn', emoji: '🏓' },
];

const LEVELS = [
  { value: 'Beginner', label: 'Mới tập / Vui là chính' },
  { value: 'Intermediate', label: 'Trung bình / Đều tay' },
  { value: 'Advanced', label: 'Khá / Giỏi (Đánh bao sân)' },
  { value: 'Expert', label: 'Chuyên nghiệp (Thi đấu giải)' },
];

function CreateRoomModal({ isOpen, onClose, onSubmit, isLoading = false }) {
  const [formData, setFormData] = useState({
    title: '',
    sportName: 'Cầu lông',
    sport_id: 1,
    required_level: 'Intermediate',
    location: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '19:00',
    end_time: '21:00',
    max_players: 6,
    price_info: '~50.000đ / người (Chia đều)',
    description: '',
  });

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSportChange = (sport) => {
    setFormData((prev) => ({
      ...prev,
      sportName: sport.name,
      sport_id: sport.id,
      max_players: sport.name === 'Bóng đá' ? 14 : sport.name === 'Cầu lông' ? 6 : 4,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Vui lòng nhập tên phòng / tiêu đề kèo đấu');
      return;
    }
    if (!formData.location.trim()) {
      setError('Vui lòng nhập tên sân hoặc địa điểm thi đấu');
      return;
    }

    // Prepare ISO datetimes for start and end
    try {
      const startIso = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
      const endIso = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();
      
      onSubmit({
        ...formData,
        start_time: startIso,
        end_time: endIso,
        max_players: Number(formData.max_players),
      });
    } catch (err) {
      onSubmit({
        ...formData,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        max_players: Number(formData.max_players),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#74C365] to-[#589470] p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Mở Phòng Chờ Thi Đấu</h3>
              <p className="text-xs opacity-90">Tạo sảnh chờ tìm bạn chơi phù hợp theo trình độ và thời gian</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-slate-900 dark:text-white">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sport Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Chọn môn thể thao <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SPORTS_LIST.map((sport) => {
                const isSelected = formData.sportName === sport.name;
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSportChange(sport)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-[#589470]/15 dark:bg-[#74C365]/20 border-[#589470] dark:border-[#74C365] text-[#589470] dark:text-[#74C365] font-bold scale-105 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <span className="text-xl">{sport.emoji}</span>
                    <span className="text-[11px] truncate w-full">{sport.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tên phòng / Tiêu đề kèo đấu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="VD: Kèo Cầu lông giao lưu tối thứ 4 trình Trung bình, có bao cầu..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#589470] dark:focus:border-[#DBE64C] focus:outline-none text-sm font-medium text-slate-900 dark:text-white transition-all"
              required
            />
          </div>

          {/* Required Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Trình độ yêu cầu
            </label>
            <select
              name="required_level"
              value={formData.required_level}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#589470] dark:focus:border-[#DBE64C] focus:outline-none text-sm font-medium text-slate-900 dark:text-white transition-all"
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Địa điểm / Sân thi đấu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="VD: Sân cầu lông Viettel, Số 1 Đào Duy Anh, Phú Nhuận..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#589470] dark:focus:border-[#DBE64C] focus:outline-none text-sm font-medium text-slate-900 dark:text-white transition-all"
              required
            />
          </div>

          {/* Date and Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col justify-end">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#589470] dark:text-[#DBE64C]" /> Ngày thi đấu
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#589470] dark:text-[#DBE64C]" /> Giờ bắt đầu
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#589470] dark:text-[#DBE64C]" /> Giờ kết thúc
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Max Players & Price Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col justify-end">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 min-h-[36px]">
                <Users className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Tổng số người chơi tối đa <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400 lowercase">(tính luôn cả chủ bài đăng)</span></span>
              </label>
              <input
                type="number"
                name="max_players"
                min="2"
                max="30"
                value={formData.max_players}
                onChange={handleChange}
                placeholder="VD: 6 (gồm bạn và 5 ô trống)"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 min-h-[36px]">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Chi phí dự kiến
              </label>
              <input
                type="text"
                name="price_info"
                value={formData.price_info}
                onChange={handleChange}
                placeholder="VD: ~50k/người, Chia đều theo giờ..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-purple-500" /> Mô tả chi tiết & Ghi chú
            </label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ghi chú thêm về quy định sân, chuẩn bị dụng cụ (cầu, vợt, nước uống), sđt liên hệ..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#589470] dark:focus:border-[#DBE64C] focus:outline-none text-sm font-normal text-slate-900 dark:text-white transition-all custom-scrollbar"
            />
          </div>

          {/* Submit Footer */}
          <div className="p-6 pt-3 bg-gray-50 dark:bg-[#001F3F]/50 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-lg shadow-[#589470]/30 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Đang tạo phòng...' : 'Tạo Phòng Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRoomModal;
