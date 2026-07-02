import { Check, Calendar, Clock, Layers } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function generateDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dayName: i === 0 ? 'Hôm nay' : DAY_NAMES[d.getDay()],
      day: d.getDate(),
      month: d.getMonth() + 1,
    };
  });
}

const TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
  // From 06:00 to 23:30
  const totalMins = 360 + i * 30;
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const m = (totalMins % 60 === 0) ? '00' : '30';
  return `${h}:${m}`;
});

function CourtSchedule({ selectedDate, onSelectDate, courts, selectedSlots, onToggleSlot, pricePerSlot = 50000 }) {
  const dates = generateDates();
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const isPastTime = (timeStr) => {
    if (selectedDate !== 0) return false;
    const [h, m] = timeStr.split(':').map(Number);
    if (h < currentHour) return true;
    if (h === currentHour && currentMin >= m) return true;
    return false;
  };

  useEffect(() => {
    if (selectedDate === 0 && scrollRef.current) {
      const currentMinTotal = currentHour * 60 + currentMin;
      const slotIndex = Math.max(0, Math.floor((currentMinTotal - 360) / 30));
      const scrollAmount = (slotIndex * 64) - 100;
      scrollRef.current.scrollLeft = Math.max(0, scrollAmount);
    }
  }, [selectedDate, currentHour, currentMin]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="p-6 bg-white dark:bg-[#001F3F]/80 border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl mt-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#589470]" />
            <span>Chọn Khung Giờ Thi Đấu (Mỗi ô 30 phút)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            💡 Bấm để chọn 1 hoặc nhiều khung giờ liên tiếp. Giá: <span className="font-bold text-[#589470] dark:text-[#74C365]">{pricePerSlot.toLocaleString()}đ / ô</span>
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/20 rounded-md"></div>
            <span>Còn trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-white/10 rounded-md opacity-50"></div>
            <span>Đã qua / Kín</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-gradient-to-r from-[#74C365] to-[#589470] rounded-md shadow-sm"></div>
            <span>Đang chọn ({selectedSlots.size})</span>
          </div>
        </div>
      </div>

      {/* Date Picker Horizontal Scroll */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {dates.map((date, i) => (
          <button
            key={i}
            onClick={() => onSelectDate(i)}
            className={`shrink-0 flex flex-col items-center px-5 py-3 rounded-2xl transition-all min-w-[76px] border ${
              selectedDate === i
                ? 'bg-gradient-to-r from-[#74C365] to-[#589470] text-white font-black border-transparent shadow-lg shadow-[#589470]/30 scale-105'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">{date.dayName}</span>
            <span className="text-xl font-black my-0.5">{date.day}</span>
            <span className={`text-[10px] font-bold ${selectedDate === i ? 'text-white/90' : 'text-slate-400'}`}>
              Tháng {date.month}
            </span>
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      <div 
        className="w-full overflow-x-auto pb-4 scrollbar-hide select-none cursor-grab active:cursor-grabbing rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden" 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="min-w-max bg-white dark:bg-[#001F3F] relative">
          
          {/* Header row with timestamps */}
          <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 w-max">
            {/* Sticky Court Name Column */}
            <div className="w-32 shrink-0 border-r border-slate-200 dark:border-white/10 p-3 flex items-center justify-center sticky left-0 z-20 bg-slate-100 dark:bg-[#001F3F] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)]">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#589470]" />
                <span>Khu Sân</span>
              </span>
            </div>
            
            {/* Timestamps */}
            {TIME_SLOTS.map((time, idx) => (
              <div key={time} className="w-16 shrink-0 h-11 relative flex items-center">
                <span className="absolute left-0 -translate-x-1/2 text-[11px] font-bold text-slate-600 dark:text-slate-400 select-none z-10">
                  {time}
                </span>
                {idx === TIME_SLOTS.length - 1 && (
                  <span className="absolute right-0 translate-x-1/2 text-[11px] font-bold text-slate-600 dark:text-slate-400 select-none z-10">
                    24:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Court Rows */}
          {courts.map((court, idx) => (
            <div key={court.id || idx} className="flex border-b last:border-b-0 border-slate-200 dark:border-white/10 w-max hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
              {/* Court Name Sticky */}
              <div className="w-32 shrink-0 border-r border-slate-200 dark:border-white/10 p-3 flex items-center sticky left-0 z-20 bg-white dark:bg-[#001F3F] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)]">
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate" title={court.name}>
                  {court.name}
                </span>
              </div>
              
              {/* Time Slots */}
              {TIME_SLOTS.map((time) => {
                const slotId = `${court.id || idx}-${time}`;
                const isSelected = selectedSlots.has(slotId);
                const isPast = isPastTime(time);
                return (
                  <div key={time} className="w-16 shrink-0 border-r last:border-r-0 border-slate-200 dark:border-white/10 h-14 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPast) onToggleSlot(slotId);
                      }}
                      className={`w-full h-full rounded-xl transition-all pointer-events-auto flex items-center justify-center ${
                        isPast 
                          ? 'bg-slate-200/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing'
                          : isSelected 
                            ? 'bg-gradient-to-br from-[#74C365] to-[#589470] text-white shadow-md scale-95 cursor-pointer' 
                            : 'bg-slate-50/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 cursor-pointer'
                      }`}
                      title={isPast ? 'Đã qua giờ này' : `${court.name} - Khung ${time}`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          
        </div>
      </div>

    </div>
  );
}

export default CourtSchedule;
