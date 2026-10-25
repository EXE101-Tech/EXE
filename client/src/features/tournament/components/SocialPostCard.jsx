import { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Flag, Heart, LoaderCircle, MessageCircle, Pencil, Send, Trash2, UserPlus, UserRoundCheck, X } from 'lucide-react';
import { chatService, moderationService, resolveMediaUrl, socialPostService } from '../../../shared/services/api';
import ProfileLink from '../../../shared/components/ProfileLink';

const normalizeUtcTimestamp = (value) => {
  if (typeof value !== 'string' || !value) return value;
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
};

const formatDate = (value) => {
  const date = new Date(normalizeUtcTimestamp(value));
  if (Number.isNaN(date.getTime())) return '';

  const parts = Object.fromEntries(new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date).map(({ type, value: partValue }) => [type, partValue]));

  return `${parts.hour}:${parts.minute} | ${parts.day}/${parts.month}/${parts.year}`;
};

const COMMENT_REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Thích' },
  { key: 'love', emoji: '❤️', label: 'Yêu thích' },
  { key: 'laugh', emoji: '😂', label: 'Haha' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'sad', emoji: '😢', label: 'Buồn' },
  { key: 'angry', emoji: '😡', label: 'Phẫn nộ' },
];

const sortComments = (items) => [...items].sort((first, second) => (
  new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
  || String(first.id).localeCompare(String(second.id), undefined, { numeric: true })
));

function mergeRecentCommentPage(current, incoming, oldestRootId) {
  const pending = current.filter((item) => item.isPending);
  const older = oldestRootId == null
    ? []
    : current.filter((item) => Number(item.parent_id ?? item.id) < Number(oldestRootId));
  const byId = new Map();
  [...older, ...incoming, ...pending].forEach((item) => byId.set(String(item.id), item));
  return sortComments([...byId.values()]);
}

function upsertComment(current, comment, replaceId = null) {
  const filtered = current.filter((item) => (
    item.id !== replaceId && String(item.id) !== String(comment.id)
  ));
  return sortComments([...filtered, comment]);
}

function Avatar({ src, name, className = 'h-10 w-10' }) {
  return (
    <div className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-white`}>
      {src ? <img src={resolveMediaUrl(src)} alt="" className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

export default function SocialPostCard({ post, user, canManage = false, onEdit, onDelete, onRefresh, onMessage, onAcceptTerms, onMetricsChange }) {
  const [isLiking, setIsLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingOlderComments, setIsLoadingOlderComments] = useState(false);
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
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(Boolean(user?.community_guidelines_accepted));
  const liked = Boolean(post.liked_by_me);
  const likeCount = post.like_count || 0;
  const commentCount = post.comment_count || 0;
  const commentMutationVersionRef = useRef(0);
  const hasLoadedOlderCommentsRef = useRef(false);

  const isMine = Number(post.author_id) === Number(user?.id);

  const updatePostMetrics = useCallback((metrics) => onMetricsChange?.(post.id, metrics), [onMetricsChange, post.id]);

  const syncCommentCount = useCallback((count) => {
    const nextCount = Math.max(0, Number(count) || 0);
    updatePostMetrics({ comment_count: nextCount });
  }, [updatePostMetrics]);

  useEffect(() => {
    const handleConnectionStatus = (event) => setRealtimeConnected(Boolean(event.detail?.connected));
    window.addEventListener('sportgo:social-realtime-status', handleConnectionStatus);
    return () => window.removeEventListener('sportgo:social-realtime-status', handleConnectionStatus);
  }, []);

  useEffect(() => {
    const handleRealtimeEvent = (message) => {
      const event = message.detail;
      if (Number(event?.post_id) !== Number(post.id)) return;

      if (event.type === 'like_changed') {
        updatePostMetrics({
          like_count: event.like_count,
          ...(Number(event.actor_id) === Number(user?.id) ? { liked_by_me: event.liked } : {}),
        });
      } else if (event.type === 'comment_created') {
        if (commentsOpen && event.comment) {
          const incomingComment = {
            ...event.comment,
            my_reaction: Number(event.actor_id) === Number(user?.id) ? event.comment.my_reaction : null,
          };
          setComments((current) => {
            const ownPending = current.find((item) => (
              item.isPending
              && Number(item.author_id) === Number(incomingComment.author_id)
              && item.content === incomingComment.content
            ));
            return upsertComment(current, incomingComment, ownPending?.id ?? null);
          });
        }
        syncCommentCount(event.comment_count);
      } else if (event.type === 'comment_updated' && event.comment) {
        setComments((current) => current.map((item) => item.id === event.comment.id
          ? {
            ...event.comment,
            my_reaction: Number(event.actor_id) === Number(user?.id) ? event.comment.my_reaction : item.my_reaction,
          }
          : item));
      } else if (event.type === 'comment_deleted') {
        const deletedIds = new Set(event.comment_ids || []);
        setComments((current) => current.filter((item) => !deletedIds.has(item.id)));
        syncCommentCount(event.comment_count);
      } else if (event.type === 'comment_reaction_changed') {
        setComments((current) => current.map((item) => item.id === event.comment_id
          ? {
            ...item,
            reaction_counts: event.reaction_counts || {},
            my_reaction: Number(event.actor_id) === Number(user?.id) ? event.my_reaction : item.my_reaction,
          }
          : item));
      }
    };
    window.addEventListener('sportgo:social-realtime', handleRealtimeEvent);
    return () => window.removeEventListener('sportgo:social-realtime', handleRealtimeEvent);
  }, [commentsOpen, post.id, syncCommentCount, updatePostMetrics, user?.id]);

  const report = async (targetType, targetId) => {
    const reason = window.prompt('Lý do báo cáo:', 'Nội dung không phù hợp');
    if (!reason?.trim()) return;
    try {
      await moderationService.report({ target_type: targetType, target_id: targetId, reason: reason.trim() });
      setActionError('Đã gửi báo cáo cho quản trị viên.');
    } catch (error) { setActionError(error.message || 'Không thể gửi báo cáo.'); }
  };

  const blockAuthor = async () => {
    if (!window.confirm(`Chặn ${post.author_name}?`)) return;
    try { await moderationService.block(post.author_id); await onRefresh?.(); }
    catch (error) { setActionError(error.message || 'Không thể chặn người dùng.'); }
  };

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
        const page = await socialPostService.getCommentPage(post.id, { limit: 20 });
        if (!active || mutationVersion !== commentMutationVersionRef.current) return;
        setComments((current) => initial && current.length === 0
          ? page.items
          : mergeRecentCommentPage(current, page.items, page.oldest_root_id));
        syncCommentCount(page.total_count);
        if (!hasLoadedOlderCommentsRef.current && initial) setHasMoreComments(page.has_more);
        if (!isLiking) {
          updatePostMetrics({
            like_count: page.like_count,
            liked_by_me: page.liked_by_me,
          });
        }
        setCommentError('');
      } catch (error) {
        if (active) setCommentError(error.message || 'Không tải được bình luận.');
      } finally {
        requestInFlight = false;
        if (initial && active) setCommentsLoading(false);
      }
    };
    const initialTimer = window.setTimeout(() => refreshComments(true), 0);
    // Redis Pub/Sub is ephemeral; reconcile occasionally even while the socket is healthy.
    const pollTimer = window.setInterval(() => refreshComments(), realtimeConnected ? 60000 : 8000);
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
  }, [commentsOpen, post.id, isLiking, realtimeConnected, syncCommentCount, updatePostMetrics]);

  const loadOlderComments = async () => {
    if (isLoadingOlderComments) return;
    const oldestRoot = comments
      .filter((item) => item.parent_id == null && Number.isFinite(Number(item.id)))
      .reduce((oldest, item) => (!oldest || Number(item.id) < Number(oldest.id) ? item : oldest), null);
    if (!oldestRoot) return;
    setIsLoadingOlderComments(true);
    try {
      const page = await socialPostService.getCommentPage(post.id, { before_id: oldestRoot.id, limit: 20 });
      setComments((current) => {
        const byId = new Map(current.map((item) => [String(item.id), item]));
        page.items.forEach((item) => byId.set(String(item.id), item));
        return sortComments([...byId.values()]);
      });
      setHasMoreComments(page.has_more);
      hasLoadedOlderCommentsRef.current = true;
    } catch (error) {
      setCommentError(error.message || 'Không tải được bình luận cũ hơn.');
    } finally {
      setIsLoadingOlderComments(false);
    }
  };

  const toggleLike = async () => {
    if (isLiking) return;
    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !liked;
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    updatePostMetrics({ liked_by_me: nextLiked, like_count: nextCount });
    setIsLiking(true);
    setActionError('');
    try {
      const result = nextLiked ? await socialPostService.like(post.id) : await socialPostService.unlike(post.id);
      updatePostMetrics({ liked_by_me: result.liked, like_count: result.like_count });
    } catch (error) {
      updatePostMetrics({ liked_by_me: previousLiked, like_count: previousCount });
      setActionError(error.message || 'Không thể cập nhật lượt thích.');
    } finally {
      setIsLiking(false);
    }
  };

  const sendComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim() || isCommenting || isReplying) return;
    if (!user?.community_guidelines_accepted && !acceptedGuidelines) {
      setCommentError('Vui lòng xác nhận bạn đồng ý tuân thủ quy tắc cộng đồng trước khi bình luận.');
      return;
    }
    setIsCommenting(true);
    setCommentError('');
    commentMutationVersionRef.current += 1;
    const content = commentText.trim();
    const previousCount = commentCount;
    let optimisticComment = null;
    try {
      if (!user?.community_guidelines_accepted) await onAcceptTerms?.();
      optimisticComment = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        post_id: post.id,
        author_id: user?.id,
        parent_id: null,
        author_name: user?.profile?.full_name || user?.name || user?.email || 'Bạn',
        author_avatar_url: user?.profile?.avatar_url || user?.avatar || null,
        content,
        created_at: new Date().toISOString(),
        reply_count: 0,
        reaction_counts: {},
        my_reaction: null,
        isPending: true,
      };
      setComments((current) => upsertComment(current, optimisticComment));
      setCommentText('');
      syncCommentCount(previousCount + 1);
      const comment = await socialPostService.addComment(post.id, content);
      setComments((current) => upsertComment(current, comment, optimisticComment.id));
    } catch (error) {
      if (optimisticComment) {
        setComments((current) => current.filter((item) => item.id !== optimisticComment.id));
        syncCommentCount(previousCount);
        setCommentText(content);
      }
      setCommentError(error.message || 'Không thể gửi bình luận.');
    } finally {
      setIsCommenting(false);
    }
  };

  const removeComment = async (comment) => {
    const previousComments = comments;
    const previousCount = commentCount;
    const removedIds = new Set([comment.id]);
    comments.forEach((item) => {
      if (Number(item.parent_id) === Number(comment.id)) removedIds.add(item.id);
    });
    setComments((current) => current.filter((item) => !removedIds.has(item.id)));
    syncCommentCount(previousCount - removedIds.size);
    commentMutationVersionRef.current += 1;
    try {
      await socialPostService.removeComment(post.id, comment.id);
      if (editingCommentId === comment.id) setEditingCommentId(null);
      if (replyingToId === comment.id) setReplyingToId(null);
    } catch (error) {
      setComments(previousComments);
      syncCommentCount(previousCount);
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
    const previousContent = comment.content;
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, content } : item));
    setEditingCommentId(null);
    setEditingCommentText('');
    try {
      const updated = await socialPostService.updateComment(post.id, comment.id, content);
      setComments((current) => current.map((item) => item.id === comment.id ? updated : item));
    } catch (error) {
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, content: previousContent } : item));
      setEditingCommentId(comment.id);
      setEditingCommentText(content);
      setCommentError(error.message || 'Không thể chỉnh sửa bình luận.');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const sendReply = async (event, parentComment) => {
    event.preventDefault();
    const content = replyText.trim();
    if (!content || isReplying || isCommenting) return;
    if (!user?.community_guidelines_accepted && !acceptedGuidelines) {
      setCommentError('Vui lòng xác nhận bạn đồng ý tuân thủ quy tắc cộng đồng trước khi trả lời.');
      return;
    }
    setIsReplying(true);
    setCommentError('');
    commentMutationVersionRef.current += 1;
    const previousCount = commentCount;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let optimisticReply = null;
    try {
      if (!user?.community_guidelines_accepted) await onAcceptTerms?.();
      optimisticReply = {
        id: tempId,
        post_id: post.id,
        author_id: user?.id,
        parent_id: parentComment.parent_id ?? parentComment.id,
        author_name: user?.profile?.full_name || user?.name || user?.email || 'Bạn',
        author_avatar_url: user?.profile?.avatar_url || user?.avatar || null,
        content,
        created_at: new Date().toISOString(),
        reply_count: 0,
        reaction_counts: {},
        my_reaction: null,
        isPending: true,
      };
      setComments((current) => upsertComment(current, optimisticReply));
      syncCommentCount(previousCount + 1);
      const reply = await socialPostService.addComment(post.id, content, parentComment.id);
      setComments((current) => upsertComment(current, reply, tempId));
      setReplyText('');
      setReplyingToId(null);
    } catch (error) {
      if (optimisticReply) {
        setComments((current) => current.filter((item) => item.id !== tempId));
        syncCommentCount(previousCount);
      }
      setCommentError(error.message || 'Không thể gửi trả lời.');
    } finally {
      setIsReplying(false);
    }
  };

  const setCommentReaction = async (comment, reactionKey) => {
    if (reactionBusyId === comment.id) return;
    const previousReaction = comment.my_reaction;
    const nextReaction = previousReaction === reactionKey ? null : reactionKey;
    const nextCounts = { ...(comment.reaction_counts || {}) };
    if (previousReaction) {
      nextCounts[previousReaction] = Math.max(0, (nextCounts[previousReaction] || 0) - 1);
      if (!nextCounts[previousReaction]) delete nextCounts[previousReaction];
    }
    if (nextReaction) nextCounts[nextReaction] = (nextCounts[nextReaction] || 0) + 1;
    const previousComment = comment;
    setComments((current) => current.map((item) => item.id === comment.id
      ? { ...item, my_reaction: nextReaction, reaction_counts: nextCounts }
      : item));
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
      setComments((current) => current.map((item) => item.id === comment.id ? previousComment : item));
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
    return <div key={comment.id} className={isReply ? 'ml-9 mt-3 border-l border-slate-200 pl-3 dark:border-white/10' : ''}>
      <div className="flex items-start gap-2.5">
        <ProfileLink userId={comment.author_id} name={comment.author_name} className="shrink-0 rounded-full"><Avatar src={comment.author_avatar_url} name={comment.author_name} className={isReply ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'} /></ProfileLink>
        <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <ProfileLink userId={comment.author_id} name={comment.author_name} className="min-w-0 truncate"><span className="truncate text-xs font-extrabold text-slate-800 dark:text-white">{comment.author_name}</span></ProfileLink>
            <div className="flex shrink-0 items-center gap-2">
              {isCommentAuthor && !isEditing && <button type="button" onClick={() => startEditingComment(comment)} title="Sửa bình luận" aria-label="Sửa bình luận" className="text-slate-400 hover:text-emerald-600"><Pencil className="h-3.5 w-3.5" /></button>}
              {(isCommentAuthor || isMine) && <button type="button" onClick={() => removeComment(comment)} title="Xóa bình luận" aria-label="Xóa bình luận" className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>}
              {!isCommentAuthor && <button type="button" onClick={() => report('comment', comment.id)} title="Báo cáo bình luận" aria-label="Báo cáo bình luận" className="text-slate-400 hover:text-amber-600"><Flag className="h-3.5 w-3.5" /></button>}
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
              {selectedReaction && <span>{selectedReaction.emoji}</span>}{selectedReaction?.label || 'Cảm xúc'}
            </button>
            {COMMENT_REACTIONS.filter(({ key }) => commentReactions[key]).map((reaction) => <button key={reaction.key} type="button" disabled={reactionBusyId === comment.id} onClick={() => setCommentReaction(comment, reaction.key)} title={reaction.label} className={`rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] dark:bg-white/10 ${comment.my_reaction === reaction.key ? 'ring-1 ring-emerald-500' : ''}`}>
              {reaction.emoji} {commentReactions[reaction.key]}
            </button>)}
          </div>

          {reactionPickerId === comment.id && <div className="mt-2 flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-slate-800">
            {COMMENT_REACTIONS.map((reaction) => <button key={reaction.key} type="button" disabled={reactionBusyId === comment.id} onClick={() => setCommentReaction(comment, reaction.key)} title={reaction.label} aria-label={reaction.label} className="rounded-full p-1.5 text-base transition hover:scale-125 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10">{reaction.emoji}</button>)}
          </div>}

          {replyingToId === comment.id && <form onSubmit={(event) => sendReply(event, comment)} className="mt-3 flex w-full min-w-0 items-center gap-2">
            <input autoFocus value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={1000} placeholder={`Trả lời ${comment.author_name}…`} className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
            <button type="submit" disabled={!replyText.trim() || isReplying || isCommenting} aria-label="Gửi trả lời" className="shrink-0 rounded-full bg-emerald-600 p-2 text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
          </form>}
        </div>
      </div>
      {!isReply && replies.map((reply) => renderComment(reply, true))}
    </div>;
  };

  return (
    <article className="sg-panel sg-post-card overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-slate-900/80">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className={`rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 p-[2px] ${post.author_is_premium ? 'sg-premium-avatar-shell' : ''}`}>
          <ProfileLink userId={post.author_id} name={post.author_name} className="block rounded-full bg-white p-[2px] dark:bg-slate-900"><Avatar src={post.author_avatar_url} name={post.author_name} className="h-10 w-10" /></ProfileLink>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-extrabold text-slate-900 dark:text-white ${post.author_is_premium ? 'sg-premium-name' : ''}`}><ProfileLink userId={post.author_id} name={post.author_name} className="max-w-full truncate">{post.author_name}</ProfileLink></p>
          <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={normalizeUtcTimestamp(post.created_at)}>{formatDate(post.created_at)}</time>
        </div>
        {!isMine && <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => report('post', post.id)} title="Báo cáo bài viết" aria-label="Báo cáo bài viết" className="rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-400/10"><Flag className="h-4 w-4" /></button><button type="button" onClick={blockAuthor} title="Chặn người dùng" aria-label="Chặn người dùng" className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10"><Ban className="h-4 w-4" /></button><button type="button" onClick={connectOrMessage} disabled={friendBusy || post.friendship_status === 'outgoing'} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-default disabled:opacity-65 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200">
          {friendBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : post.friendship_status === 'accepted' ? <MessageCircle className="h-4 w-4" /> : post.friendship_status === 'outgoing' ? <UserRoundCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          <span className="hidden sm:inline">{friendshipLabel}</span>
        </button></div>}
      </header>

      {post.content && <p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-6 text-slate-800 dark:text-slate-100 sm:px-5">{post.content}</p>}

      {mediaUrl && (post.media_type === 'video' ? (
        <video src={mediaUrl} controls playsInline preload="metadata" className="max-h-[min(75vh,720px)] w-full bg-black object-contain" />
      ) : (
        <img src={mediaUrl} alt={`Ảnh trong bài viết của ${post.author_name}`} loading="lazy" className="sg-post-media max-h-[min(75vh,720px)] w-full bg-slate-50 object-contain dark:bg-black/20" />
      ))}

      <div className="px-4 sm:px-5">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <button type="button" onClick={toggleLike} disabled={isLiking} aria-pressed={liked} className={`inline-flex items-center gap-2 text-sm font-bold transition ${liked ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 hover:text-rose-600 dark:text-slate-300'}`}>
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /> Thích <span className="tabular-nums">{likeCount}</span>
            </button>
            <button type="button" onClick={() => setCommentsOpen((open) => !open)} aria-expanded={commentsOpen} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
              <MessageCircle className="h-5 w-5" /> Bình luận <span className="tabular-nums">{commentCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
          {canManage && isMine && <>
            <button type="button" onClick={() => onEdit?.(post)} title="Chỉnh sửa bài viết" aria-label="Chỉnh sửa bài viết" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
            <button type="button" onClick={() => onDelete?.(post)} title="Xóa bài viết" aria-label="Xóa bài viết" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
          </>}
          </div>
        </div>

        {actionError && <p role="alert" className="py-2 text-xs text-rose-600 dark:text-rose-300">{actionError}</p>}
        {friendError && <p role="alert" className="py-2 text-xs text-rose-600 dark:text-rose-300">{friendError}</p>}

        {commentsOpen && <section className="py-3" aria-label="Bình luận">
          {commentError && <p role="alert" className="mb-2 text-xs text-rose-600 dark:text-rose-300">{commentError}</p>}
          {commentsLoading ? <p className="py-3 text-center text-xs text-slate-500">Đang tải bình luận…</p> : comments.length === 0 ? <p className="py-3 text-center text-xs text-slate-500">Chưa có bình luận. Hãy bắt đầu trò chuyện nhé.</p> : (
            <div className="max-h-80 space-y-3 overflow-y-auto py-1">
              {hasMoreComments && <button type="button" onClick={loadOlderComments} disabled={isLoadingOlderComments} className="w-full py-2 text-center text-xs font-semibold text-emerald-700 disabled:opacity-50 dark:text-emerald-300">
                {isLoadingOlderComments ? 'Đang tải…' : 'Tải bình luận cũ hơn'}
              </button>}
              {rootComments.map((comment) => renderComment(comment))}
            </div>
          )}
          {!user?.community_guidelines_accepted && <label className="mb-2 flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400"><input type="checkbox" checked={acceptedGuidelines} onChange={(event) => setAcceptedGuidelines(event.target.checked)} className="mt-1 accent-emerald-600" /><span>Tôi đồng ý tuân thủ quy tắc cộng đồng SportGo.</span></label>}
          <form onSubmit={sendComment} className="mt-3 flex items-center gap-2">
            <Avatar src={user?.profile?.avatar_url || user?.avatar} name={user?.profile?.full_name || user?.email} className="h-8 w-8 text-xs" />
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Viết bình luận…" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
            <button type="submit" disabled={!commentText.trim() || isCommenting || isReplying} aria-label="Gửi bình luận" className="rounded-full bg-emerald-600 p-2.5 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        </section>}
      </div>
    </article>
  );
}
