import React from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function OwnerRegistrationModal({ isOpen, onClose, onAgree }) {
  if (!isOpen) return null;
  const rules = [
    [CalendarCheck, 'Check lịch hằng ngày', 'Chủ sân cần kiểm tra các lượt đặt trên hệ thống mỗi ngày.'],
    [ShieldCheck, 'Đồng bộ lịch đặt', 'Mọi lượt đặt bên ngoài phải được cập nhật lên SportGo để tránh xung đột.'],
    [CheckCircle2, 'Đúng dịch vụ đã đăng ký', 'Đảm bảo các tiện ích, khung giờ và quyền lợi đã công bố cho người chơi.'],
    [AlertTriangle, 'Trách nhiệm khi có xung đột', 'Sân chịu trách nhiệm xử lý nếu nhận đặt bên ngoài nhưng không kiểm tra lịch trên hệ thống.'],
  ];
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="owner-water-card relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-cyan-200/50 bg-white shadow-2xl dark:bg-[#071c2d]" onClick={(event) => event.stopPropagation()}>
        <div className="relative flex shrink-0 items-start justify-between bg-gradient-to-br from-[#087f8c] via-[#0aa4b4] to-[#65e6a0] p-5 sm:p-6 text-white">
          <div><div className="mb-2 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Chủ sân</div><h2 className="text-xl font-black sm:text-2xl">Đăng ký làm chủ sân</h2><p className="mt-1 text-sm text-cyan-50">Đưa sân của bạn lên hệ thống để nhận đặt sân minh bạch, đồng bộ và chuyên nghiệp.</p></div>
          <button type="button" onClick={onClose} className="rounded-full bg-black/10 p-2 hover:bg-black/20"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-sm text-slate-700 dark:text-slate-200 sm:p-6">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10"><p className="font-black text-cyan-800 dark:text-cyan-200">Phí duy trì: 150.000đ / sân / tháng</p><p className="mt-1 text-xs text-cyan-700/80 dark:text-cyan-100/80">Áp dụng cho mỗi sân con được kích hoạt trên SportGo.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{rules.map(([Icon, title, description]) => <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-300" /><div><p className="font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div></div>)}</div>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Bằng việc tiếp tục, bạn xác nhận đã đọc và đồng ý với các quy định vận hành dành cho chủ sân SportGo.</p>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:justify-end sm:gap-3 sm:p-5"><button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10">Để sau</button><button type="button" onClick={onAgree} className="rounded-xl bg-gradient-to-r from-[#087f8c] to-[#0aa4b4] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-700/20 transition hover:-translate-y-0.5">Tôi đồng ý & tiếp tục</button></div>
      </div>
    </div>
  );
}
