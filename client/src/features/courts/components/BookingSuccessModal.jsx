import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MessageSquare, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../../shared/context/ChatContext';

export default function BookingSuccessModal({ isOpen, onClose, bookingData }) {
  const navigate = useNavigate();
  const { openChat } = useChat();
  if (!isOpen || !bookingData) return null;

  const dateText = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${bookingData.date}T12:00:00+07:00`));
  const openOwnerChat = () => {
    onClose();
    openChat({ id: bookingData.ownerId, name: bookingData.hostName || bookingData.venueName });
  };
  const showBookings = () => {
    onClose();
    navigate('/my-bookings');
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="booking-success-title" className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-2xl dark:border-white/15 dark:bg-[#001F3F] sm:p-8">
        <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#74C365] to-[#589470] shadow-xl">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> Đặt sân thành công
        </div>
        <h2 id="booking-success-title" className="mb-1 text-2xl font-black text-slate-900 dark:text-white">Lịch đã được ghi nhận</h2>
        <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">Các khung giờ đã được lưu vào hệ thống; mã đặt sân nằm trong mục Đặt sân của bạn.</p>

        <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <span className="text-xs text-slate-500">Sân</span>
            <span className="max-w-[70%] text-right text-sm font-black text-slate-900 dark:text-white">{bookingData.venueName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><CalendarDays className="h-4 w-4 text-emerald-600" />{dateText}</div>
          <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{bookingData.slots.slice(0, 5).join(', ')}{bookingData.slots.length > 5 ? ` và ${bookingData.slots.length - 5} khung giờ khác` : ''} ({bookingData.selectedCount} ô / {(bookingData.selectedCount * 0.5).toFixed(1)} giờ)</span></div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-white/10">
            <span className="text-xs text-slate-500">Tổng tiền theo giá sân</span>
            <span className="text-xl font-black text-emerald-600">{bookingData.totalPrice.toLocaleString('vi-VN')}đ</span>
          </div>
          <p className="text-[11px] text-slate-500">Thanh toán trực tuyến chưa được tích hợp; số tiền trên là thông tin đặt sân.</p>
        </div>

        <div className="space-y-3">
          {bookingData.ownerId && (
            <button type="button" onClick={openOwnerChat} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-xs font-bold text-white shadow-lg">
              <MessageSquare className="h-4 w-4" /> Nhắn tin chủ sân
            </button>
          )}
          <button type="button" onClick={showBookings} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200">
            Xem lịch đặt của tôi <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
