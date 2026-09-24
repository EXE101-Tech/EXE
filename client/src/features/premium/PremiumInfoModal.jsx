import { Crown, X } from 'lucide-react';

export default function PremiumInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="premium-info-title" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0b1d31]">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Crown className="h-6 w-6" /></span>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="premium-info-title" className="text-xl font-black">SportGo Premium</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Gói Premium và thanh toán chưa được kết nối. Hiện chưa thể đăng ký hoặc thu phí; nút này chỉ cung cấp thông tin và sẽ không tạo giao dịch.</p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Đã hiểu</button>
      </section>
    </div>
  );
}
