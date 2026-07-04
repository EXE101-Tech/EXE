import { Heart, ChevronLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function CourtHero({ image, name, isFavorite, onToggleFavorite }) {
  const navigate = useNavigate();

  return (
    <div className="relative h-80 sm:h-96 w-full bg-slate-900 rounded-b-3xl overflow-hidden shadow-2xl">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover object-center brightness-105 transition-transform duration-700 hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-[#74C365] to-[#001F3F] flex items-center justify-center">
          <span className="text-white font-bold text-2xl">{name}</span>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#001F3F] via-black/30 to-black/60 pointer-events-none" />

      {/* Top Navbar items */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-2 text-white text-xs font-bold transition-all active:scale-95 shadow-lg"
          aria-label="Quay lại"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: name, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Đã sao chép đường dẫn sân!");
              }
            }}
            className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
            title="Chia sẻ sân"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleFavorite}
            className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-center transition-all active:scale-95 shadow-lg"
            title="Yêu thích sân"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
          </button>
        </div>
      </div>

      {/* Bottom Title overlay inside Hero */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <div className="inline-block px-3 py-1 rounded-full bg-[#589470]/90 text-white text-xs font-black uppercase tracking-wider mb-2 backdrop-blur-md shadow-md">
          Sân Đạt Chuẩn Thi Đấu
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-md">
          {name}
        </h1>
      </div>
    </div>
  );
}

export default CourtHero;
