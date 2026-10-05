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
      chatService.getUnreadCount()
        .then((result) => { if (active) setCountState({ userId: user.id, count: result.unread_count || 0 }); })
        .catch(() => {});
    };
    loadCount();
    const timer = window.setInterval(loadCount, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.id]);

  return user?.id && countState.userId === user.id ? countState.count : 0;
}
