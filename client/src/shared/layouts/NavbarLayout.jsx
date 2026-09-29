import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatPanel from '../components/ChatPanel';
import { useChat } from '../context/ChatContext';

export default function NavbarLayout() {
  const { isChatOpen } = useChat();

  return (
    <div className="member-app-shell sg-app min-h-screen relative z-50 w-full overflow-x-clip flex flex-col">
      <Navbar />
      <div 
        className={`sg-page navbar-content flex-1 transition-[margin] duration-300 relative ${isChatOpen ? 'md:mr-[384px]' : 'md:mr-0'}`}
      >
        <Outlet />
      </div>
      <ChatPanel />
    </div>
  );
}
