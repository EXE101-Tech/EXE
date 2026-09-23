import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, RefreshCw, XCircle } from 'lucide-react';
import { bookingService } from '../../shared/services/api';

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`));
}

function formatTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`));
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      setBookings(await bookingService.getAll());
    } catch (loadError) {
      setError(loadError.message || 'Không tải được lịch đặt của bạn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    bookingService.getAll()
      .then((rows) => { if (active) setBookings(rows); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Không tải được lịch đặt của bạn.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cancelBooking = async (id) => {
    setCancellingId(id);
    setError('');
    try {
      const updated = await bookingService.cancel(id);
      setBookings((items) => items.map((item) => item.id === id ? updated : item));
    } catch (cancelError) {
      setError(cancelError.message || 'Không thể hủy lịch đặt.');
    } finally {
      setCancellingId(null);
    }
  };

  const ordered = [...bookings].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-8 text-slate-900 dark:text-white sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Lịch đặt sân của tôi</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thông tin lấy trực tiếp từ hệ thống đặt sân.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); setError(''); loadBookings(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm dark:border-white/10 dark:bg-white/5">
          <RefreshCw className="h-4 w-4" /> Tải lại
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p>}
      {loading ? <p className="py-16 text-center text-slate-500">Đang tải lịch đặt…</p> : ordered.length ? (
        <div className="space-y-4">
          {ordered.map((booking) => {
            const venue = booking.court?.venue;
            const isUpcoming = booking.status?.toLowerCase() !== 'cancelled' && new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(booking.start_time) ? booking.start_time : `${booking.start_time}Z`) > new Date();
            return (
              <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#001F3F]/70">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black">{venue?.name || booking.court?.name || 'Sân thể thao'}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${booking.status?.toLowerCase() === 'cancelled' ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`}>
                        {booking.status?.toLowerCase() === 'cancelled' ? 'Đã hủy' : 'Đã xác nhận'}
                      </span>
                    </div>
                    {venue?.address && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4 shrink-0" />{venue.address}</p>}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-emerald-600" />{formatDate(booking.start_time)}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-emerald-600" />{formatTime(booking.start_time)}–{formatTime(booking.end_time)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Mã đặt sân: {booking.id} · {booking.court?.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <span className="text-lg font-black text-emerald-600">{Number(booking.total_price).toLocaleString('vi-VN')}đ</span>
                    {isUpcoming && <button type="button" disabled={cancellingId === booking.id} onClick={() => cancelBooking(booking.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-300">
                      <XCircle className="h-4 w-4" /> {cancellingId === booking.id ? 'Đang hủy…' : 'Hủy lịch'}
                    </button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-white/20">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-bold">Bạn chưa có lịch đặt sân</h2>
          <p className="mt-1 text-sm text-slate-500">Khi đặt sân, các lịch đã xác nhận sẽ xuất hiện ở đây.</p>
        </div>
      )}
    </main>
  );
}
