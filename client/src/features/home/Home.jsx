import { useState, useEffect } from 'react';
import { Trophy, Activity, Users, Calendar, ArrowUpRight, ArrowDownRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/context/AuthContext';



const CATEGORIES = [
  { id: 'badminton', name: 'Badminton', emoji: '🏸' },
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'volleyball', name: 'Volleyball', emoji: '🏐' },
];

function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('football');
  const [activeTab, setActiveTab] = useState('post');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={`transition-all duration-700 ease-out pb-10 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      
      {/* ── Sports Category Bar ── */}
      <div className="w-full overflow-x-auto scrollbar-hide mb-8 py-2">
        <div className="flex items-center justify-between min-w-full px-2 md:px-6 gap-6">
          {CATEGORIES.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              className="flex flex-col items-center gap-3 cursor-pointer group shrink-0 select-none"
            >
              {/* Outer ring */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center p-1.5 transition-all duration-300 shadow-sm ${
                activeCategory === cat.id 
                  ? 'bg-brand-primary/20 border-2 border-brand-primary scale-110 shadow-brand-primary/20' 
                  : 'bg-blue-50 dark:bg-slate-800/50 border-2 border-blue-200 dark:border-slate-600 group-hover:scale-105 group-hover:border-brand-primary/50'
              }`}>
                {/* Inner circle */}
                <div className={`w-full h-full rounded-full flex items-center justify-center shadow-inner transition-colors duration-300 ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-br from-brand-primary to-brand-secondary'
                    : 'bg-white dark:bg-slate-900 group-hover:bg-brand-primary/5'
                }`}>
                  <span className={`text-3xl transition-transform duration-300 ${activeCategory === cat.id ? 'scale-110 drop-shadow-md' : 'grayscale-[0.5] group-hover:grayscale-0'}`}>
                    {cat.emoji}
                  </span>
                </div>
              </div>
              <span className={`text-sm font-bold transition-colors ${
                activeCategory === cat.id 
                  ? 'text-brand-primary dark:text-brand-primary' 
                  : 'text-slate-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'
              }`}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Teams (Replaced Stat Cards) ── */}
      <div className="glass-panel rounded-3xl p-6 mb-8 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top Teams</h2>
          <button className="text-sm font-medium text-brand-primary hover:text-brand-secondary transition-colors">
            View All
          </button>
        </div>
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-2">
          {[
            { name: 'FC Tiến Phát', score: '2,450 pts', avatar: 'F', bg: 'from-blue-500 to-blue-600' },
            { name: 'Saigon Club', score: '2,120 pts', avatar: 'S', bg: 'from-orange-500 to-orange-600' },
            { name: 'Pro Team', score: '1,980 pts', avatar: 'P', bg: 'from-green-500 to-green-600' },
            { name: 'Huy Pham', score: '1,850 pts', avatar: 'H', bg: 'from-purple-500 to-purple-600' },
            { name: 'Elite FC', score: '1,720 pts', avatar: 'E', bg: 'from-red-500 to-red-600' },
            { name: 'Win Sports', score: '1,500 pts', avatar: 'W', bg: 'from-pink-500 to-pink-600' },
          ].map((team, i) => (
            <div key={i} className="flex items-center gap-4 min-w-[220px] p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${team.bg} flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {team.avatar}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{team.name}</h4>
                <p className="text-xs font-medium text-brand-primary mt-0.5">{team.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* ── Main Data Table (Posts) ── */}
        <div className="glass-panel rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex gap-8">
              <button 
                className={`text-lg font-bold pb-6 -mb-6 border-b-2 transition-colors ${activeTab === 'post' ? 'border-brand-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('post')}
              >
                Post
              </button>
              <button 
                className={`text-lg font-bold pb-6 -mb-6 border-b-2 transition-colors ${activeTab === 'my-post' ? 'border-brand-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('my-post')}
              >
                My Post
              </button>
            </div>
            <button className="text-sm font-medium text-brand-primary hover:text-brand-secondary transition-colors">
              Create Post
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Sport/Event</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { sport: 'Football (7v7)', team: 'FC Tiến Phát', loc: 'Elite Arena, Q2', status: 'Completed', color: 'text-green-400 bg-green-400/10', time: '2 mins ago' },
                  { sport: 'Badminton Doubles', team: 'Pro Team', loc: 'Proton Center, Q7', status: 'Upcoming', color: 'text-blue-400 bg-blue-400/10', time: 'In 2 hours' },
                  { sport: 'Tennis Singles', team: 'Huy Pham', loc: 'VinCity Club, Q9', status: 'Pending', color: 'text-orange-400 bg-orange-400/10', time: 'Tomorrow' },
                  { sport: 'Pickleball', team: 'Saigon Club', loc: 'Riverside, Q1', status: 'Canceled', color: 'text-red-400 bg-red-400/10', time: 'Yesterday' },
                ].filter(row => activeTab === 'post' || (activeTab === 'my-post' && row.status !== 'Canceled')).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center font-bold text-xs border border-transparent dark:border-white/10 text-slate-700 dark:text-white">
                          {row.sport[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{row.sport}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">by {row.team}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                        <MapPin className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                        {row.loc}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.color}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-gray-400">
                      {row.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;

