import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/api';

export default function useChatUnreadCount() {
  const { user } = useAuth();
  const [countState, setCountState] = useState({ userId: null, count: 0 });

  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;
    const loadCount = () => {
      // Don't poll if the tab is in background / minimized
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      chatService.getUnreadCount()
        .then((result) => { if (active) setCountState({ userId: user.id, count: result.unread_count || 0 }); })
        .catch(() => {});
    };

    loadCount();
    const timer = window.setInterval(loadCount, 15000);

    // Immediately fetch when the user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadCount();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  return user?.id && countState.userId === user.id ? countState.count : 0;
}
