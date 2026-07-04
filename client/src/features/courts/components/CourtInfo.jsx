import { Star, MapPin, MessageSquare, ShieldCheck, Clock, Award } from 'lucide-react';
import { useChat } from '../../../shared/context/ChatContext';

const SPORT_BADGE = {
  badminton: { label: 'Cầu lông', emoji: '🏸', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' },
  football: { label: 'Bóng đá', emoji: '⚽', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' },
  tennis: { label: 'Tennis', emoji: '🎾', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' },
  pickleball: { label: 'Pickleball', emoji: '🏓', className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30' },
  basketball: { label: 'Bóng rổ', emoji: '🏀', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30' },
  volleyball: { label: 'Bóng chuyền', emoji: '🏐', className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' },
};

function CourtInfo({ court }) {
  const { name, sport, rating, reviewCount, address, distance, price, description, courtCount, hostName } = court;
  const badge = SPORT_BADGE[sport] ?? { label: sport || 'Thể thao', emoji: '🏆', className: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30' };
  const { openChat } = useChat();

  return (
    <div className="p-6 bg-white dark:bg-[#001F3F]/80 border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl mt-6 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Badge & Rating */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${badge.className}`}>
              <span>{badge.emoji}</span>
              <span>{badge.label}</span>
            </span>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{rating || 4.8}</span>
              <span className="text-slate-400 font-normal">({reviewCount || 24} đánh giá)</span>
            </div>

            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{courtCount || 4} sân sẵn sàng</span>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-medium">{address}</span>
            {distance && (
              <span className="bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                {distance}
              </span>
            )}
          </div>
        </div>

        {/* Price & Chat Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-white/10">
          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400 font-medium">Giá thuê khung 30 phút</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black bg-gradient-to-r from-[#74C365] to-[#589470] bg-clip-text text-transparent">
                {price || '50.000đ'}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 30p</span>
            </div>
          </div>

          <button
            onClick={() => openChat(hostName || 'Chủ sân')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Nhắn tin chủ sân ({hostName || 'Host'})</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </div>
      )}
    </div>
  );
}

export default CourtInfo;
