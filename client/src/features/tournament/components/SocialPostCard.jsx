import { useEffect, useState } from 'react';
import { Heart, LoaderCircle, MessageCircle, Pencil, Send, Trash2, UserPlus, UserRoundCheck, X } from 'lucide-react';
import { chatService, resolveMediaUrl, socialPostService } from '../../../shared/services/api';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

function Avatar({ src, name, className = 'h-10 w-10' }) {
  return (
    <div className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-white`}>
      {src ? <img src={resolveMediaUrl(src)} alt="" className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

export default function SocialPostCard({ post, user, canManage = false, onEdit, onDelete, onRefresh, onMessage }) {
  const [liked, setLiked] = useState(Boolean(post.liked_by_me));
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [friendError, setFriendError] = useState('');
  const [friendBusy, setFriendBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);

  const isMine = Number(post.author_id) === Number(user?.id);

  useEffect(() => {
    if (!commentsOpen) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setCommentsLoading(true);
      setCommentError('');
      socialPostService.getComments(post.id)
        .then((items) => { if (active) setComments(items); })
        .catch((error) => { if (active) setCommentError(error.message || 'Không tải được bình luận.'); })
        .finally(() => { if (active) setCommentsLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [commentsOpen, post.id]);

  const toggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    setActionError('');
    try {
      const result = liked ? await socialPostService.unlike(post.id) : await socialPostService.like(post.id);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch (error) {
      setActionError(error.message || 'Không thể cập nhật lượt thích.');
    } finally {
      setIsLiking(false);
    }
  };

  const sendComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim() || isCommenting) return;
    setIsCommenting(true);
    setCommentError('');
    try {
      const comment = await socialPostService.addComment(post.id, commentText.trim());
      setComments((current) => [...current, comment]);
      setCommentText('');
      setCommentCount((count) => count + 1);
    } catch (error) {
      setCommentError(error.message || 'Không thể gửi bình luận.');
    } finally {
      setIsCommenting(false);
    }
  };

  const removeComment = async (comment) => {
    try {
      await socialPostService.removeComment(post.id, comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setCommentCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setCommentError(error.message || 'Không thể xóa bình luận.');
    }
  };

  const connectOrMessage = async () => {
    if (friendBusy) return;
    setFriendError('');
    if (post.friendship_status === 'accepted') {
      onMessage?.({ id: post.author_id, name: post.author_name, avatar: post.author_avatar_url });
      return;
    }
    if (post.friendship_status === 'outgoing') return;
    setFriendBusy(true);
    try {
      if (post.friendship_status === 'incoming' && post.friendship_id) {
        await chatService.acceptFriendRequest(post.friendship_id);
      } else {
        await chatService.sendFriendRequest(post.author_id);
      }
      await onRefresh?.();
    } catch (error) {
      setFriendError(error.message || 'Không thể cập nhật lời mời kết bạn.');
    } finally {
      setFriendBusy(false);
    }
  };

  const mediaUrl = resolveMediaUrl(post.media_url);
  const friendshipLabel = post.friendship_status === 'accepted'
    ? 'Nhắn tin'
    : post.friendship_status === 'outgoing'
      ? 'Đã gửi lời mời'
      : post.friendship_status === 'incoming'
        ? 'Chấp nhận'
        : 'Kết bạn';

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-slate-900/80">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className={`rounded-full p-[2px] ${post.author_owner_status === 'registered' ? 'owner-avatar-ring-active' : 'bg-gradient-to-br from-emerald-400 to-cyan-500'}`}>
          <div className="rounded-full bg-white p-[2px] dark:bg-slate-900"><Avatar src={post.author_avatar_url} name={post.author_name} className="h-10 w-10" /></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-extrabold ${post.author_owner_status === 'registered' ? 'owner-water-text' : 'text-slate-900 dark:text-white'}`}>{post.author_name}</p>
          <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
        {!isMine && <button type="button" onClick={connectOrMessage} disabled={friendBusy || post.friendship_status === 'outgoing'} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-default disabled:opacity-65 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200">
          {friendBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : post.friendship_status === 'accepted' ? <MessageCircle className="h-4 w-4" /> : post.friendship_status === 'outgoing' ? <UserRoundCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          <span className="hidden sm:inline">{friendshipLabel}</span>
        </button>}
      </header>

      {post.content && <p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-6 text-slate-800 dark:text-slate-100 sm:px-5">{post.content}</p>}

      {mediaUrl && (post.media_type === 'video' ? (
        <video src={mediaUrl} controls playsInline preload="metadata" className="max-h-[min(75vh,720px)] w-full bg-black object-contain" />
      ) : (
        <img src={mediaUrl} alt={`Ảnh trong bài viết của ${post.author_name}`} loading="lazy" className="max-h-[min(75vh,720px)] w-full bg-slate-50 object-contain dark:bg-black/20" />
      ))}

      <div className="px-4 sm:px-5">
        <div className="flex items-center justify-between border-b border-slate-100 py-3 dark:border-white/10">
          <div className="flex items-center gap-4">
            <button type="button" onClick={toggleLike} disabled={isLiking} aria-pressed={liked} className={`inline-flex items-center gap-2 text-sm font-bold transition ${liked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 hover:text-rose-600 dark:text-slate-300'}`}>
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /> Thích <span className="tabular-nums">{likeCount}</span>
            </button>
            <button type="button" onClick={() => setCommentsOpen((open) => !open)} aria-expanded={commentsOpen} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
              <MessageCircle className="h-5 w-5" /> Bình luận <span className="tabular-nums">{commentCount}</span>
            </button>
          </div>
          {canManage && isMine && <div className="flex items-center gap-1">
            <button type="button" onClick={() => onEdit?.(post)} title="Chỉnh sửa bài viết" aria-label="Chỉnh sửa bài viết" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
            <button type="button" onClick={() => onDelete?.(post)} title="Xóa bài viết" aria-label="Xóa bài viết" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
          </div>}
        </div>

        {actionError && <p role="alert" className="py-2 text-xs text-rose-600 dark:text-rose-300">{actionError}</p>}
        {friendError && <p role="alert" className="py-2 text-xs text-rose-600 dark:text-rose-300">{friendError}</p>}

        {commentsOpen && <section className="py-3" aria-label="Bình luận">
          {commentError && <p role="alert" className="mb-2 text-xs text-rose-600 dark:text-rose-300">{commentError}</p>}
          {commentsLoading ? <p className="py-3 text-center text-xs text-slate-500">Đang tải bình luận…</p> : comments.length === 0 ? <p className="py-3 text-center text-xs text-slate-500">Chưa có bình luận. Hãy bắt đầu trò chuyện nhé.</p> : (
            <div className="max-h-64 space-y-3 overflow-y-auto py-1">
              {comments.map((comment) => <div key={comment.id} className="flex items-start gap-2.5">
                <Avatar src={comment.author_avatar_url} name={comment.author_name} className="h-8 w-8 text-xs" />
                <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-extrabold text-slate-800 dark:text-white">{comment.author_name}</span>
                    {(Number(comment.author_id) === Number(user?.id) || isMine) && <button type="button" onClick={() => removeComment(comment)} title="Xóa bình luận" aria-label="Xóa bình luận" className="shrink-0 text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700 dark:text-slate-200">{comment.content}</p>
                </div>
              </div>)}
            </div>
          )}
          <form onSubmit={sendComment} className="mt-3 flex items-center gap-2">
            <Avatar src={user?.profile?.avatar_url || user?.avatar} name={user?.profile?.full_name || user?.email} className="h-8 w-8 text-xs" />
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Viết bình luận…" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
            <button type="submit" disabled={!commentText.trim() || isCommenting} aria-label="Gửi bình luận" className="rounded-full bg-emerald-600 p-2.5 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        </section>}
      </div>
    </article>
  );
}
