import { AlertTriangle, ShieldOff, Trash2, X } from 'lucide-react';

export default function OwnerCancellationModal({ isOpen, ownedVenueCount, onClose, onConfirm, isSubmitting = false, error = '' }) {
  if (!isOpen) return null;

  const canCancel = ownedVenueCount === 0;

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-red-200/60 bg-white shadow-2xl dark:border-red-400/20 dark:bg-[#071c2d]" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between bg-gradient-to-br from-[#b42318] via-[#e14b3f] to-[#f59e0b] p-5 text-white sm:p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold"><ShieldOff className="h-3.5 w-3.5" /> Chủ sân</div>
            <h2 className="text-xl font-black sm:text-2xl">Hủy đăng ký chủ sân?</h2>
            <p className="mt-1 text-sm text-red-50">Thao tác này sẽ đưa tài khoản của bạn về trạng thái người dùng thường.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-black/10 p-2 transition hover:bg-black/20"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5 text-sm text-slate-700 dark:text-slate-200 sm:p-6">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          {canCancel ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <p className="font-black text-emerald-800 dark:text-emerald-200">Bạn có thể hủy đăng ký</p>
              <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-100">Tài khoản hiện không còn sân nào đang quản lý trên hệ thống.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
              <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-black text-amber-800 dark:text-amber-200">Chưa thể hủy đăng ký</p><p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-100">Bạn vẫn còn <strong>{ownedVenueCount} sân</strong> đang quản lý. Vui lòng xóa tất cả sân trước khi hủy đăng ký.</p></div></div>
            </div>
          )}
          <div className="flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-white/10"><Trash2 className="h-5 w-5 shrink-0 text-red-500" /><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Sau khi hủy, bạn sẽ không thể thêm hoặc quản lý sân cho đến khi đăng ký lại.</p></div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:justify-end sm:gap-3 sm:p-5">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10">{canCancel ? 'Giữ đăng ký' : 'Đã hiểu'}</button>
          {canCancel && <button type="button" disabled={isSubmitting} onClick={onConfirm} className="rounded-xl bg-gradient-to-r from-[#b42318] to-[#e14b3f] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-red-700/20 transition hover:-translate-y-0.5 disabled:opacity-50">{isSubmitting ? 'Đang hủy…' : 'Xác nhận hủy đăng ký'}</button>}
        </div>
      </div>
    </div>
  );
}
