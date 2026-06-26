import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
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

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
                <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Đang kiểm tra phiên đăng nhập...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function AppRoutes() {
    return (
        <BrowserRouter>
            <ChatProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Navigate to="/login" replace />} />
                    <Route path="/" element={<ProtectedRoute><MainLayout><Home /></MainLayout></ProtectedRoute>} />
                    <Route path="/tournaments" element={<ProtectedRoute><MainLayout><Tournament /></MainLayout></ProtectedRoute>} />
                    <Route path="/matches" element={<ProtectedRoute><MainLayout><GameRoom /></MainLayout></ProtectedRoute>} />
                    <Route path="/bookings" element={<ProtectedRoute><MainLayout><Bookings /></MainLayout></ProtectedRoute>} />
                    <Route path="/map" element={<ProtectedRoute><MainLayout><MapPage /></MainLayout></ProtectedRoute>} />
                    <Route path="/team" element={<ProtectedRoute><MainLayout><Team /></MainLayout></ProtectedRoute>} />
                    {/* Trang chi tiết sân — không có BottomNavigation */}
                    <Route path="/courts/:id" element={<ProtectedRoute><CourtDetailPage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ChatProvider>
        </BrowserRouter>
    );
}

export default AppRoutes;
