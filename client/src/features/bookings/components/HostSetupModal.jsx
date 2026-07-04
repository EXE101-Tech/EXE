import React, { useState } from 'react';
import { X, ShieldCheck, DollarSign, Layers, MapPin, Wifi, Car, Droplets, Coffee, Package, Sparkles, Building2 } from 'lucide-react';
import badmintonImg from '../../../assets/sports/badminton.avif';
import footballImg from '../../../assets/sports/foodball.avif';
import pickleballImg from '../../../assets/sports/pickleball.jpg';
import tennisImg from '../../../assets/sports/tennis.jpg';
import basketballImg from '../../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../../assets/sports/volleyball.jpg';

const SPORTS = [
  { id: 'badminton', name: 'Cầu lông', emoji: '🏸', defaultImg: badmintonImg },
  { id: 'football', name: 'Bóng đá', emoji: '⚽', defaultImg: footballImg },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓', defaultImg: pickleballImg },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', defaultImg: tennisImg },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀', defaultImg: basketballImg },
  { id: 'volleyball', name: 'Bóng chuyền', emoji: '🏐', defaultImg: volleyballImg },
];

const FACILITY_OPTIONS = [
  { key: 'wifi', label: 'WiFi tốc độ cao', icon: Wifi },
  { key: 'parking', label: 'Bãi đỗ xe ô tô / xe máy', icon: Car },
  { key: 'shower', label: 'Phòng tắm nóng lạnh', icon: Droplets },
  { key: 'canteen', label: 'Căng-tin & Nước giải khát', icon: Coffee },
  { key: 'rental', label: 'Thuê vợt, giày & bóng', icon: Package },
];

export default function HostSetupModal({ isOpen, onClose, onSave }) {
  const [sportId, setSportId] = useState('badminton');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('50.000đ');
  const [courtCount, setCourtCount] = useState(4);
  const [facilities, setFacilities] = useState({
    wifi: true,
    parking: true,
    shower: true,
    canteen: true,
    rental: true,
  });

  if (!isOpen) return null;

  const handleToggleFacility = (key) => {
    setFacilities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    const selectedSportObj = SPORTS.find(s => s.id === sportId) || SPORTS[0];

    const newVenue = {
      id: Date.now(),
      name: name.trim(),
      sport: selectedSportObj.id,
      sportName: selectedSportObj.name,
      sportEmoji: selectedSportObj.emoji,
      address: address.trim(),
      distance: '0.8 km',
      rating: 5.0,
      reviewCount: 1,
      price: price.trim() || '50.000đ',
      courtCount: Number(courtCount) || 4,
      image: selectedSportObj.defaultImg,
      hostName: 'Bạn (Chủ sân / Host)',
      facilities,
      description: `Khu sân ${selectedSportObj.name} tiêu chuẩn thi đấu, trang thiết bị hiện đại do ${name.trim()} quản lý.`,
    };

    onSave(newVenue);
    onClose();
    // Reset form
    setName('');
    setAddress('');
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#74C365] to-[#589470] p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Building2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">⚙️ Setup Sân & Khung Giờ (Dành Cho Chủ Sân)</h3>
              <p className="text-xs opacity-90">Cấu hình giá bán 30 phút, số lượng sân con và dịch vụ đi kèm</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Môn thể thao */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                1. Chọn Môn Thể Thao *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SPORTS.map((sp) => (
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

            {/* Tên sân & Địa chỉ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  2. Tên khu sân / Câu lạc bộ *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="VD: Sân Cầu Lông Proton VIP..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  3. Địa chỉ sân *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="VD: 123 Thành Thái, Phường 14, Q.10..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
                />
              </div>
            </div>

            {/* Setup Giá & Số lượng sân con */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 border border-slate-200 dark:border-white/10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#589470] dark:text-[#74C365] mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>4. Giá mỗi khung giờ (30 phút) *</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="VD: 50.000đ hoặc 80.000đ"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl px-3.5 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-[#589470] transition-colors"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  💡 Người chơi có thể đặt nhiều ô 30p liên tiếp (Ví dụ 2 tiếng = 4 ô).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#589470] dark:text-[#74C365] mb-1.5 flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  <span>5. Số lượng sân con sở hữu *</span>
                </label>
                <select
                  value={courtCount}
                  onChange={(e) => setCourtCount(Number(e.target.value))}
                  className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#589470] transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map((num) => (
                    <option key={num} value={num} className="bg-white dark:bg-[#001F3F] text-slate-900 dark:text-white">
                      Sở hữu {num} sân (Sân 1 đến Sân {num})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  💡 Hệ thống sẽ tự động tạo {courtCount} hàng sân trong bảng đặt lịch.
                </p>
              </div>
            </div>

            {/* Setup Tiện ích */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                6. Dịch Vụ & Tiện Ích Sẵn Có
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FACILITY_OPTIONS.map(({ key, label, icon: IconComp }) => {
                  const isChecked = facilities[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleFacility(key)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                        isChecked
                          ? 'bg-[#589470]/10 dark:bg-[#74C365]/15 border-[#589470] dark:border-[#74C365] text-slate-900 dark:text-white font-bold'
                          : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isChecked ? 'bg-[#589470] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs flex-1">{label}</span>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isChecked ? 'bg-[#589470] border-[#589470] text-white' : 'border-slate-300 dark:border-white/20'}`}>
                        {isChecked && <Sparkles className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer Buttons */}
          <div className="p-6 pt-3 bg-gray-50 dark:bg-[#001F3F]/50 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-lg shadow-[#589470]/30 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>💾 Lưu & Kích hoạt sân ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
