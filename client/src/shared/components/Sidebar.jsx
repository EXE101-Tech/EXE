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
    <aside className="w-[260px] h-[calc(100vh-32px)] fixed top-4 left-4 rounded-2xl glass-panel z-40 flex flex-col overflow-hidden">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6">
        <Link to="/home" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-sky-500 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors">SportGo</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-4 no-scrollbar flex flex-col gap-1">
        <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Menu</div>
        
        {NAV_ITEMS.map(({ id, labelKey, Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={id}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary font-bold shadow-sm' 
                  : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-gray-200 font-medium'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-primary text-white shadow-md' : ''}`}>
                <Icon className={`w-4 h-4 ${isActive ? '' : 'text-slate-400 dark:text-gray-500'}`} />
              </div>
              <span className="text-sm">{t(labelKey)}</span>
            </Link>
          );
        })}

        <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mt-8 mb-2">Preferences</div>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-gray-200 transition-all duration-300 font-medium">
          <div className="p-1.5 rounded-lg">
            <Settings className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          </div>
          <span className="text-sm">Settings</span>
        </Link>
        <Link to="/support" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-gray-200 transition-all duration-300 font-medium">
          <div className="p-1.5 rounded-lg">
            <HelpCircle className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          </div>
          <span className="text-sm">Support</span>
        </Link>
      </div>

      {/* Bottom Section */}
      <div className="p-4 mx-4 mb-4 mt-2 rounded-2xl bg-gradient-to-br from-brand-primary to-blue-600 relative overflow-hidden group shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/30 transition-colors"></div>
        <h4 className="text-sm font-bold text-white mb-1 relative z-10">Pro Upgrade</h4>
        <p className="text-xs text-white/80 mb-3 relative z-10">Check our pro features.</p>
        <button className="w-full bg-white text-brand-primary text-xs font-bold py-2 rounded-xl hover:bg-slate-50 transition-colors relative z-10 shadow-sm">
          Upgrade Now
        </button>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-black/5 dark:border-white/5 bg-transparent">
        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-gray-800 flex items-center justify-center font-bold text-slate-700 dark:text-white text-sm shrink-0 border border-slate-300 dark:border-white/10 shadow-sm">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
        </div>
        <button onClick={logout} className="p-2 text-slate-400 dark:text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10" title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
