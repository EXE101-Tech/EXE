import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, LoaderCircle, MessageSquareText, Plus, X } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { useChat } from '../../shared/context/ChatContext';
import { socialPostService, storageService } from '../../shared/services/api';
import SocialPostCard from './components/SocialPostCard';
import SocialPostComposer from './components/SocialPostComposer';

const PAGE_SIZE = 20;

export default function SocialFeed() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = (searchParams.get('search') || '').trim();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const offsetRef = useRef(0);

  const loadFeed = useCallback(async (append = false, silent = false) => {
    if (append) setIsLoadingMore(true);
    else if (!silent) setIsLoading(true);
    try {
      const offset = append ? offsetRef.current : 0;
      const items = await socialPostService.getFeed({ limit: PAGE_SIZE, offset, ...(searchQuery.length >= 2 ? { search: searchQuery } : {}) });
      setPosts((current) => append ? [...current, ...items] : items);
      offsetRef.current = offset + items.length;
      setHasMore(items.length === PAGE_SIZE);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được bảng tin.');
    } finally {
      if (!silent) setIsLoading(false);
      if (append) setIsLoadingMore(false);
    }
  }, [searchQuery]);

  const refreshFeed = useCallback(() => loadFeed(false, true), [loadFeed]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadFeed(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFeed]);

  const savePost = async (data) => {
    const { media_file: mediaFile, ...payload } = data;
    if (mediaFile) {
      const media = await storageService.uploadMedia(mediaFile);
      payload.media_url = media.url;
      payload.media_type = media.type;
    }
    await socialPostService.create(payload);
    await loadFeed();
    setIsComposerOpen(false);
    setNotice('Bài viết đã được chia sẻ.');
    window.setTimeout(() => setNotice(''), 3500);
  };

  const connectToAuthor = async (recipient) => {
    openChat(recipient);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-2xl pb-20 pt-3 text-slate-900 dark:text-slate-100">
      {notice && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">{notice}</div>}
      {searchQuery.length >= 2 && <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"><span className="truncate text-slate-600 dark:text-slate-300">Kết quả bài viết cho <strong className="text-slate-900 dark:text-white">“{searchQuery}”</strong></span><button type="button" onClick={() => setSearchParams({})} aria-label="Xóa tìm kiếm" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button></div>}

      <section className="mb-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-center text-lg font-black leading-[44px] text-white">
            {user?.profile?.avatar_url || user?.avatar ? <img src={user.profile?.avatar_url || user.avatar} alt="" className="h-full w-full object-cover" /> : (user?.profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <button type="button" onClick={() => setIsComposerOpen(true)} className="flex min-h-11 flex-1 items-center rounded-full bg-slate-100 px-4 text-left text-sm text-slate-500 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">Bạn đang nghĩ gì?</button>
          <button type="button" onClick={() => setIsComposerOpen(true)} title="Đăng ảnh hoặc video" aria-label="Đăng ảnh hoặc video" className="rounded-full p-3 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10"><Camera className="h-5 w-5" /></button>
        </div>
      </section>

      {error && <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</div>}

      {isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải bảng tin…</div> : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center dark:border-white/15 dark:bg-slate-900/50">
          <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-emerald-600 dark:text-emerald-300" />
          <h2 className="text-lg font-black">{searchQuery.length >= 2 ? 'Chưa tìm thấy bài viết phù hợp' : 'Bảng tin đang chờ câu chuyện đầu tiên'}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{searchQuery.length >= 2 ? 'Thử từ khóa khác hoặc xóa tìm kiếm để xem toàn bộ bảng tin.' : 'Hãy chia sẻ điều bạn đang nghĩ hoặc một khoảnh khắc thể thao với mọi người.'}</p>
          {searchQuery.length >= 2 ? <button type="button" onClick={() => setSearchParams({})} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-white"><X className="h-4 w-4" /> Xóa tìm kiếm</button> : <button type="button" onClick={() => setIsComposerOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Tạo bài viết</button>}
        </div>
      ) : <div className="space-y-5">
        {posts.map((post) => <SocialPostCard key={post.id} post={post} user={user} onRefresh={refreshFeed} onMessage={connectToAuthor} />)}
        {hasMore && <button type="button" onClick={() => loadFeed(true)} disabled={isLoadingMore} className="mx-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-400/10">{isLoadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />} Xem thêm bài viết</button>}
      </div>}

      <SocialPostComposer key={isComposerOpen ? 'open' : 'closed'} isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} onSave={savePost} />
    </div>
  );
}
