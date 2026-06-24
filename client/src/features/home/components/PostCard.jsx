import React from 'react';

const LEVEL_STYLES = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  ADVANCED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  PRO: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-pink-500',
  'bg-teal-500', 'bg-amber-500', 'bg-indigo-500', 'bg-rose-500',
];

function PostCard({ post, onChat }) {
  const { id, author, avatarBadge, description, time, level, location, isTeam, sportLabel, images } = post;
  
  // Use a hash of the author name to consistently pick a color if not explicitly provided
  const hash = author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarColor = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
      
      {/* Cột trái: Hình ảnh bài đăng */}
      {images && images.length > 0 && (
        <div className="w-1/5 shrink-0 flex flex-col gap-2">
          {images.map((imgUrl, index) => (
            <img 
              key={index} 
              src={imgUrl} 
              alt={`post-image-${index}`} 
              className="w-full h-auto max-h-48 object-cover rounded-xl border border-gray-100 dark:border-gray-800" 
            />
          ))}
        </div>
      )}

      {/* Cột phải: Thông tin */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Header: Avatar, Name, Time */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${avatarColor}`}>
            <span className="text-white font-bold text-xs select-none">{avatarBadge}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-gray-900 dark:text-white font-bold text-sm truncate">
                {author}
              </h3>
              {isTeam && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  TEAM
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">
              {time}
            </p>
          </div>
        </div>

        {/* Body: Description */}
        <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line mb-3">
          {description}
        </div>

        {/* Footer: Tags, Location & Chat */}
        <div className="mt-auto">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {sportLabel}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLES[level] ?? 'bg-gray-100 text-gray-600'}`}>
              {level}
            </span>
          </div>
          
          <p className="text-gray-500 dark:text-gray-400 text-xs flex items-start gap-1 mb-3 line-clamp-2">
            <span className="shrink-0">📍</span> {location}
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => onChat?.(id, author)}
              className="bg-blue-600 text-white text-xs font-bold px-6 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/20"
            >
              Chat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default PostCard;
