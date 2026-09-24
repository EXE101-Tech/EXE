import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, DollarSign, Layers, MapPin, Wifi, Car, Droplets, Coffee, Package, Sparkles, Building2 } from 'lucide-react';

const SPORTS = [
  { id: 'badminton', name: 'Cầu lông', emoji: '🏸' },
  { id: 'football', name: 'Bóng đá', emoji: '⚽' },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀' },
  { id: 'volleyball', name: 'Bóng chuyền', emoji: '🏐' },
];

const FACILITY_OPTIONS = [
  { key: 'wifi', label: 'WiFi tốc độ cao', icon: Wifi },
  { key: 'parking', label: 'Bãi đỗ xe ô tô / xe máy', icon: Car },
  { key: 'shower', label: 'Phòng tắm nóng lạnh', icon: Droplets },
  { key: 'canteen', label: 'Căng-tin & Nước giải khát', icon: Coffee },
  { key: 'rental', label: 'Thuê vợt, giày & bóng', icon: Package },
];

export default function HostSetupModal({ isOpen, onClose, onSave, initialVenue = null }) {
  const [sportId, setSportId] = useState('badminton');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('50.000đ');
  const [courtCount, setCourtCount] = useState(4);
  const [facilities, setFacilities] = useState({
    wifi: true,
    parking: true,
    shower: true,
    canteen: true,
    rental: true,
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialVenue) return;
    setSportId(initialVenue.sport || 'badminton');
    setName(initialVenue.name || '');
    setAddress(initialVenue.address || '');
    setDescription(initialVenue.description || '');
    setPrice(initialVenue.price || '50.000đ');
    setCourtCount(initialVenue.courtCount || 1);
    setFacilities(initialVenue.facilities || {});
  }, [isOpen, initialVenue]);

  if (!isOpen) return null;

  const handleToggleFacility = (key) => {
    setFacilities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    const normalizedCourtCount = Math.min(50, Math.max(1, Number(courtCount) || 1));
    const venueData = {
      name: name.trim(),
      address: address.trim(),
      sport_id: sportId,
      price_label: price.trim() || '50.000đ',
      court_count: normalizedCourtCount,
      facilities,
      description: description.trim() || null,
    };

    setIsSaving(true);
    setError('');
    try {
      await onSave(venueData);
      setName('');
      setAddress('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Không lưu được thông tin sân');
    } finally {
      setIsSaving(false);
    }
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
              <h3 className="text-xl font-black">⚙️ {initialVenue ? 'Chỉnh sửa sân' : 'Setup Sân & Khung Giờ'}</h3>
              <p className="text-xs opacity-90">Cấu hình giá bán, số lượng sân con và dịch vụ đi kèm</p>
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
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            
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

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mô tả sân</label>
              <textarea rows={3} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả tiện ích, khung giờ hoặc lưu ý cho người đặt sân" className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#589470] dark:border-white/10 dark:bg-white/5 dark:text-white" />
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
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={courtCount}
                  onChange={(e) => setCourtCount(e.target.value)}
                  className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#589470] transition-colors"
                />
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
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-lg shadow-[#589470]/30 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu…' : initialVenue ? 'Lưu thay đổi' : 'Lưu & kích hoạt sân'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
