import { useEffect } from 'react';
import { X } from 'lucide-react';
import { resolveMediaUrl } from '../services/api';

const isVideoMedia = (type = '') => type === 'video' || (typeof type === 'string' && type.startsWith('video/'));

export default function MediaPreviewModal({ src, type = 'image', alt = 'Nội dung media', onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, src]);

  if (!src) return null;

  const mediaUrl = resolveMediaUrl(src);
  const video = isVideoMedia(type);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Xem nội dung media"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng xem media"
          className="absolute right-3 top-3 z-10 rounded-full bg-slate-950/70 p-2 text-slate-200 transition hover:bg-slate-950 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex min-h-0 items-center justify-center overflow-auto bg-black/40 p-3 sm:p-6">
          {video ? (
            <video src={mediaUrl} controls autoPlay={false} playsInline preload="metadata" className="max-h-[78vh] max-w-full rounded-xl object-contain" aria-label={alt} />
          ) : (
            <img src={mediaUrl} alt={alt} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
          )}
        </div>
      </section>
    </div>
  );
}
