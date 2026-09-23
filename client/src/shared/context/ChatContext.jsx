import { createContext, useContext, useState } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingRecipient, setPendingRecipient] = useState(null);

  const openChat = (recipient) => {
    const user = recipient?.host || recipient?.author || recipient;
    const id = Number(user?.id || user?.user_id || user?.owner_id || user?.author_id);
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
