import React, { useState } from 'react';
import { X, PlusCircle, MapPin, Calendar, Users, DollarSign, Award, Sparkles, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import badmintonImg from '../../../assets/sports/badminton.avif';
import footballImg from '../../../assets/sports/foodball.avif';
import pickleballImg from '../../../assets/sports/pickleball.jpg';
import tennisImg from '../../../assets/sports/tennis.jpg';
import basketballImg from '../../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../../assets/sports/volleyball.jpg';

const SPORTS_LIST = [
  { id: 'badminton', name: 'Cầu lông', emoji: '🏸', defaultImg: badmintonImg },
  { id: 'football', name: 'Bóng đá', emoji: '⚽', defaultImg: footballImg },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓', defaultImg: pickleballImg },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', defaultImg: tennisImg },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀', defaultImg: basketballImg },
  { id: 'volleyball', name: 'Bóng chuyền', emoji: '🏐', defaultImg: volleyballImg },
];

export default function CreatePostModal({ isOpen, onClose, onCreate }) {
  const [sportId, setSportId] = useState('badminton');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [timeSlot, setTimeSlot] = useState('19:00 - 21:00');
  const [date, setDate] = useState('Hôm nay');
  const [totalMembers, setTotalMembers] = useState(4);
  const [currentMembers, setCurrentMembers] = useState(2);
  const [price, setPrice] = useState('50.000đ / người');
  const [skillLevel, setSkillLevel] = useState('Trung bình');
  const [attachedImage, setAttachedImage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    const selectedSportObj = SPORTS_LIST.find(s => s.id === sportId) || SPORTS_LIST[0];

    const newPost = {
      id: Date.now(),
      sportId: selectedSportObj.id,
      sportName: selectedSportObj.name,
      sportEmoji: selectedSportObj.emoji,
      image: attachedImage || selectedSportObj.defaultImg,
      authorName: 'Bạn',
      teamName: 'Nhóm cá nhân',
      timeAgo: 'Vừa xong',
      title: title.trim(),
      description: description.trim() || 'Cần tìm đồng đội giao lưu vui vẻ, nhiệt tình!',
      location: location.trim(),
      timeSlot,
      date,
      currentMembers: Number(currentMembers),
      totalMembers: Number(totalMembers),
      price,
      skillLevel,
      isVerified: true,
      hasJoined: false,
    };

    onCreate(newPost);
    onClose();
    // Reset form
    setTitle('');
    setDescription('');
    setLocation('');
    setAttachedImage('');
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#74C365] to-[#589470] p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <PlusCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Đăng bài tìm thành viên (LFG)</h3>
              <p className="text-xs opacity-90">Kêu gọi người chơi cùng ghép kèo, chia tiền sân dễ dàng</p>
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
          
          {/* Sport Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Môn thể thao *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SPORTS_LIST.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSportId(sp.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all ${
                    sportId === sp.id 
                      ? 'bg-[#589470]/15 dark:bg-[#74C365]/20 border-[#589470] dark:border-[#74C365] text-[#589470] dark:text-[#74C365] font-bold scale-105 shadow-sm' 
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">{sp.emoji}</span>
                  <span className="text-xs">{sp.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Tiêu đề bài đăng *
            </label>
            <input 
              type="text" 
              required
              placeholder="VD: Nhóm Viettel tối nay tìm 2 nam/nữ đánh giao lưu vui vẻ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] dark:focus:border-[#74C365] transition-colors font-medium"
            />
          </div>

          {/* Location & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Địa điểm sân *
              </label>
              <input 
                type="text" 
                required
                placeholder="VD: Sân Cầu Lông Viettel, Q.10"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Khung giờ chơi
              </label>
              <input 
                type="text" 
                placeholder="VD: 19:00 - 21:00 (Tối nay)"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
              />
            </div>
          </div>

          {/* Members & Skill Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Số người hiện có
              </label>
              <input 
                type="number" 
                min="1" max="50"
                value={currentMembers}
                onChange={(e) => setCurrentMembers(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#589470] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tổng số người cần (Slot)
              </label>
              <input 
                type="number" 
                min="2" max="50"
                value={totalMembers}
                onChange={(e) => setTotalMembers(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#589470] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Trình độ yêu cầu
              </label>
              <select 
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#589470] transition-colors"
              >
                <option value="Mới chơi / Vui vẻ">Mới chơi / Vui vẻ</option>
                <option value="Trung bình yếu">Trung bình yếu</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Khá">Khá</option>
                <option value="Nâng cao">Nâng cao</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Chi phí
            </label>
            <input 
              type="text" 
              placeholder="VD: ~50.000đ / người (Nữ giảm 50%)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nội dung chi tiết (Mô tả luật chơi, không khí...)
            </label>
            <textarea 
              rows="3"
              placeholder="VD: Nhóm thân thiện, đánh vui vẻ ra mồ hôi, bao nước trà đá, cầu Yonex xịn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors resize-none"
            />
          </div>

          {/* Image Attachment Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Hình ảnh đính kèm (Tùy chọn)</span>
              </label>
              {attachedImage && (
                <button 
                  type="button"
                  onClick={() => setAttachedImage('')}
                  className="text-rose-500 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Xóa ảnh
                </button>
              )}
            </div>

            {!attachedImage ? (
              <div className="space-y-2.5">
                <label className="w-full cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/15 bg-slate-50/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-[#589470] text-slate-600 dark:text-slate-300 transition-all text-xs sm:text-sm font-semibold group">
                  <Upload className="w-4 h-4 text-[#589470] group-hover:scale-110 transition-transform shrink-0" />
                  <span>Bấm để tải ảnh sân bãi / hoạt động từ máy lên</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setAttachedImage(url);
                      }
                    }} 
                    className="hidden" 
                  />
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="Hoặc dán đường dẫn link ảnh (URL) từ internet vào đây..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.target.value.trim()) {
                          setAttachedImage(e.target.value.trim());
                          e.target.value = '';
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setAttachedImage(e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900/5 dark:bg-black/20 p-2.5 animate-in fade-in duration-300">
                <div className="relative max-h-52 w-full rounded-xl overflow-hidden flex items-center justify-center bg-black/10 dark:bg-black/40">
                  <img 
                    src={attachedImage} 
                    alt="Preview" 
                    className="max-h-52 w-auto object-contain rounded-xl"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">✨ Ảnh đã đính kèm sẵn sàng</span>
                  <label className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Đổi ảnh khác
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setAttachedImage(url);
                        }
                      }} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
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
            className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-lg shadow-[#589470]/30 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Đăng bài ngay</span>
          </button>
        </div>
      </form>
    </div>
  </div>
);
}
