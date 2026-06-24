import badmintonImg from '../../../assets/icons/badminton.png';
import footballImg from '../../../assets/icons/football.png';
import pickleballImg from '../../../assets/icons/pickelball.png';
import tennisImg from '../../../assets/icons/tennis.png';
import locatedImg from '../../../assets/svgs/locate.svg';

const SPORT_GRADIENTS = {
  badminton: 'from-blue-900 via-blue-700 to-cyan-600',
  football: 'from-green-900 via-green-700 to-emerald-500',
  pickleball: 'from-teal-900 via-teal-700 to-cyan-500',
  tennis: 'from-orange-900 via-orange-700 to-yellow-500',
};

const SPORT_IMAGE = {
  badminton: badmintonImg,
  football: footballImg,
  pickleball: pickleballImg,
  tennis: tennisImg,
};

function CourtCard({ court, onBook }) {
  const { id, name, rating, distance, district, price, sport, image } = court;

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
      {/* Ảnh thu nhỏ + huy hiệu đánh giá */}
      <div className="relative shrink-0">
        <div className={`w-20 h-20 rounded-xl overflow-hidden ${!image ? `bg-gradient-to-br ${SPORT_GRADIENTS[sport] ?? 'from-gray-700 to-gray-500'} flex items-center justify-center` : ''}`}>
          {image
            ? <img src={image} alt={name} className="w-full h-full object-cover" />
            : (SPORT_IMAGE[sport]
                ? <img src={SPORT_IMAGE[sport]} alt={sport} className="w-12 h-12 object-contain" />
                : <span className="text-3xl select-none">🏟️</span>)
          }
        </div>
        <div className="absolute top-1.5 left-1.5 bg-black/70 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
          <span className="text-yellow-400 text-[10px] leading-none">⭐</span>
          <span className="text-white text-[10px] font-semibold leading-none">{rating}</span>
        </div>
      </div>

      {/* Thông tin sân */}
      <div className="flex-1 min-w-0">
        <h3 className="text-gray-900 dark:text-white font-semibold text-sm truncate">{name}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate flex items-center gap-1">
          <img src={locatedImg} alt="location" className="w-3 h-3 object-contain shrink-0 dark:invert" />
          {distance} • {district}
        </p>
        <p className="text-blue-600 dark:text-blue-400 text-sm font-bold mt-1.5">
          from <span>{price}</span>
        </p>
      </div>

      {/* Nút đặt sân */}
      <button
        onClick={() => onBook?.(id)}
        className="shrink-0 bg-[#CDFF00] text-gray-900 text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#b8e800] active:scale-95 transition-all"
      >
        Book
      </button>
    </div>
  );
}

export default CourtCard;
