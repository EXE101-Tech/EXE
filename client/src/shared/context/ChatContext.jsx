import { createContext, useContext, useEffect, useState } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingRecipient, setPendingRecipient] = useState(null);

  useEffect(() => {
    if (!isChatOpen || !window.matchMedia('(max-width: 767px)').matches) return undefined;

    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const bodyOverscroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.overscrollBehavior = bodyOverscroll;
    };
  }, [isChatOpen]);

  const openChat = (recipient) => {
    const user = recipient?.host_user || recipient?.author || recipient?.host || recipient?.user || recipient?.owner || recipient;
    const id = Number(user?.user_id || user?.author_id || user?.owner_id || user?.host_id || user?.id);
    setPendingRecipient(Number.isInteger(id) && id > 0 ? {
      id,
      name: user.name || user.full_name || user.author_name || user.owner_name || 'Người chơi',
      avatar: user.avatar_url || user.avatar || '',
    } : null);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setPendingRecipient(null);
  };

  return (
    <ChatContext.Provider value={{
      isChatOpen,
      toggleChat: () => setIsChatOpen((open) => !open),
      openChat,
      closeChat,
      pendingRecipient,
      setPendingRecipient,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
