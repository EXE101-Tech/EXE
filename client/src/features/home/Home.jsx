import { useState, useEffect } from 'react';
import { Trophy, Activity, Users, Calendar, ArrowUpRight, ArrowDownRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/context/AuthContext';

function StatCard({ title, value, change, isPositive, Icon, colorClass }) {
  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${colorClass}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <h3 className="text-3xl font-black text-white">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${colorClass} bg-opacity-20 border border-white/10 backdrop-blur-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div className="flex items-center gap-2 relative z-10">
        <span className={`flex items-center text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {change}
        </span>
        <span className="text-xs text-gray-500">vs last month</span>
      </div>
    </div>
  );
}

function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      
      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Matches" 
          value="1,284" 
          change="+12.5%" 
          isPositive={true} 
          Icon={Activity} 
          colorClass="bg-brand-primary" 
        />
        <StatCard 
          title="Active Teams" 
          value="342" 
          change="+5.2%" 
          isPositive={true} 
          Icon={Users} 
          colorClass="bg-blue-500" 
        />
        <StatCard 
          title="Upcoming Bookings" 
          value="89" 
          change="-2.1%" 
          isPositive={false} 
          Icon={Calendar} 
          colorClass="bg-orange-500" 
        />
        <StatCard 
          title="Win Rate Avg" 
          value="64%" 
          change="+8.4%" 
          isPositive={true} 
          Icon={Trophy} 
          colorClass="bg-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Main Data Table (2/3 width) ── */}
        <div className="lg:col-span-2 glass-panel rounded-3xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Recent Activities</h2>
              <p className="text-sm text-gray-400">Latest matches and bookings in your area</p>
            </div>
            <button className="text-sm font-medium text-brand-primary hover:text-brand-secondary transition-colors">
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sport/Event</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { sport: 'Football (7v7)', team: 'FC Tiến Phát', loc: 'Elite Arena, Q2', status: 'Completed', color: 'text-green-400 bg-green-400/10', time: '2 mins ago' },
                  { sport: 'Badminton Doubles', team: 'Pro Team', loc: 'Proton Center, Q7', status: 'Upcoming', color: 'text-blue-400 bg-blue-400/10', time: 'In 2 hours' },
                  { sport: 'Tennis Singles', team: 'Huy Pham', loc: 'VinCity Club, Q9', status: 'Pending', color: 'text-orange-400 bg-orange-400/10', time: 'Tomorrow' },
                  { sport: 'Pickleball', team: 'Saigon Club', loc: 'Riverside, Q1', status: 'Canceled', color: 'text-red-400 bg-red-400/10', time: 'Yesterday' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs border border-white/10">
                          {row.sport[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{row.sport}</p>
                          <p className="text-xs text-gray-400">by {row.team}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        {row.loc}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.color}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {row.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Side Widget (1/3 width) ── */}
        <div className="glass-panel rounded-3xl border border-white/5 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Top Players</h2>
            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="text-gray-400">⋮</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {[
              { name: 'Katherine Moss', score: '2,450 pts', avatar: 'K' },
              { name: 'Phoenix Baker', score: '2,120 pts', avatar: 'P' },
              { name: 'Olivia Rhye', score: '1,980 pts', avatar: 'O' },
              { name: 'Lana Steiner', score: '1,850 pts', avatar: 'L' },
              { name: 'Demi Wilkinson', score: '1,720 pts', avatar: 'D' },
            ].map((player, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 flex items-center justify-center font-bold text-white shadow-lg">
                    {player.avatar}
                  </div>
                  {i < 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md border-2 border-gray-900">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{player.name}</h4>
                  <p className="text-xs text-brand-primary font-medium">{player.score}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-6 w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white hover:bg-white/5 transition-colors">
            View Leaderboard
          </button>
        </div>

      </div>
    </div>
  );
}

export default Home;

