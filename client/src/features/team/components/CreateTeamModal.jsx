import React, { useState } from 'react';
import { X, PlusCircle, MapPin, Users, Crown, CheckCircle2, Sparkles, Image as ImageIcon, DollarSign, Shield } from 'lucide-react';

const SPORTS_LIST = [
  { id: 'badminton', name: 'Cầu lông', emoji: '🏸' },
  { id: 'football', name: 'Bóng đá', emoji: '⚽' },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀' },
  { id: 'volleyball', name: 'Bóng chuyền', emoji: '🏐' },
];

const VIP_PLANS = [
  { id: 'monthly', label: 'Gói Tháng', price: '199.000đ / tháng', desc: 'Trải nghiệm ngay, hủy bất cứ lúc nào', popular: false },
  { id: 'quarterly', label: 'Gói Quý', price: '499.000đ / 3 tháng', desc: 'Tiết kiệm 17% so với gói tháng', popular: true },
];

export default function CreateTeamModal({ isOpen, onClose }) {
  const [sportId, setSportId] = useState('badminton');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [totalSlots, setTotalSlots] = useState(20);
  const [selectedPlan, setSelectedPlan] = useState('quarterly');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;
    // Simulate success
    alert('🎉 Đăng ký thành lập CLB VIP thành công! CLB của bạn đã xuất hiện trên trang Câu Lạc Bộ.');
    onClose();
    setName('');
    setDescription('');
    setLocation('');
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
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Đăng ký CLB VIP</h3>
              <p className="text-xs opacity-90">Thành lập câu lạc bộ, nâng tầm uy tín & ưu tiên hiển thị</p>
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

          {/* VIP Benefits Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
            <h4 className="text-sm font-black text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Quyền lợi CLB VIP
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ghim Top bài đăng</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Huy hiệu tích xanh VIP</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Hệ thống đánh giá 5⭐</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Thu hút cộng đồng</div>
            </div>
          </div>

          {/* Sport Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Môn thể thao chính *
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

          {/* Team Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Tên Câu Lạc Bộ *
            </label>
            <input 
              type="text" 
              required
              placeholder="VD: CLB Cầu Lông Proton, FC Elite Saigon..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] dark:focus:border-[#74C365] transition-colors font-medium"
            />
          </div>

          {/* Location & Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Khu vực hoạt động *
              </label>
              <input 
                type="text" 
                required
                placeholder="VD: Quận 10, TP.HCM"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" /> Số thành viên tối đa
              </label>
              <input 
                type="number" 
                min="5" max="100"
                value={totalSlots}
                onChange={(e) => setTotalSlots(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#589470] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Mô tả & Nội quy CLB
            </label>
            <textarea 
              rows={3}
              placeholder="Giới thiệu CLB, lịch tập luyện, nội quy thành viên, yêu cầu trình độ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#589470] transition-colors resize-none"
            />
          </div>

          {/* Pricing Plans */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Chọn gói VIP *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIP_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedPlan === plan.id
                      ? 'border-[#589470] dark:border-[#74C365] bg-[#589470]/5 dark:bg-[#74C365]/10 shadow-md'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      PHỔ BIẾN
                    </span>
                  )}
                  <div className="text-sm font-black text-slate-900 dark:text-white">{plan.label}</div>
                  <div className="text-lg font-black text-[#589470] dark:text-[#74C365] mt-1">{plan.price}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.desc}</div>
                </button>
              ))}
            </div>
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
              className="px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg flex items-center gap-2 transition-all duration-200 active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>Xác nhận & Thanh toán</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
