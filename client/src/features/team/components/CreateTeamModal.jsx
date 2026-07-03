import React, { useState, useEffect } from 'react';
import { X, PlusCircle, MapPin, Users, Crown, CheckCircle2, Sparkles, DollarSign, Shield, Star, TrendingUp, Zap } from 'lucide-react';

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

export default function CreateTeamModal({ isOpen, onClose, initialView = 'form' }) {
  const [sportId, setSportId] = useState('badminton');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [totalSlots, setTotalSlots] = useState(20);
  
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialView);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !isPremiumUser) return;
    alert('🎉 Đăng ký thành lập CLB VIP thành công! CLB của bạn đã xuất hiện trên trang Câu Lạc Bộ.');
    onClose();
    setName('');
    setDescription('');
    setLocation('');
  };

  const handlePayment = () => {
    alert('🎉 Thanh toán gói Premium thành công! Bạn hiện đã có thể tạo Team/CLB.');
    setIsPremiumUser(true);
    setCurrentView('form');
  };

  if (currentView === 'info') {
    return (
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 p-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                <Crown className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-black">Gói Premium</h3>
                <p className="text-xs font-medium opacity-90">Mở khóa tính năng tạo Team & Đặc quyền hiển thị</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[65vh]">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center leading-relaxed max-w-lg mx-auto">
              Đăng ký Premium để thành lập Team/CLB chuyên nghiệp, giúp nâng cao thứ hạng bài đăng và thu hút người chơi dễ dàng hơn!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex gap-3 items-start">
                <div className="mt-0.5 bg-amber-500 text-white p-1.5 rounded-lg shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-1 text-sm">Ghim Top bài đăng</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Bài đăng luôn được hiển thị ở vị trí cao, tiếp cận nhiều người chơi nhất.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex gap-3 items-start">
                <div className="mt-0.5 bg-amber-500 text-white p-1.5 rounded-lg shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-1 text-sm">Đánh giá uy tín 5⭐</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Nhận đánh giá sao từ người tham gia, khẳng định chất lượng của Team.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex gap-3 items-start">
                <div className="mt-0.5 bg-amber-500 text-white p-1.5 rounded-lg shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-1 text-sm">Nhân đôi bài đăng</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Đăng tối đa <strong>2 bài / môn / ngày</strong> (thay vì 1 bài / 2 ngày).
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex gap-3 items-start">
                <div className="mt-0.5 bg-amber-500 text-white p-1.5 rounded-lg shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-1 text-sm">Huy hiệu tích xanh</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Gắn huy hiệu VIP khẳng định đẳng cấp và sự chuyên nghiệp của CLB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {VIP_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                    selectedPlan === plan.id
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 shadow-md scale-[1.02]'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 right-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                      PHỔ BIẾN
                    </span>
                  )}
                  <div className="text-sm font-black text-slate-900 dark:text-white uppercase">{plan.label}</div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-500 mt-1">{plan.price}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{plan.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
             {initialView === 'form' && (
               <button onClick={() => setCurrentView('form')} className="px-5 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-xs sm:text-sm font-bold transition-colors">
                 Quay lại
               </button>
             )}
             <button onClick={handlePayment} type="button" className="px-8 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg flex items-center gap-2 transition-all active:scale-95">
               <Crown className="w-5 h-5" /> Xác nhận & Thanh toán
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#74C365] to-[#589470] p-6 text-white flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Tạo Team / CLB</h3>
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden relative">
          
          {/* Blur Overlay for non-premium */}
          {!isPremiumUser && (
            <div className="absolute inset-0 z-20 bg-white/40 dark:bg-[#001F3F]/60 backdrop-blur-[4px] flex flex-col items-center justify-center p-6 text-center">
              <Crown className="w-16 h-16 text-yellow-500 mb-4 drop-shadow-md" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Đăng ký gói Premium</h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-6 max-w-md drop-shadow-sm">
                Để nhận đặc quyền tạo Team/CLB và hưởng các ưu đãi vượt trội, hãy nâng cấp tài khoản của bạn ngay hôm nay!
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('info')}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-black py-3 px-8 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95 flex items-center gap-2 hover:scale-105"
              >
                <Sparkles className="w-5 h-5" /> Mua ngay
              </button>
            </div>
          )}

          <div className="p-6 space-y-5 overflow-y-auto flex-1">
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
          </div>

          <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-end gap-3 shrink-0 relative z-30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-xs sm:text-sm font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isPremiumUser}
              className={`px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md flex items-center gap-2 transition-all duration-200 active:scale-95 ${!isPremiumUser ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
