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
import NavbarLayout from '../shared/layouts/NavbarLayout.jsx';
import Particles from '../features/landing/components/Particles.jsx';
import { useTheme } from '../shared/context/ThemeContext.jsx';
import { SportFilterProvider } from '../shared/context/SportFilterContext.jsx';

function GlobalWrapper({ children }) {
    const { toggleTheme } = useTheme();
    return (
        <div className="min-h-screen text-slate-900 dark:text-white overflow-x-hidden selection:bg-brand-primary/30 font-sans relative theme-transition">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <Particles />
            </div>
            
            <div className="relative z-10 h-full w-full">
                {children}
            </div>
        </div>
    );
}

function MainLayout({ children }) {
    const { isChatOpen } = useChat();
    return (
        <div className="flex h-screen overflow-hidden bg-transparent page-fade-in">
            {/* Sidebar (Desktop) */}
            <Sidebar />

            {/* Nội dung chính — margin left để tránh Sidebar */}
            <div
                className="flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out ml-[292px] relative"
                style={{ marginRight: isChatOpen ? '388px' : '0px' }}
            >
                <TopNavbar />
                
                <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>

                <ChatPanel />
            </div>
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
                <SportFilterProvider>
                    <GlobalWrapper>
                        <Routes>
                            <Route element={<PublicLayout />}>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Login defaultIsRegister={true} />} />
                                <Route path="/" element={<LandingPage />} />
                            </Route>
                            <Route element={<ProtectedRoute><NavbarLayout /></ProtectedRoute>}>
                                <Route path="/home" element={<Home />} />
                                <Route path="/tournaments" element={<Tournament />} />
                                <Route path="/matches" element={<GameRoom />} />
                                <Route path="/bookings" element={<Bookings />} />
                                <Route path="/team" element={<Team />} />
                                <Route path="/courts/:id" element={<CourtDetailPage />} />
                            </Route>
                            <Route path="/map" element={<ProtectedRoute><MainLayout><MapPage /></MainLayout></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/home" replace />} />
                        </Routes>
                    </GlobalWrapper>
                </SportFilterProvider>
            </ChatProvider>
        </BrowserRouter>
    );
}

export default AppRoutes;
