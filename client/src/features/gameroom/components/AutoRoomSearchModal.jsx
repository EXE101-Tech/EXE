import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, Check, Clock3, Crown, MapPin, Save, Trophy, Users, X } from 'lucide-react';
import { autoRoomSearchService, sportService } from '../../../shared/services/api';
import { isActiveSport } from '../../../shared/constants/sports';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const LEVELS = [
  { value: '', label: 'Mọi trình độ' },
  { value: 'Beginner', label: 'Mới chơi' },
  { value: 'Intermediate', label: 'Trung bình' },
  { value: 'Advanced', label: 'Khá / Giỏi' },
  { value: 'Expert', label: 'Chuyên nghiệp' },
];

const TIME_SLOTS = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const emptyForm = () => ({
  sport_id: '',
  required_level: '',
  max_price: '',
  location: '',
  time_slots: [],
  is_active: true,
});

const slotKey = (weekday, time) => `${weekday}-${time}`;

const parsePrice = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ''));
  if (/^\d+$/.test(raw)) return Number(raw);
  return Number.NaN;
};

const preferenceToForm = (preference) => {
  if (!preference) return emptyForm();
  return {
    sport_id: preference.sport_id || '',
    required_level: preference.required_level || '',
    max_price: preference.max_price == null ? '' : Number(preference.max_price).toLocaleString('vi-VN'),
    location: preference.location || '',
    time_slots: (preference.time_slots || []).map((slot) => slotKey(slot.weekday, slot.time)),
    is_active: preference.is_active !== false,
  };
};

export default function AutoRoomSearchModal({ isOpen, onClose, onSaved }) {
  const [sports, setSports] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setError('');
    setIsLoading(true);
    Promise.all([sportService.getAll(), autoRoomSearchService.get()])
      .then(([sportList, preference]) => {
        if (!active) return;
        setSports(sportList.filter((sport) => sport.id != null && isActiveSport(sport)));
        setForm(preferenceToForm(preference));
      })
      .catch((err) => {
        if (active) setError(err.message || 'Không tải được thiết lập tự động tìm phòng');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [isOpen]);

  const selectedSlotSet = useMemo(() => new Set(form.time_slots), [form.time_slots]);

  const toggleSlot = (weekday, time) => {
    const key = slotKey(weekday, time);
    setForm((current) => ({
      ...current,
      time_slots: current.time_slots.includes(key)
        ? current.time_slots.filter((item) => item !== key)
        : [...current.time_slots, key],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.time_slots.length) {
      setError('Hãy chọn ít nhất một khung giờ 30 phút.');
      return;
    }
    const maxPrice = parsePrice(form.max_price);
    if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      setError('Giá tối đa phải là số tiền hợp lệ.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const saved = await autoRoomSearchService.save({
        sport_id: form.sport_id ? Number(form.sport_id) : null,
        required_level: form.required_level || null,
        max_price: maxPrice,
        location: form.location.trim() || null,
        time_slots: form.time_slots.map((value) => {
          const [weekday, time] = value.split('-');
          return { weekday: Number(weekday), time };
        }),
        is_active: true,
      });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Không lưu được thiết lập tự động tìm phòng');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sg-modal-backdrop fixed inset-0 z-[1050] flex items-center justify-center overflow-y-auto p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="sg-modal-card relative my-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sg-modal-header flex shrink-0 items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="sg-modal-header-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black sm:text-xl">Thiết lập tự động tìm phòng</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-400/10 px-2 py-1 text-[10px] font-black text-violet-500"><Crown className="h-3 w-3" /> PREMIUM</span>
              </div>
              <p className="mt-1 text-xs">Khi có phòng phù hợp, SportGo sẽ gửi thông báo cho bạn.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="sg-modal-close rounded-full p-2" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="sg-modal-body flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {error && <div className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs font-semibold text-rose-500"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          {isLoading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">Đang tải thiết lập của bạn...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-xs font-bold">
                  <span className="mb-1.5 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-amber-500" /> Môn thể thao</span>
                  <select value={form.sport_id} onChange={(event) => setForm((current) => ({ ...current, sport_id: event.target.value }))} className="w-full rounded-2xl border px-4 py-3 text-sm font-medium">
                    <option value="">Tất cả môn</option>
                    {sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold">
                  <span className="mb-1.5 flex items-center gap-1.5"><Users className="h-4 w-4 text-sky-500" /> Trình độ</span>
                  <select value={form.required_level} onChange={(event) => setForm((current) => ({ ...current, required_level: event.target.value }))} className="w-full rounded-2xl border px-4 py-3 text-sm font-medium">
                    {LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold">
                  <span className="mb-1.5 flex items-center gap-1.5"><span className="text-base text-emerald-500">₫</span> Giá tối đa / người</span>
                  <input type="text" inputMode="numeric" value={form.max_price} onChange={(event) => setForm((current) => ({ ...current, max_price: event.target.value }))} placeholder="Ví dụ: 50.000" className="w-full rounded-2xl border px-4 py-3 text-sm font-medium" />
                  <small className="mt-1 block text-[11px] font-normal text-slate-500">Nhập theo đồng, ví dụ 50.000đ. Phòng có giá nhỏ hơn hoặc bằng mức này sẽ được tính phù hợp.</small>
                </label>
                <label className="block text-xs font-bold">
                  <span className="mb-1.5 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-rose-500" /> Khu vực mong muốn</span>
                  <input type="text" maxLength="255" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Ví dụ: Quận 7, Thủ Đức" className="w-full rounded-2xl border px-4 py-3 text-sm font-medium" />
                  <small className="mt-1 block text-[11px] font-normal text-slate-500">Có thể nhập tên quận, khu vực hoặc địa điểm.</small>
                </label>
              </div>

              <section>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-sm font-black"><Clock3 className="h-4 w-4 text-indigo-500" /> Khung giờ muốn tìm</h4>
                    <p className="mt-1 text-xs text-slate-500">Chọn các ô 30 phút. Khung thứ sẽ giữ cố định khi bạn cuộn.</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-500">{form.time_slots.length} ô đã chọn</span>
                </div>
                <div className="sg-auto-schedule-scroll">
                  <div className="sg-auto-schedule-grid">
                    <div className="sg-auto-schedule-corner">Giờ</div>
                    {DAYS.map((day) => <div key={day} className="sg-auto-schedule-day">{day}</div>)}
                    {TIME_SLOTS.map((time) => (
                      <div key={time} className="sg-auto-schedule-row">
                        <span className="sg-auto-schedule-time">{time}</span>
                        {DAYS.map((_, weekday) => {
                          const key = slotKey(weekday, time);
                          const selected = selectedSlotSet.has(key);
                          return <button key={key} type="button" aria-label={`${DAYS[weekday]} ${time}`} aria-pressed={selected} onClick={() => toggleSlot(weekday, time)} className={`sg-auto-schedule-cell ${selected ? 'is-selected' : ''}`}>{selected && <Check className="h-3.5 w-3.5" />}</button>;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </form>

        <div className="sg-modal-footer flex shrink-0 items-center justify-end gap-3 p-4 sm:p-5">
          <button type="button" onClick={onClose} className="sg-modal-secondary rounded-2xl px-4 py-2.5 text-sm font-bold">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={isLoading || isSaving} className="sg-modal-primary inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? 'Đang lưu...' : 'Lưu thiết lập'}</button>
        </div>
      </div>
    </div>
  );
}
