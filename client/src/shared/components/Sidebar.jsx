import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Gamepad2, Calendar, MapPin, Users, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { id: 'home', labelKey: 'bottomNav.home', Icon: Home, path: '/home' },
  { id: 'tournament', labelKey: 'bottomNav.tournament', Icon: Trophy, path: '/tournaments' },
  { id: 'gameroom', labelKey: 'bottomNav.gameroom', Icon: Gamepad2, path: '/matches' },
  { id: 'bookings', labelKey: 'bottomNav.bookings', Icon: Calendar, path: '/bookings' },
  { id: 'map', labelKey: 'bottomNav.map', Icon: MapPin, path: '/map' },
  { id: 'team', labelKey: 'bottomNav.team', Icon: Users, path: '/team' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <aside className="w-[280px] h-screen fixed top-0 left-0 border-r border-white/5 bg-gray-950/40 backdrop-blur-3xl z-40 flex flex-col transition-all">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-8 border-b border-white/5">
        <Link to="/home" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-primary to-indigo-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--theme-glow)] group-hover:scale-110 transition-transform">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-white group-hover:text-brand-primary transition-colors">SportGo</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar flex flex-col gap-1">
        <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Menu</div>
        
        {NAV_ITEMS.map(({ id, labelKey, Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={id}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/5 font-medium' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-brand-primary' : ''}`} />
              <span className="text-sm">{t(labelKey)}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_var(--theme-glow)]" />
              )}
            </Link>
          );
        })}

        <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-8 mb-2">Preferences</div>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all duration-300">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Settings</span>
        </Link>
        <Link to="/support" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all duration-300">
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm">Support</span>
        </Link>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5">
        {/* Used Space Widget (Example) */}
        <div className="glass-panel rounded-2xl p-4 mb-4 relative overflow-hidden group border border-white/5 hover:border-brand-primary/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand-primary/20 transition-colors"></div>
          <h4 className="text-sm font-bold text-white mb-1">Upcoming matches</h4>
          <p className="text-xs text-gray-400 mb-3">You have 2 bookings this week.</p>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-brand-primary to-indigo-500 w-[60%] h-full rounded-full"></div>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-white text-sm shrink-0 border border-white/10">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
          </div>
          <button onClick={logout} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
