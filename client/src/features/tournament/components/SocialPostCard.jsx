import { useEffect, useRef, useState } from 'react';
import { Heart, LoaderCircle, MessageCircle, Pencil, Send, Trash2, UserPlus, UserRoundCheck, X } from 'lucide-react';
import { chatService, resolveMediaUrl, socialPostService } from '../../../shared/services/api';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const COMMENT_REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Thích' },
  { key: 'love', emoji: '❤️', label: 'Yêu thích' },
  { key: 'laugh', emoji: '😂', label: 'Haha' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'sad', emoji: '😢', label: 'Buồn' },
  { key: 'angry', emoji: '😡', label: 'Phẫn nộ' },
];

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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [reactionPickerId, setReactionPickerId] = useState(null);
  const [reactionBusyId, setReactionBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [friendError, setFriendError] = useState('');
  const [friendBusy, setFriendBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const commentMutationVersionRef = useRef(0);

  const isMine = Number(post.author_id) === Number(user?.id);

  useEffect(() => {
    if (!commentsOpen) return undefined;
    let active = true;
    let requestInFlight = false;
    const refreshComments = async (initial = false) => {
      if (!active || requestInFlight || document.visibilityState === 'hidden') return;
      requestInFlight = true;
      const mutationVersion = commentMutationVersionRef.current;
      if (initial) setCommentsLoading(true);
      try {
        const items = await socialPostService.getComments(post.id);
        if (!active || mutationVersion !== commentMutationVersionRef.current) return;
        setComments((current) => {
          const unchanged = current.length === items.length && current.every((item, index) => (
            item.id === items[index]?.id
            && item.content === items[index]?.content
            && item.reply_count === items[index]?.reply_count
            && item.my_reaction === items[index]?.my_reaction
            && JSON.stringify(item.reaction_counts || {}) === JSON.stringify(items[index]?.reaction_counts || {})
          ));
          return unchanged ? current : items;
        });
        setCommentCount(items.length);
        setCommentError('');
      } catch (error) {
        if (active) setCommentError(error.message || 'Không tải được bình luận.');
      } finally {
        requestInFlight = false;
        if (initial && active) setCommentsLoading(false);
      }
    };
    const initialTimer = window.setTimeout(() => refreshComments(true), 0);
    const pollTimer = window.setInterval(() => refreshComments(), 1000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshComments();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
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
    commentMutationVersionRef.current += 1;
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
      commentMutationVersionRef.current += 1;
      await socialPostService.removeComment(post.id, comment.id);
      const removedIds = new Set([comment.id]);
      comments.forEach((item) => {
        if (Number(item.parent_id) === Number(comment.id)) removedIds.add(item.id);
      });
      setComments((current) => current.filter((item) => !removedIds.has(item.id)));
      setCommentCount((count) => Math.max(0, count - removedIds.size));
      if (editingCommentId === comment.id) setEditingCommentId(null);
      if (replyingToId === comment.id) setReplyingToId(null);
    } catch (error) {
      setCommentError(error.message || 'Không thể xóa bình luận.');
    }
  };

  const startEditingComment = (comment) => {
    setCommentError('');
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const saveCommentEdit = async (event, comment) => {
    event.preventDefault();
    const content = editingCommentText.trim();
    if (!content || isUpdatingComment) return;
    setIsUpdatingComment(true);
    setCommentError('');
    commentMutationVersionRef.current += 1;
    try {
      const updated = await socialPostService.updateComment(post.id, comment.id, content);
      setComments((current) => current.map((item) => item.id === comment.id ? updated : item));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      setCommentError(error.message || 'Không thể chỉnh sửa bình luận.');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const sendReply = async (event, parentComment) => {
    event.preventDefault();
    const content = replyText.trim();
    if (!content || isReplying) return;
    setIsReplying(true);
    setCommentError('');
    commentMutationVersionRef.current += 1;
    try {
      const reply = await socialPostService.addComment(post.id, content, parentComment.id);
      setComments((current) => [...current, reply]);
      setCommentCount((count) => count + 1);
      setReplyText('');
      setReplyingToId(null);
    } catch (error) {
      setCommentError(error.message || 'Không thể gửi trả lời.');
    } finally {
      setIsReplying(false);
    }
  };

  const setCommentReaction = async (comment, reactionKey) => {
    if (reactionBusyId === comment.id) return;
    setReactionBusyId(comment.id);
    setCommentError('');
    commentMutationVersionRef.current += 1;
    try {
      const result = comment.my_reaction === reactionKey
        ? await socialPostService.removeCommentReaction(post.id, comment.id)
        : await socialPostService.setCommentReaction(post.id, comment.id, reactionKey);
      setComments((current) => current.map((item) => item.id === comment.id
        ? { ...item, reaction_counts: result.reaction_counts, my_reaction: result.my_reaction }
        : item));
      setReactionPickerId(null);
    } catch (error) {
      setCommentError(error.message || 'Không thể cập nhật cảm xúc.');
    } finally {
      setReactionBusyId(null);
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

  const repliesByParent = new Map();
  comments.forEach((comment) => {
    if (comment.parent_id == null) return;
    const replies = repliesByParent.get(comment.parent_id) || [];
    replies.push(comment);
    repliesByParent.set(comment.parent_id, replies);
  });
  const rootComments = comments.filter((comment) => comment.parent_id == null);

  const renderComment = (comment, isReply = false) => {
    const isCommentAuthor = Number(comment.author_id) === Number(user?.id);
    const isEditing = editingCommentId === comment.id;
    const commentReactions = comment.reaction_counts || {};
    const selectedReaction = COMMENT_REACTIONS.find((reaction) => reaction.key === comment.my_reaction);
    const replies = repliesByParent.get(comment.id) || [];
    return <div key={comment.id} className={isReply ? 'ml-9 border-l border-slate-200 pl-3 dark:border-white/10' : ''}>
      <div className="flex items-start gap-2.5">
        <Avatar src={comment.author_avatar_url} name={comment.author_name} className={isReply ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'} />
        <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-extrabold text-slate-800 dark:text-white">{comment.author_name}</span>
            <div className="flex shrink-0 items-center gap-2">
              {isCommentAuthor && !isEditing && <button type="button" onClick={() => startEditingComment(comment)} title="Sửa bình luận" aria-label="Sửa bình luận" className="text-slate-400 hover:text-emerald-600"><Pencil className="h-3.5 w-3.5" /></button>}
              {(isCommentAuthor || isMine) && <button type="button" onClick={() => removeComment(comment)} title="Xóa bình luận" aria-label="Xóa bình luận" className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
          {isEditing ? <form onSubmit={(event) => saveCommentEdit(event, comment)} className="mt-2 flex items-end gap-2">
            <textarea autoFocus value={editingCommentText} onChange={(event) => setEditingCommentText(event.target.value)} maxLength={1000} rows={2} aria-label="Nội dung bình luận" className="min-w-0 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
            <button type="submit" disabled={!editingCommentText.trim() || isUpdatingComment} title="Lưu chỉnh sửa" aria-label="Lưu chỉnh sửa" className="rounded-full bg-emerald-600 p-2 text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
            <button type="button" disabled={isUpdatingComment} onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} title="Hủy chỉnh sửa" aria-label="Hủy chỉnh sửa" className="rounded-full bg-slate-200 p-2 text-slate-600 disabled:opacity-50 dark:bg-white/10 dark:text-slate-200"><X className="h-3.5 w-3.5" /></button>
          </form> : <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700 dark:text-slate-200">{comment.content}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {!isReply && <button type="button" onClick={() => { setReplyingToId((current) => current === comment.id ? null : comment.id); setReplyText(''); }} className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400">Trả lời{replies.length ? ` · ${replies.length}` : ''}</button>}
            <button type="button" disabled={reactionBusyId === comment.id} onClick={() => setReactionPickerId((current) => current === comment.id ? null : comment.id)} aria-label="Thả cảm xúc" className={`inline-flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50 ${selectedReaction ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400'}`}>
              <span>{selectedReaction?.emoji || '😊'}</span>{selectedReaction?.label || 'Cảm xúc'}
            </button>
            {COMMENT_REACTIONS.filter(({ key }) => commentReactions[key]).map((reaction) => <button key={reaction.key} type="button" disabled={reactionBusyId === comment.id} onClick={() => setCommentReaction(comment, reaction.key)} title={reaction.label} className={`rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] dark:bg-white/10 ${comment.my_reaction === reaction.key ? 'ring-1 ring-emerald-500' : ''}`}>
              {reaction.emoji} {commentReactions[reaction.key]}
            </button>)}
          </div>

          {reactionPickerId === comment.id && <div className="mt-2 flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-slate-800">
            {COMMENT_REACTIONS.map((reaction) => <button key={reaction.key} type="button" disabled={reactionBusyId === comment.id} onClick={() => setCommentReaction(comment, reaction.key)} title={reaction.label} aria-label={reaction.label} className="rounded-full p-1.5 text-base transition hover:scale-125 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10">{reaction.emoji}</button>)}
          </div>}

          {replyingToId === comment.id && <form onSubmit={(event) => sendReply(event, comment)} className="mt-2 flex items-center gap-2">
            <input autoFocus value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={1000} placeholder={`Trả lời ${comment.author_name}…`} className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
            <button type="submit" disabled={!replyText.trim() || isReplying} aria-label="Gửi trả lời" className="rounded-full bg-emerald-600 p-2 text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
          </form>}
        </div>
      </div>
      {!isReply && replies.map((reply) => renderComment(reply, true))}
    </div>;
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-slate-900/80">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className="rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 p-[2px]">
          <div className="rounded-full bg-white p-[2px] dark:bg-slate-900"><Avatar src={post.author_avatar_url} name={post.author_name} className="h-10 w-10" /></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{post.author_name}</p>
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
            <div className="max-h-80 space-y-3 overflow-y-auto py-1">
              {rootComments.map((comment) => renderComment(comment))}
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
