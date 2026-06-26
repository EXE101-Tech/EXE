import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, Gamepad2, Calendar, MapPin, MessageSquare, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../context/ChatContext';

const NAV_ITEMS = [
  { id: 'home', labelKey: 'bottomNav.home', Icon: Home, path: '/' },
  { id: 'tournament', labelKey: 'bottomNav.tournament', Icon: Trophy, path: '/tournaments' },
  { id: 'gameroom', labelKey: 'bottomNav.gameroom', Icon: Gamepad2, path: '/matches' },
  { id: 'bookings', labelKey: 'bottomNav.bookings', Icon: Calendar, path: '/bookings' },
  { id: 'map', labelKey: 'bottomNav.map', Icon: MapPin, path: '/map' },
  { id: 'team', labelKey: 'bottomNav.team', Icon: Users, path: '/team' },
];

function NavButton({ id, label, Icon, active, onClick }) {
  return (
    <button
      key={id}
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-1 py-1"
    >
      <div
        className={`px-3 py-1.5 rounded-2xl transition-all duration-200 ${
          active
            ? 'bg-[#CDFF00] text-gray-950 scale-105 shadow-sm'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
      <span
        className={`text-[10px] font-medium tracking-wide transition-colors whitespace-nowrap ${
          active
            ? 'text-gray-950 dark:text-white font-semibold'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function BottomNavigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isChatOpen, toggleChat } = useChat();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="relative flex items-center justify-center h-16 w-full">
        {/* 5 nút điều hướng chính — gom gần nhau ở giữa */}
        <div className="flex items-center gap-8">
          {NAV_ITEMS.map(({ id, labelKey, Icon, path }) => (
            <NavButton
              key={id}
              id={id}
              label={t(labelKey)}
              Icon={Icon}
              active={location.pathname === path}
              onClick={() => navigate(path)}
            />
          ))}
        </div>

        {/* Nút Chat — nằm riêng biệt ở góc phải */}
        <div className="absolute right-4 md:right-6">
          <button
            onClick={toggleChat}
            className="flex flex-col items-center gap-1 py-1"
          >
            <div
              className={`px-3 py-1.5 rounded-2xl transition-all duration-200 ${
                isChatOpen
                  ? 'bg-[#CDFF00] text-gray-950 scale-105 shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <MessageSquare className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <span
              className={`text-[10px] font-medium tracking-wide transition-colors ${
                isChatOpen
                  ? 'text-gray-950 dark:text-white font-semibold'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t('bottomNav.chat')}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default BottomNavigation;
