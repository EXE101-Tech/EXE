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
  { value: 'Beginner', label: 'Beginner (Mới tập / Vui là chính)' },
  { value: 'Intermediate', label: 'Intermediate (Trung bình / Đều tay)' },
  { value: 'Advanced', label: 'Advanced (Khá giỏi / Đánh bao sân)' },
  { value: 'Expert', label: 'Expert (Chuyên nghiệp / Thi đấu giải)' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#589470]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#589470] dark:bg-[#DBE64C] text-white dark:text-[#001F3F] flex items-center justify-center shadow-lg">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mở Phòng Chờ Thi Đấu</h2>
              <p className="text-xs text-slate-400">Tạo sảnh chờ tìm bạn chơi phù hợp theo trình độ và thời gian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors relative z-10"
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
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-[#589470] dark:bg-[#DBE64C] text-white dark:text-[#001F3F] border-[#589470] dark:border-[#DBE64C] shadow-md font-bold scale-105'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-medium'
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
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
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
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-[#589470] hover:bg-[#4a7c5d] dark:bg-[#DBE64C] dark:hover:bg-[#c8d438] text-white dark:text-[#001F3F] font-black text-xs shadow-lg shadow-[#589470]/20 dark:shadow-[#DBE64C]/20 active:scale-95 transition-all flex items-center gap-2"
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
