import { useEffect, useState } from 'react';
import { Check, Clock3, LoaderCircle, Users, UserX, X } from 'lucide-react';
import { lfgService, resolveMediaUrl } from '../../../shared/services/api';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

export default function LfgParticipantsModal({ isOpen, post, onClose, onChanged }) {
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);
  const [error, setError] = useState('');
  const [countOverrides, setCountOverrides] = useState(null);
  const hasCountOverride = countOverrides !== null && countOverrides.postId === post?.id;
  const pendingCount = hasCountOverride ? countOverrides.pending : (post?.pending_participants_count || 0);
  const approvedCount = hasCountOverride ? countOverrides.approved : (post?.approved_participants_count || 0);

  useEffect(() => {
    if (!isOpen || !post?.id) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError('');
      lfgService.getParticipants(post.id, activeStatus)
        .then((items) => {
          if (active) setParticipants([...items].sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at) || a.id - b.id));
        })
        .catch((err) => { if (active) setError(err.message || 'Không tải được danh sách người chơi'); })
        .finally(() => { if (active) setIsLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isOpen, post?.id, activeStatus]);

  if (!isOpen || !post) return null;

  const moderate = async (participant, status) => {
    setActionUserId(participant.user_id);
    setError('');
    try {
      await lfgService.setParticipantStatus(post.id, participant.user_id, status);
      setParticipants((current) => current.filter((item) => item.user_id !== participant.user_id));
      if (activeStatus === 'PENDING') {
        setCountOverrides({ postId: post.id, pending: Math.max(0, pendingCount - 1), approved: status === 'APPROVED' ? approvedCount + 1 : approvedCount });
      } else {
        setCountOverrides({ postId: post.id, pending: pendingCount, approved: Math.max(0, approvedCount - 1) });
      }
      await onChanged?.();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái người chơi');
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1080] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="lfg-participants-title" className="flex max-h-[min(88vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#001F3F]">
        <header className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#74C365] to-[#589470] px-5 py-4 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-white/20 p-2"><Users className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 id="lfg-participants-title" className="font-black">Kiểm duyệt người tham gia</h2>
              <p className="mt-0.5 truncate text-sm text-white/85">{post.title}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full bg-black/10 p-2 hover:bg-black/20"><X className="h-5 w-5" /></button>
        </header>

        <div className="border-b border-slate-100 px-4 pt-3 dark:border-white/10">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="tablist" aria-label="Trạng thái người tham gia">
            {[
              { id: 'PENDING', label: 'Chờ duyệt', count: pendingCount },
              { id: 'APPROVED', label: 'Đã chấp nhận', count: approvedCount },
            ].map((tab) => (
              <button key={tab.id} type="button" role="tab" aria-selected={activeStatus === tab.id} onClick={() => setActiveStatus(tab.id)} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-bold transition ${activeStatus === tab.id ? 'bg-white text-[#589470] shadow-sm dark:bg-slate-800 dark:text-[#74C365]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'}`}>
                <span className="truncate">{tab.label}</span><span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-white/10">{tab.count || 0}</span>
              </button>
            ))}
          </div>
          {activeStatus === 'PENDING' && <p className="px-1 py-2 text-xs text-slate-500 dark:text-slate-400">Xếp theo thời gian gửi yêu cầu, người chờ lâu nhất ở trên.</p>}
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto p-4">
          {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải…</div>
          ) : participants.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{activeStatus === 'PENDING' ? 'Chưa có yêu cầu nào đang chờ.' : 'Chưa có người chơi được chấp nhận.'}</div>
          ) : (
            <ul className="space-y-2">
              {participants.map((participant, index) => (
                <li key={participant.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 font-black text-[#589470] dark:bg-emerald-400/15 dark:text-[#74C365]">
                    {participant.avatar_url ? <img src={resolveMediaUrl(participant.avatar_url)} alt="" className="h-full w-full object-cover" /> : participant.name?.charAt(0)?.toUpperCase() || '?' }
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{participant.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Clock3 className="h-3 w-3" /> {formatDate(participant.joined_at)}{activeStatus === 'PENDING' ? ` · #${index + 1}` : ''}</span>
                  </span>
                  {activeStatus === 'PENDING' ? (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button type="button" disabled={actionUserId !== null} onClick={() => moderate(participant, 'APPROVED')} title="Chấp nhận" aria-label={`Chấp nhận ${participant.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto sm:px-3">
                        {actionUserId === participant.user_id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 sm:mr-1" /><span className="hidden text-xs font-bold sm:inline">Chấp nhận</span></>}
                      </button>
                      <button type="button" disabled={actionUserId !== null} onClick={() => moderate(participant, 'REJECTED')} title="Loại bỏ" aria-label={`Loại bỏ ${participant.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-200 sm:w-auto sm:px-3">
                        <UserX className="h-4 w-4 sm:mr-1" /><span className="hidden text-xs font-bold sm:inline">Loại bỏ</span>
                      </button>
                    </span>
                  ) : (
                    <button type="button" disabled={actionUserId !== null} onClick={() => moderate(participant, 'REJECTED')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-200 sm:w-auto sm:px-3" title="Loại người chơi" aria-label={`Loại ${participant.name}`}>
                      <UserX className="h-4 w-4 sm:mr-1" /><span className="hidden text-xs font-bold sm:inline">Loại bỏ</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">Đóng</button>
        </footer>
      </section>
    </div>
  );
}
