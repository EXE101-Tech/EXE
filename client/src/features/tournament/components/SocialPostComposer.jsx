import { useEffect, useState } from 'react';
import { Film, ImagePlus, LoaderCircle, Send, X } from 'lucide-react';
import { resolveMediaUrl } from '../../../shared/services/api';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export default function SocialPostComposer({ isOpen, onClose, onSave, initialPost = null, onAcceptTerms, guidelinesAccepted = false }) {
  const [content, setContent] = useState(initialPost?.content || '');
  const [mediaUrl, setMediaUrl] = useState(initialPost?.media_url || null);
  const [mediaType, setMediaType] = useState(initialPost?.media_type || null);
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(guidelinesAccepted);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!isOpen) return null;

  const chooseMedia = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name);
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || /\.(jpe?g|png|webp|avif)$/i.test(file.name);
    if (!isVideo && !isImage) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG, WebP, AVIF hoặc video MP4, WebM.');
      return;
    }
    if (isVideo && !(/mp4|webm/i.test(file.type) || /\.(mp4|webm)$/i.test(file.name))) {
      setError('Video chỉ hỗ trợ định dạng MP4 hoặc WebM.');
      return;
    }
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      setError(isVideo ? 'Video tối đa 50 MB.' : 'Ảnh tối đa 8 MB.');
      return;
    }
    setError('');
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaUrl(null);
    setMediaType(isVideo ? 'video' : 'image');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim() && !mediaFile && !mediaUrl) {
      setError('Hãy nhập nội dung hoặc chọn ảnh/video để đăng.');
      return;
    }
    if (!initialPost && !acceptedGuidelines) {
      setError('Vui lòng xác nhận bạn đã đọc và đồng ý quy tắc cộng đồng trước khi đăng.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (!initialPost && !guidelinesAccepted) await onAcceptTerms?.();
      await onSave({
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        media_file: mediaFile,
      });
    } catch (saveError) {
      setError(saveError.message || 'Không thể lưu bài viết.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayedMedia = previewUrl || (mediaUrl ? resolveMediaUrl(mediaUrl) : '');

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="social-composer-title" className="my-6 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 id="social-composer-title" className="text-lg font-black text-slate-900 dark:text-white">{initialPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Chia sẻ điều bạn đang nghĩ cùng cộng đồng SportGo.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Đóng" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </header>

        <form onSubmit={submit}>
          <div className="space-y-4 p-5">
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
            <textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={5} placeholder="Bạn đang nghĩ gì?" className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-white" />

            {displayedMedia && (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800">
                {mediaType === 'video' ? (
                  <video src={displayedMedia} controls playsInline className="max-h-[55vh] w-full object-contain" />
                ) : (
                  <img src={displayedMedia} alt="Xem trước bài viết" className="max-h-[55vh] w-full object-contain" />
                )}
                <button type="button" onClick={() => { setMediaFile(null); setMediaUrl(null); setMediaType(null); }} className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-3 py-2 text-xs font-bold text-white hover:bg-slate-950">
                  Gỡ tệp
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10">
                <ImagePlus className="h-4 w-4" /> Ảnh
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={chooseMedia} />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-400/10">
                <Film className="h-4 w-4" /> Video
                <input type="file" accept="video/mp4,video/webm,.mp4,.webm" className="sr-only" onChange={chooseMedia} />
              </label>
              <span className="ml-auto text-[11px] text-slate-400">Ảnh ≤ 8 MB · Video ≤ 50 MB</span>
            </div>
            {!initialPost && !guidelinesAccepted && <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><input type="checkbox" checked={acceptedGuidelines} onChange={(event) => setAcceptedGuidelines(event.target.checked)} className="mt-1 accent-emerald-600" /><span>Tôi đồng ý tuân thủ quy tắc cộng đồng SportGo.</span></label>}
          </div>
          <footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/[0.02]">
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 disabled:opacity-50">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSaving ? 'Đang lưu…' : initialPost ? 'Lưu bài viết' : 'Đăng bài'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
