import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatPanel from '../components/ChatPanel';
import { useChat } from '../context/ChatContext';

export default function NavbarLayout() {
  const { isChatOpen } = useChat();

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative z-50 w-full overflow-x-clip font-sans transition-colors duration-500 selection:bg-[#589470]/30 flex flex-col">
      <Navbar />
      <div 
        className="flex-1 pt-[104px] sm:pt-[124px] transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative"
        style={{ marginRight: isChatOpen ? '384px' : '0px' }}
      >
        <Outlet />
      </div>
      <ChatPanel />
    </div>
  );
}
