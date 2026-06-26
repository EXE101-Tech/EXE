import { createContext, useContext, useState, useEffect, useRef } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/api/chat/ws';
      ws.current = new WebSocket(`${wsUrl}/${token}`);
      
      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setMessages(prev => [...prev, msg]);
        } catch (error) {
          console.error("Error parsing websocket message", error);
        }
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed");
      };
    }
    
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const sendMessage = (receiverId, text) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ receiver_id: receiverId, text }));
    }
  };

  const toggleChat = () => setIsChatOpen((prev) => !prev);
  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  const startChat = (user) => {
    setActiveChatUser(user);
    setIsChatOpen(true);
  };

  return (
    <ChatContext.Provider value={{ 
      isChatOpen, toggleChat, openChat, closeChat,
      activeChatUser, setActiveChatUser, startChat,
      messages, setMessages, sendMessage
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
