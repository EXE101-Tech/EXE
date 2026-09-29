import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatPanel from '../components/ChatPanel';

export default function NavbarLayout() {
  return (
    <div className="member-app-shell sg-app min-h-screen relative z-50 w-full overflow-x-clip flex flex-col">
      <Navbar />
      <div className="sg-page navbar-content flex-1 relative">
        <Outlet />
      </div>
      <ChatPanel />
    </div>
  );
}
