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
import Sidebar from '../shared/components/Sidebar.jsx';
import TopNavbar from '../shared/components/TopNavbar.jsx';
import ChatPanel from '../shared/components/ChatPanel.jsx';
import { ChatProvider, useChat } from '../shared/context/ChatContext.jsx';
import LandingPage from '../features/landing/Landing.jsx';
import PublicLayout from '../shared/layouts/PublicLayout.jsx';
import Particles from '../features/landing/components/Particles.jsx';
import { useTheme } from '../shared/context/ThemeContext.jsx';
import { Palette } from 'lucide-react';

function GlobalWrapper({ children }) {
    const { toggleTheme } = useTheme();
    return (
        <div className="min-h-screen text-white overflow-x-hidden selection:bg-brand-primary/30 font-sans relative theme-transition">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <Particles />
            </div>
            
            <div className="relative z-10 h-full w-full">
                {children}
            </div>

            {/* Floating Theme Toggle (Global) */}
            <button 
                onClick={toggleTheme}
                className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full glass-panel flex items-center justify-center text-white hover:scale-110 transition-transform group shadow-[0_0_15px_var(--theme-glow)]"
                title="Toggle Theme"
            >
                <Palette className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
            </button>
        </div>
    );
}

function MainLayout({ children }) {
    const { isChatOpen } = useChat();
    return (
        <div className="flex min-h-screen bg-transparent page-fade-in">
            {/* Sidebar (Desktop) */}
            <Sidebar />

            {/* Nội dung chính — margin left để tránh Sidebar, co lại khi chat mở */}
            <div
                className="flex-1 flex flex-col transition-all duration-300 ease-in-out ml-[280px]"
                style={{ marginRight: isChatOpen ? '340px' : '0px' }}
            >
                <TopNavbar />
                
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>

            {/* Panel Chat bên phải */}
            <ChatPanel />
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
                <GlobalWrapper>
                    <Routes>
                        <Route element={<PublicLayout />}>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Login defaultIsRegister={true} />} />
                            <Route path="/" element={<LandingPage />} />
                        </Route>
                        <Route path="/home" element={<ProtectedRoute><MainLayout><Home /></MainLayout></ProtectedRoute>} />
                        <Route path="/tournaments" element={<ProtectedRoute><MainLayout><Tournament /></MainLayout></ProtectedRoute>} />
                        <Route path="/matches" element={<ProtectedRoute><MainLayout><GameRoom /></MainLayout></ProtectedRoute>} />
                        <Route path="/bookings" element={<ProtectedRoute><MainLayout><Bookings /></MainLayout></ProtectedRoute>} />
                        <Route path="/map" element={<ProtectedRoute><MainLayout><MapPage /></MainLayout></ProtectedRoute>} />
                        <Route path="/team" element={<ProtectedRoute><MainLayout><Team /></MainLayout></ProtectedRoute>} />
                        {/* Trang chi tiết sân — không có BottomNavigation */}
                        <Route path="/courts/:id" element={<ProtectedRoute><CourtDetailPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/home" replace />} />
                    </Routes>
                </GlobalWrapper>
            </ChatProvider>
        </BrowserRouter>
    );
}

export default AppRoutes;
