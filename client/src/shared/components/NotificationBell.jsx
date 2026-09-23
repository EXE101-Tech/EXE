import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { notificationService } from '../services/api';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

export default function NotificationBell({ className = '' }) {
  const { user } = useAuth();
  const { openChat } = useChat();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;
    const load = async () => {
      try {
        const result = await notificationService.getAll();
        if (active) {
          setNotifications(result.items || []);
          setUnreadCount(result.unread_count || 0);
          setLoadedUserId(user.id);
        }
      } catch {
        // Keep the existing badge/list visible during temporary API failures.
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const hasUserData = user?.id && loadedUserId === user.id;
  const visibleNotifications = hasUserData ? notifications : [];
  const visibleUnreadCount = hasUserData ? unreadCount : 0;

  const handleOpenNotification = async (item) => {
    if (!item.is_read) {
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
      setUnreadCount((current) => Math.max(0, current - 1));
      notificationService.markRead(item.id).catch(() => {});
    }
    setIsOpen(false);
    if (item.type === 'chat_message') {
      openChat(item.actor?.id ? item.actor : undefined);
      return;
    }
    if (item.type.startsWith('friend_')) {
      openChat();
      return;
    }
    if (item.target_url) navigate(item.target_url);
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      await notificationService.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // The next poll will restore the server's authoritative state.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={className}
        title="Thông báo"
        aria-label={`Thông báo${visibleUnreadCount ? `, ${visibleUnreadCount} chưa đọc` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
        {visibleUnreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-[#589470] sm:-right-1 sm:-top-1 sm:min-h-[18px] sm:min-w-[18px] sm:text-[10px]">
            {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="absolute right-0 top-full z-[1200] mt-3 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" aria-label="Danh sách thông báo">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div>
              <h2 className="font-black">Thông báo</h2>
              {visibleUnreadCount > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{visibleUnreadCount} thông báo chưa đọc</p>}
            </div>
            {visibleUnreadCount > 0 && (
              <button type="button" disabled={isLoading} onClick={handleMarkAllRead} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#589470] hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-white/10">
                <CheckCheck className="h-4 w-4" /> Đọc tất cả
              </button>
            )}
          </header>
          <div className="max-h-[min(65vh,440px)] overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Chưa có thông báo nào.</p>
            ) : visibleNotifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenNotification(item)}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${item.is_read ? '' : 'bg-emerald-50/70 dark:bg-emerald-400/5'}`}
              >
                <span className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-transparent' : 'bg-[#589470]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{item.title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-slate-600 dark:text-slate-300">{item.body}</span>
                    <span className="mt-1.5 block text-[11px] text-slate-400">{formatDate(item.created_at)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
