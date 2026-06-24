const LEVEL_STYLES = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  PRO: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
};

const AVATAR_COLORS = {
  B: 'bg-blue-500',
  P: 'bg-purple-500',
  M: 'bg-green-500',
  L: 'bg-pink-500',
  T: 'bg-teal-500',
};

const BORDER_COLORS = {
  BEGINNER: 'border-green-500',
  INTERMEDIATE: 'border-blue-500',
  PRO: 'border-orange-400',
};

function MatchCard({ match, onJoin }) {
  const { id, userName, level, sport, time, avatarBadge } = match;

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-l-4 ${BORDER_COLORS[level] ?? 'border-gray-400'}`}
    >
      {/* Ảnh đại diện */}
      <div
        className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${AVATAR_COLORS[avatarBadge] ?? 'bg-gray-500'}`}
      >
        <span className="text-white font-bold text-sm select-none">{avatarBadge}</span>
      </div>

      {/* Thông tin trận đấu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-900 dark:text-white font-semibold text-sm">{userName}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLES[level] ?? 'bg-gray-100 text-gray-600'}`}>
            {level}
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
          {sport} • {time}
        </p>
      </div>

      {/* Nút tham gia */}
      <button
        onClick={() => onJoin?.(id)}
        className="shrink-0 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all"
      >
        Join
      </button>
    </div>
  );
}

export default MatchCard;
