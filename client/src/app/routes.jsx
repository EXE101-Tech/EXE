import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/Login.jsx';
import Home from '../features/home/Home.jsx';
import Tournament from '../features/tournament/Tournament.jsx';
import GameRoom from '../features/gameroom/GameRoom.jsx';
import Bookings from '../features/bookings/Bookings.jsx';
import MapPage from '../features/map/Map.jsx';
import Team from '../features/team/Team.jsx';
import CourtDetailPage from '../features/courts/pages/CourtDetailPage.jsx';
import BottomNavigation from '../shared/components/BottomNavigation.jsx';
import ChatPanel from '../shared/components/ChatPanel.jsx';
import { ChatProvider, useChat } from '../shared/context/ChatContext.jsx';

function MainLayout({ children }) {
    const { isChatOpen } = useChat();
    return (
        <div className="flex min-h-screen">
            {/* Nội dung chính — co lại khi chat mở */}
            <div
                className="flex-1 transition-[margin-right] duration-300 ease-in-out"
                style={{ marginRight: isChatOpen ? '340px' : '0px' }}
            >
                {children}
            </div>

            {/* Panel Chat bên phải */}
            <ChatPanel />

            {/* Thanh điều hướng dưới */}
            <BottomNavigation />
        </div>
    );
}

function AppRoutes() {
    return (
        <BrowserRouter>
            <ChatProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Navigate to="/login" replace />} />
                    <Route path="/" element={<MainLayout><Home /></MainLayout>} />
                    <Route path="/tournaments" element={<MainLayout><Tournament /></MainLayout>} />
                    <Route path="/matches" element={<MainLayout><GameRoom /></MainLayout>} />
                    <Route path="/bookings" element={<MainLayout><Bookings /></MainLayout>} />
                    <Route path="/map" element={<MainLayout><MapPage /></MainLayout>} />
                    <Route path="/team" element={<MainLayout><Team /></MainLayout>} />
                    {/* Trang chi tiết sân — không có BottomNavigation */}
                    <Route path="/courts/:id" element={<CourtDetailPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ChatProvider>
        </BrowserRouter>
    );
}

export default AppRoutes;
