import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, MessageSquareText, Plus } from 'lucide-react';
import { socialPostService, storageService } from '../../shared/services/api';
import { useAuth } from '../../shared/context/AuthContext';
import SocialPostCard from '../tournament/components/SocialPostCard';
import SocialPostComposer from '../tournament/components/SocialPostComposer';

export default function MySocialPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      setPosts(await socialPostService.getMine({ limit: 100 }));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được bài viết của bạn.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadPosts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  const savePost = async (data) => {
    const { media_file: mediaFile, ...payload } = data;
    if (mediaFile) {
      const media = await storageService.uploadMedia(mediaFile);
      payload.media_url = media.url;
      payload.media_type = media.type;
    }
    if (editingPost) await socialPostService.update(editingPost.id, payload);
    else await socialPostService.create(payload);
    await loadPosts();
    setEditingPost(null);
    setIsComposerOpen(false);
  };

  const deletePost = async (post) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await socialPostService.remove(post.id);
      await loadPosts();
    } catch (deleteError) {
      setError(deleteError.message || 'Không thể xóa bài viết.');
    }
  };

  return (
    <section className="mt-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"><MessageSquareText className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-black text-slate-900 dark:text-white">Bài viết của tôi</h2><p className="text-sm text-slate-500 dark:text-slate-400">Xem và chỉnh sửa những gì bạn đã chia sẻ.</p></div>
        </div>
        <button type="button" onClick={() => { setEditingPost(null); setIsComposerOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"><Plus className="h-4 w-4" /> Đăng bài</button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {isLoading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải bài viết…</div> : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">Bạn chưa đăng bài viết nào.</div>
      ) : <div className="space-y-4">
        {posts.map((post) => <SocialPostCard key={post.id} post={post} user={user} canManage onEdit={(item) => { setEditingPost(item); setIsComposerOpen(true); }} onDelete={deletePost} onRefresh={loadPosts} />)}
      </div>}

      <SocialPostComposer key={`${editingPost?.id || 'new'}-${isComposerOpen ? 'open' : 'closed'}`} isOpen={isComposerOpen} initialPost={editingPost} onClose={() => { setIsComposerOpen(false); setEditingPost(null); }} onSave={savePost} />
    </section>
  );
}
