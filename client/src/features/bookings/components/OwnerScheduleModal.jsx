import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, LoaderCircle, Trash2, X } from 'lucide-react';
import { ownerService } from '../../../shared/services/api';

function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateTime(value) {
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

export default function OwnerScheduleModal({ venue, isOpen, onClose }) {
  const [date, setDate] = useState(vietnamToday);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ court_id: '', start_time: '18:00', end_time: '19:00', note: '' });
  const courts = venue?.courts || [];
  const venueId = venue?.id;
  const selectedCourtId = form.court_id || String(courts[0]?.id || '');

  useEffect(() => {
    let active = true;
    if (!isOpen || !venueId) return () => { active = false; };
    ownerService.getSchedule(venueId, date)
      .then((rows) => { if (active) { setItems(rows); setError(''); } })
      .catch((loadError) => { if (active) setError(loadError.message || 'Không tải được lịch sân.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, venueId, date]);

  if (!isOpen || !venue) return null;

  const addExternalBooking = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await ownerService.createExternalBlock(venue.id, {
        court_id: Number(selectedCourtId),
        start_time: new Date(`${date}T${form.start_time}:00+07:00`).toISOString(),
        end_time: new Date(`${date}T${form.end_time}:00+07:00`).toISOString(),
        note: form.note.trim() || null,
      });
      setItems(await ownerService.getSchedule(venue.id, date));
    } catch (saveError) {
      setError(saveError.message || 'Không thể ghi nhận lịch đặt ngoài hệ thống.');
    } finally { setSaving(false); }
  };

  const removeBlock = async (blockId) => {
    setError('');
    try {
      await ownerService.removeExternalBlock(venue.id, blockId);
      setItems(await ownerService.getSchedule(venue.id, date));
    } catch (removeError) {
      setError(removeError.message || 'Không gỡ được lịch ngoài hệ thống.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="owner-schedule-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0b1d31] sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id="owner-schedule-title" className="text-xl font-black">Lịch sân · {venue.name}</h2><p className="mt-1 text-sm text-slate-500">Ghi nhận đơn nhận trực tiếp để khóa lịch trên SportGo.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={addExternalBooking} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/5 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Sân con
            <select required value={selectedCourtId} onChange={(event) => setForm({ ...form, court_id: event.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900">
              {courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Ngày đặt
            <input required type="date" min={vietnamToday()} value={date} onChange={(event) => { setLoading(true); setDate(event.target.value); setError(''); }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />
          </label>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Bắt đầu
            <input required type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />
          </label>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Kết thúc
            <input required type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />
          </label>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Ghi chú (không bắt buộc)
            <input maxLength={500} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ví dụ: khách đặt qua điện thoại" className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />
          </label>
          <button disabled={saving || loading || !courts.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Ghi nhận đặt ngoài hệ thống
          </button>
        </form>

        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black">Lịch ngày {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00+07:00`))}</h3>
          <CalendarDays className="h-5 w-5 text-emerald-600" />
        </div>
        {loading ? <p className="py-7 text-center text-sm text-slate-500">Đang tải lịch…</p> : items.length ? (
          <div className="space-y-2">
            {items.map((item) => <article key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.court_name}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.kind === 'external' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'}`}>{item.kind === 'external' ? 'Đặt bên ngoài' : 'Đặt trên SportGo'}</span></div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(item.start_time)} – {formatDateTime(item.end_time)}</p>
                {item.note && <p className="mt-1 truncate text-xs text-slate-500">{item.note}</p>}
              </div>
              {item.kind === 'external' && <button type="button" onClick={() => removeBlock(item.id)} aria-label="Gỡ lịch đặt ngoài" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
            </article>)}
          </div>
        ) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/20">Ngày này chưa có lịch đặt.</p>}
        <p className="mt-4 text-xs text-slate-500">Lịch bên ngoài cần được nhập thủ công; SportGo chưa kết nối tự động với lịch/ứng dụng của bên thứ ba.</p>
      </section>
    </div>
  );
}
