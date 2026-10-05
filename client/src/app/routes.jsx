import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import Login from '../features/auth/Login.jsx';
import OnboardingPage from '../features/auth/OnboardingPage.jsx';
import Home from '../features/home/Home.jsx';
import SocialFeed from '../features/tournament/SocialFeed.jsx';
import GameRoom from '../features/gameroom/GameRoom.jsx';
import Team from '../features/team/Team.jsx';
import TeamDetailPage from '../features/team/TeamDetailPage.jsx';
import { ChatProvider } from '../shared/context/ChatContext.jsx';
import LandingPage from '../features/landing/Landing.jsx';
import PublicLayout from '../shared/layouts/PublicLayout.jsx';
import NavbarLayout from '../shared/layouts/NavbarLayout.jsx';
import PremiumPage from '../features/premium/PremiumPage.jsx';
import AdminDashboard from '../features/admin/AdminDashboard.jsx';
import PrivacyPolicyPage from '../features/legal/PrivacyPolicyPage.jsx';
import AccountDeletionPage from '../features/legal/AccountDeletionPage.jsx';
import { SportFilterProvider } from '../shared/context/SportFilterContext.jsx';

function GlobalWrapper({ children }) {
    return (
        <div className="min-h-screen text-slate-900 dark:text-white overflow-x-clip selection:bg-brand-primary/30 font-sans relative theme-transition">
            <div className="relative z-10 h-full w-full">
                {children}
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

function MemberLayout() {
    const { user } = useAuth();
    if (user?.isAdmin) return <Navigate to="/admin" replace />;
    if (user && localStorage.getItem('sportgo-onboarding-pending') === String(user.id)) return <Navigate to="/onboarding" replace />;
    return <NavbarLayout />;
}

function AdminRoute({ children }) {
    const { user } = useAuth();
    if (!user?.isAdmin) return <Navigate to="/home" replace />;
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
                                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                                <Route path="/account-deletion" element={<AccountDeletionPage />} />
                            </Route>
                            <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
                            <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                            <Route element={<ProtectedRoute><MemberLayout /></ProtectedRoute>}>
                                <Route path="/home" element={<Home />} />
                                <Route path="/tournaments" element={<SocialFeed />} />
                                <Route path="/matches" element={<GameRoom />} />
                                <Route path="/team" element={<Team />} />
                                <Route path="/team/:id" element={<TeamDetailPage />} />
                                <Route path="/premium" element={<PremiumPage />} />
                                <Route path="/bookings" element={<Navigate to="/home" replace />} />
                                <Route path="/bookings/*" element={<Navigate to="/home" replace />} />
                                <Route path="/my-bookings" element={<Navigate to="/home" replace />} />
                                <Route path="/courts/:id" element={<Navigate to="/home" replace />} />
                            </Route>
                            <Route path="/map" element={<Navigate to="/home" replace />} />
                            <Route path="*" element={<Navigate to="/home" replace />} />
                        </Routes>
                    </GlobalWrapper>
                </SportFilterProvider>
            </ChatProvider>
        </BrowserRouter>
    );
}

export default AppRoutes;
