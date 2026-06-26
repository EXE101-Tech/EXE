import { Check } from 'lucide-react';
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

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = (i % 2 === 0) ? '00' : '30';
  return `${h}:${m}`;
});

function CourtSchedule({ selectedDate, onSelectDate, courts, selectedSlots, onToggleSlot }) {
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
      const currentSlotIndex = currentHour * 2 + (currentMin >= 30 ? 1 : 0);
      const scrollAmount = (currentSlotIndex * 64) - (window.innerWidth / 2) + 80;
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
    <div className="py-5 max-w-[1100px] mx-auto">
      <div className="px-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Chọn khung giờ (50k/30p)</h2>

        {/* Thanh chọn ngày cuộn ngang */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {dates.map((date, i) => (
            <button
              key={i}
              onClick={() => onSelectDate(i)}
              className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-2xl transition-colors min-w-[60px] ${
                selectedDate === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-[11px] font-medium">{date.dayName}</span>
              <span className="text-lg font-bold leading-tight">{date.day}</span>
              <span className={`text-[10px] ${selectedDate === i ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                /{date.month}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div 
        className="w-full overflow-x-auto pb-4 scrollbar-hide select-none cursor-grab active:cursor-grabbing" 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="min-w-max border-y border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 relative">
          
          {/* Hàng header hiển thị mốc thời gian */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 w-max">
            {/* Cột tên sân (Cố định ở đầu) */}
            <div className="w-24 shrink-0 border-l border-r border-gray-200 dark:border-gray-800 p-2 flex items-center justify-center sticky left-0 z-20 bg-gray-50 dark:bg-gray-900 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sân / Giờ</span>
            </div>
            
            {/* Các mốc thời gian */}
            {TIME_SLOTS.map((time) => (
              <div key={time} className="w-16 shrink-0 h-10 flex items-center justify-center border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {/* Các hàng sân */}
          {courts.map((court) => (
            <div key={court.id} className="flex border-b last:border-b-0 border-gray-200 dark:border-gray-800 w-max">
              {/* Tên sân */}
              <div className="w-24 shrink-0 border-l border-r border-gray-200 dark:border-gray-800 p-2 flex items-center sticky left-0 z-20 bg-white dark:bg-gray-900 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={court.name}>
                  {court.name}
                </span>
              </div>
              
              {/* Các ô slot */}
              {TIME_SLOTS.map((time) => {
                const slotId = `${court.id}-${time}`;
                const isSelected = selectedSlots.has(slotId);
                const isPast = isPastTime(time);
                return (
                  <div key={time} className="w-16 shrink-0 border-r last:border-r-0 border-gray-200 dark:border-gray-800 h-12">
                    <button
                      onClick={() => {
                        if (!isPast) onToggleSlot(slotId);
                      }}
                      className={`w-full h-full rounded-none transition-colors pointer-events-auto ${
                        isPast 
                          ? 'bg-gray-100 dark:bg-gray-800/60'
                          : isSelected 
                            ? 'bg-[#E76251]' 
                            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      title={isPast ? 'Đã qua giờ này' : `${court.name} - ${time}`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          
        </div>
      </div>
      
      <div className="px-4 flex gap-4 text-xs mt-2 text-gray-500 dark:text-gray-400 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-sm"></div>
          <span>Trống</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm"></div>
          <span>Đã qua</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#E76251] rounded-sm"></div>
          <span>Đang chọn</span>
        </div>
      </div>

    </div>
  );
}

export default CourtSchedule;
