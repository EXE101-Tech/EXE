import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatPanel from '../components/ChatPanel';
import { useChat } from '../context/ChatContext';

export default function NavbarLayout() {
  const { isChatOpen } = useChat();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1220] text-slate-900 dark:text-[#EAF2FF] relative z-50 w-full overflow-x-clip font-sans transition-colors duration-500 selection:bg-[#65E6A0]/30 flex flex-col">
      <Navbar />
      <div 
        className={`navbar-content flex-1 pt-[104px] sm:pt-[124px] transition-[margin,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative ${isChatOpen ? 'md:mr-[384px]' : 'md:mr-0'}`}
      >
        <Outlet />
      </div>
      <ChatPanel />
    </div>
  );
}
