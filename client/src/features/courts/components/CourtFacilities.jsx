import React from 'react';
import { Wifi, Car, Droplets, Coffee, Package, CheckCircle2 } from 'lucide-react';

const FACILITY_LIST = [
  { key: 'wifi', label: 'WiFi Tốc Độ Cao', icon: Wifi, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { key: 'parking', label: 'Bãi Xe An Toàn', icon: Car, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { key: 'shower', label: 'Phòng Tắm Sạch Sẽ', icon: Droplets, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  { key: 'canteen', label: 'Căng-tin Nước Giải Khát', icon: Coffee, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { key: 'rental', label: 'Thuê Vợt / Giày / Bóng', icon: Package, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
];

function CourtFacilities({ facilities }) {
  return (
    <div className="p-6 bg-white dark:bg-[#001F3F]/80 border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl mt-6 backdrop-blur-md">
      <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>✨ Dịch Vụ & Tiện Ích Đi Kèm</span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {FACILITY_LIST.map(({ key, label, icon: IconComp, color }) => {
          const available = facilities?.[key] ?? false;
          return (
            <div 
              key={key} 
              className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2.5 text-center transition-all ${
                available 
                  ? `${color} font-bold shadow-md hover:scale-105` 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-40 grayscale'
              }`}
            >
              <div className="relative">
                <IconComp className="w-6 h-6" />
                {available && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 absolute -bottom-1 -right-1 bg-white dark:bg-[#001F3F] rounded-full" />
                )}
              </div>
              <span className="text-xs leading-tight">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CourtFacilities;
