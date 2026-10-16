import { useMemo, useState } from 'react';
import { CalendarClock, Check, Crown, Info, Save, X } from 'lucide-react';
import { teamService } from '../../../shared/services/api';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6'];
const FEE_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const TIME_SLOTS = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const slotKey = (weekday, time) => `${weekday}-${time}`;

const emptyForm = (team) => ({
  fee_reminder_frequency: team?.fee_reminder_frequency || '',
  fee_reminder_day: team?.fee_reminder_day == null ? '' : String(team.fee_reminder_day),
  activity_schedule: (team?.activity_schedule || []).map((slot) => slotKey(slot.weekday, slot.time)),
});

export default function TeamPremiumSettingsModal({ isOpen, onClose, team, canEdit = false, onSaved }) {
  const [form, setForm] = useState(() => emptyForm(team));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedSlots = useMemo(() => new Set(form.activity_schedule), [form.activity_schedule]);

  const toggleSlot = (weekday, time) => {
    if (!canEdit) return;
    const key = slotKey(weekday, time);
    setForm((current) => ({
      ...current,
      activity_schedule: current.activity_schedule.includes(key)
        ? current.activity_schedule.filter((item) => item !== key)
        : [...current.activity_schedule, key],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canEdit) return;
    if (form.fee_reminder_frequency && form.fee_reminder_day === '') {
      setError('Hãy chọn ngày nhắc thu phí.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const saved = await teamService.updatePremiumSettings(team.id, {
        fee_reminder_frequency: form.fee_reminder_frequency || null,
        fee_reminder_day: form.fee_reminder_frequency ? Number(form.fee_reminder_day) : null,
        activity_schedule: form.activity_schedule.map((value) => {
          const [weekday, time] = value.split('-');
          return { weekday: Number(weekday), time };
        }),
      });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Không lưu được thiết lập Premium của CLB');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div className="sg-modal-backdrop fixed inset-0 z-[1150] flex items-center justify-center overflow-y-auto p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="sg-modal-card relative my-4 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="team-premium-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="sg-modal-header flex shrink-0 items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="sg-modal-header-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><Crown className="h-6 w-6" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 id="team-premium-settings-title" className="text-lg font-black sm:text-xl">{canEdit ? 'Quản lý CLB' : 'Lịch riêng của CLB'}</h3><span className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-400/10 px-2 py-1 text-[10px] font-black text-violet-500"><Crown className="h-3 w-3" /> PREMIUM</span></div>
              <p className="mt-1 truncate text-xs">{team.name} · {canEdit ? 'Thiết lập lịch hoạt động và nhắc thu phí' : 'Thành viên chỉ được xem thiết lập của chủ CLB'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="sg-modal-close rounded-full p-2" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </header>

        <form onSubmit={submit} className="sg-modal-body flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs font-semibold text-rose-500">{error}</div>}
          <section className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="mb-3 flex items-start gap-2"><CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" /><div><h4 className="text-sm font-black">Nhắc thu phí CLB</h4><p className="mt-1 text-xs text-slate-500">Có thể để trống để không gửi nhắc phí.</p></div></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold">Loại nhắc
                <select disabled={!canEdit} value={form.fee_reminder_frequency} onChange={(event) => setForm((current) => ({ ...current, fee_reminder_frequency: event.target.value }))} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-medium disabled:opacity-60">
                  <option value="">Không nhắc</option><option value="WEEKLY">Hàng tuần</option><option value="MONTHLY">Hàng tháng</option>
                </select>
              </label>
              <label className="block text-xs font-bold">Ngày nhắc
                <select disabled={!canEdit || !form.fee_reminder_frequency} value={form.fee_reminder_day} onChange={(event) => setForm((current) => ({ ...current, fee_reminder_day: event.target.value }))} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-medium disabled:opacity-60">
                  <option value="">Chọn thứ</option>{FEE_DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><h4 className="flex items-center gap-1.5 text-sm font-black"><CalendarClock className="h-4 w-4 text-indigo-500" /> Lịch hoạt động riêng</h4><p className="mt-1 text-xs text-slate-500">Chọn các ô 30 phút từ thứ 2 đến thứ 6. Khung thứ giữ cố định khi cuộn.</p></div><span className="text-xs font-bold text-indigo-500">{form.activity_schedule.length} ô đã chọn</span></div>
            <div className={`sg-auto-schedule-scroll ${!canEdit ? 'sg-team-schedule-readonly' : ''}`}>
              <div className="sg-auto-schedule-grid sg-team-schedule-grid">
                <div className="sg-auto-schedule-corner">Giờ</div>{DAYS.map((day) => <div key={day} className="sg-auto-schedule-day">{day}</div>)}
                {TIME_SLOTS.map((time) => <div key={time} className="sg-auto-schedule-row"><span className="sg-auto-schedule-time">{time}</span>{DAYS.map((_, weekday) => { const key = slotKey(weekday, time); const selected = selectedSlots.has(key); return <button key={key} type="button" aria-label={`${DAYS[weekday]} ${time}`} aria-pressed={selected} onClick={() => toggleSlot(weekday, time)} className={`sg-auto-schedule-cell ${selected ? 'is-selected' : ''}`} disabled={!canEdit}>{selected && <Check className="h-3.5 w-3.5" />}</button>; })}</div>)}
              </div>
            </div>
          </section>

          {!canEdit && <div className="flex items-start gap-2 rounded-2xl border border-sky-300/30 bg-sky-400/10 p-3 text-xs text-sky-600 dark:text-sky-300"><Info className="mt-0.5 h-4 w-4 shrink-0" />Lịch này do chủ CLB Premium thiết lập. Thành viên chỉ có quyền xem.</div>}
        </form>

        <footer className="sg-modal-footer flex shrink-0 items-center justify-end gap-3 p-4 sm:p-5"><button type="button" onClick={onClose} className="sg-modal-secondary rounded-2xl px-4 py-2.5 text-sm font-bold">{canEdit ? 'Hủy' : 'Đóng'}</button>{canEdit && <button type="submit" onClick={submit} disabled={isSaving} className="sg-modal-primary inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? 'Đang lưu...' : 'Lưu thiết lập'}</button>}</footer>
      </section>
    </div>
  );
}
