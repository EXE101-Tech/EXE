import { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);

  const toggleChat = () => setIsChatOpen((prev) => !prev);
  const openChat = (userOrName) => {
    if (userOrName) {
      if (typeof userOrName === 'string') {
        setActiveChatUser({
          id: Date.now(),
          name: userOrName,
          avatar: userOrName.charAt(0).toUpperCase(),
          lastMessage: 'Xin chào! Mình muốn hỏi về thông tin sân / kèo chơi của bạn.',
          time: 'Vừa xong',
          unread: 0,
          online: true,
        });
      } else if (typeof userOrName === 'object') {
        const name = userOrName.name || userOrName.authorName || userOrName.host?.name || 'Trưởng nhóm';
        setActiveChatUser({
          id: userOrName.id || Date.now(),
          name: name,
          avatar: name.charAt(0).toUpperCase(),
          lastMessage: 'Xin chào! Mình muốn giao lưu cùng nhóm của bạn.',
          time: 'Vừa xong',
          unread: 0,
          online: true,
        });
      }
    }
    setIsChatOpen(true);
  };
  const closeChat = () => setIsChatOpen(false);

  const startChat = (user) => {
    openChat(user);
  };

  return (
    <ChatContext.Provider value={{ 
      isChatOpen, toggleChat, openChat, closeChat,
      activeChatUser, setActiveChatUser, startChat 
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
