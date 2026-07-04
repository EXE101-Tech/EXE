import { ArrowRight, Sparkles, CalendarCheck } from 'lucide-react';

function BookingBar({ selectedCount, totalPrice, onBook }) {
  const hours = (selectedCount * 0.5).toFixed(1);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#001F3F]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 sm:px-8 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.2)] z-50 transition-all duration-300">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Total Price & Duration */}
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tổng thanh toán dự kiến
            </div>
            <div className="text-xl sm:text-3xl font-black bg-gradient-to-r from-[#74C365] to-[#589470] bg-clip-text text-transparent">
              {selectedCount > 0 ? `${totalPrice.toLocaleString()}đ` : '0đ'}
            </div>
          </div>

          <div className="hidden sm:block pl-6 border-l border-slate-200 dark:border-white/10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Thời gian thuê đã chọn
            </div>
            <div className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5 mt-0.5">
              <CalendarCheck className="w-4 h-4 text-[#589470]" />
              <span>{selectedCount > 0 ? `${selectedCount} ô (${hours} giờ)` : 'Chưa chọn ô nào'}</span>
            </div>
          </div>
        </div>

        {/* Book Now Button */}
        <button
          type="button"
          onClick={onBook}
          disabled={selectedCount === 0}
          className={`px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
            selectedCount > 0
              ? 'bg-gradient-to-r from-[#74C365] to-[#589470] text-white hover:opacity-95 shadow-[#589470]/30 cursor-pointer scale-100'
              : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-white/5 shadow-none'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Xác Nhận Đặt Sân Ngay</span>
          {selectedCount > 0 && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default BookingBar;
