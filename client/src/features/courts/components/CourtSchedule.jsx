import { Check, Clock, Layers } from 'lucide-react';
import { useEffect, useRef } from 'react';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getVietnamDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + offset));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

const TIME_SLOTS = Array.from({ length: 36 }, (_, index) => {
  const minutes = 360 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});

function CourtSchedule({
  selectedDate, onSelectDate, courts, selectedSlots, unavailableSlots,
  onToggleSlot, pricePerSlot = 0, isAvailabilityLoading, availabilityError,
}) {
  const scrollRef = useRef(null);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const value = getVietnamDate(index);
    const date = new Date(`${value}T12:00:00+07:00`);
    return {
      value,
      label: index === 0 ? 'Hôm nay' : DAY_NAMES[date.getDay()],
      day: date.getDate(),
      month: date.getMonth() + 1,
    };
  });
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const now = Object.fromEntries(nowParts.map(({ type, value }) => [type, value]));
  const today = getVietnamDate();
  const nowMinutes = Number(now.hour) * 60 + Number(now.minute);

  useEffect(() => {
    if (selectedDate === today && scrollRef.current) {
      const slotIndex = Math.max(0, Math.floor((nowMinutes - 360) / 30));
      scrollRef.current.scrollLeft = Math.max(0, slotIndex * 64 - 100);
    }
  }, [selectedDate, today, nowMinutes]);

  return (
    <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#001F3F]/80 sm:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Clock className="h-5 w-5 text-[#589470]" /> Chọn khung giờ (mỗi ô 30 phút)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Giá tham khảo thấp nhất: <span className="font-bold text-[#589470]">{pricePerSlot.toLocaleString('vi-VN')}đ / 30 phút</span>. Giá từng sân được tính khi xác nhận.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5"><i className="h-3.5 w-3.5 rounded border border-slate-300" /> Còn trống</span>
          <span className="flex items-center gap-1.5"><i className="h-3.5 w-3.5 rounded bg-slate-300" /> Đã qua / Đã đặt</span>
          <span className="flex items-center gap-1.5"><i className="h-3.5 w-3.5 rounded bg-emerald-500" /> Đang chọn ({selectedSlots.size})</span>
        </div>
      </div>

      <div className="mb-4 flex gap-2.5 overflow-x-auto pb-4">
        {dates.map((date) => (
          <button key={date.value} type="button" onClick={() => onSelectDate(date.value)}
            className={`flex min-w-[76px] shrink-0 flex-col items-center rounded-2xl border px-5 py-3 transition-all ${selectedDate === date.value
              ? 'border-transparent bg-gradient-to-r from-[#74C365] to-[#589470] font-black text-white shadow-lg'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}>
            <span className="text-[11px] font-bold uppercase">{date.label}</span>
            <span className="my-0.5 text-xl font-black">{date.day}</span>
            <span className="text-[10px] font-bold opacity-75">Tháng {date.month}</span>
          </button>
        ))}
      </div>

      {isAvailabilityLoading && <p className="mb-3 text-sm text-slate-500">Đang tải lịch đặt thực tế…</p>}
      {availabilityError && <p role="alert" className="mb-3 text-sm font-semibold text-rose-600">{availabilityError} Không thể chọn giờ khi chưa tải được lịch.</p>}

      <div ref={scrollRef} className="overflow-x-auto rounded-2xl border border-slate-200 pb-2 dark:border-white/10">
        <div className="min-w-max bg-white dark:bg-[#001F3F]">
          <div className="flex w-max border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30">
            <div className="sticky left-0 z-20 flex w-32 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-[#001F3F]">
              <span className="flex items-center gap-1 text-xs font-black uppercase text-slate-700 dark:text-slate-200"><Layers className="h-3.5 w-3.5 text-[#589470]" /> Sân</span>
            </div>
            {TIME_SLOTS.map((time, index) => <div key={time} className="relative flex h-11 w-16 shrink-0 items-center"><span className="absolute left-0 z-10 -translate-x-1/2 text-[11px] font-bold text-slate-600">{time}</span>{index === TIME_SLOTS.length - 1 && <span className="absolute right-0 translate-x-1/2 text-[11px] font-bold text-slate-600">24:00</span>}</div>)}
          </div>

          {courts.map((court) => (
            <div key={court.id} className="flex w-max border-b border-slate-200 last:border-0 dark:border-white/10">
              <div className="sticky left-0 z-20 flex w-32 shrink-0 items-center border-r border-slate-200 bg-white p-3 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-[#001F3F]">
                <span className="truncate text-xs font-bold text-slate-800 dark:text-white" title={court.name}>{court.name}</span>
              </div>
              {TIME_SLOTS.map((time) => {
                const key = `${court.id}|${time}`;
                const selected = selectedSlots.has(key);
                const [hour, minute] = time.split(':').map(Number);
                const past = selectedDate === today && hour * 60 + minute <= nowMinutes;
                const occupied = unavailableSlots.has(key);
                const disabled = past || occupied || isAvailabilityLoading || !!availabilityError;
                return (
                  <div key={time} className="h-14 w-16 shrink-0 border-r border-slate-200 p-1 last:border-0 dark:border-white/10">
                    <button type="button" disabled={disabled} onClick={() => onToggleSlot(key)}
                      aria-label={`${court.name}, ${time}${occupied ? ', đã được đặt' : ''}`}
                      title={past ? 'Đã qua giờ này' : occupied ? 'Khung giờ đã có người đặt' : `${court.name} - ${time}`}
                      className={`flex h-full w-full items-center justify-center rounded-xl transition-all ${disabled
                        ? 'cursor-not-allowed bg-slate-200/80 text-slate-400 dark:bg-slate-800/60'
                        : selected ? 'scale-95 cursor-pointer bg-gradient-to-br from-[#74C365] to-[#589470] text-white shadow-md'
                          : 'cursor-pointer bg-slate-50/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15'}`}>
                      {selected && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CourtSchedule;
