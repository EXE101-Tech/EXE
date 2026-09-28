import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatPanel from '../components/ChatPanel';
import { useChat } from '../context/ChatContext';
import './member-ui.css';

export default function NavbarLayout() {
  const { isChatOpen } = useChat();

  return (
    <div className="member-app-shell min-h-screen text-slate-900 dark:text-[#EAF2FF] relative z-50 w-full overflow-x-clip font-sans selection:bg-[#C7E84D]/30">
      <Navbar />
      <div className={`navbar-content relative transition-[margin] duration-300 ${isChatOpen ? 'chat-is-open' : ''}`}>
        <Outlet />
      </div>
      <ChatPanel />
    </div>
  );
}
