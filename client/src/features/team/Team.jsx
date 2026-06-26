import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../shared/components/Header';
import { Users, Plus, Star } from 'lucide-react';
import badmintonImg from '../../assets/icons/badminton.png';
import footballImg from '../../assets/icons/football.png';
import pickleballImg from '../../assets/icons/pickelball.png';
import tennisImg from '../../assets/icons/tennis.png';

const MOCK_SPORTS = [
  { id: 1, name: 'Badminton', image: badmintonImg, key: 'badminton' },
  { id: 2, name: 'Football', image: footballImg, key: 'football' },
  { id: 3, name: 'Pickleball', image: pickleballImg, key: 'pickleball' },
  { id: 4, name: 'Tennis', image: tennisImg, key: 'tennis' },
];

const MY_TEAMS = [
  {
    id: 1,
    name: 'FC Rồng Lửa',
    sport: 'football',
    role: 'Captain',
    members: 15,
    rating: 4.8,
    avatarBadge: 'RL',
    color: 'from-red-500 to-orange-500',
  },
  {
    id: 2,
    name: 'Smash Brothers',
    sport: 'badminton',
    role: 'Member',
    members: 4,
    rating: 4.9,
    avatarBadge: 'SB',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 3,
    name: 'Pickle Power',
    sport: 'pickleball',
    role: 'Member',
    members: 6,
    rating: 4.5,
    avatarBadge: 'PP',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    id: 4,
    name: 'Tennis Masters',
    sport: 'tennis',
    role: 'Captain',
    members: 8,
    rating: 5.0,
    avatarBadge: 'TM',
    color: 'from-yellow-400 to-orange-500',
  }
];

function Team() {
  const { t } = useTranslation();
  const [selectedSport, setSelectedSport] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentLocation] = useState('Hồ Chí Minh');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  const handleFilterSport = (sportId) => {
    setSelectedSport(prev => prev === sportId ? null : sportId);
  };

  const filteredTeams = selectedSport 
    ? MY_TEAMS.filter(team => {
        const sportObj = MOCK_SPORTS.find(s => s.id === selectedSport);
        return sportObj && team.sport === sportObj.key;
      })
    : MY_TEAMS;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      {/* Thanh tiêu đề chính */}
      <Header 
        currentLocation={currentLocation}
        isDark={isDark}
        setIsDark={setIsDark}
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        searchPlaceholder={t('header.searchPlaceholder', 'Tìm kiếm sân, người chơi hoặc môn...')}
      />

      {/* Header Team */}
      <header className="px-4 pt-5 pb-4 bg-white dark:bg-gray-950 z-30">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {t('team.myTeams', 'My Teams')}
          </h1>
          <button className="flex items-center gap-1.5 bg-[#CDFF00] text-gray-900 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" strokeWidth={3} />
            {t('team.createTeam', 'Create Team')}
          </button>
        </div>
      </header>

      <div className="px-4 pt-2 space-y-8">
        {/* Danh mục môn thể thao */}
        <section>
          <div className="flex justify-around">
            {MOCK_SPORTS.map((sport) => (
              <button
                key={sport.id}
                onClick={() => handleFilterSport(sport.id)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`relative w-14 h-14 rounded-full overflow-hidden transition-all flex items-center justify-center ${
                    selectedSport === sport.id ? 'scale-105' : 'hover:scale-105'
                  }`}
                >
                  <img src={sport.image} alt={sport.name} className="w-full h-full object-cover" />
                  {selectedSport === sport.id && (
                    <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 pointer-events-none"></div>
                  )}
                </div>
                <span className={`text-xs font-medium ${selectedSport === sport.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {t(`sports.${sport.key}`, sport.name)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Danh sách Teams */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {selectedSport ? t('team.filteredTeams', 'Filtered Teams') : t('team.allMyTeams', 'All My Teams')}
          </h2>
          
          {filteredTeams.length > 0 ? (
            <div className="grid gap-4">
              {filteredTeams.map(team => (
                <div key={team.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  {/* Team Avatar */}
                  <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${team.color} flex items-center justify-center text-white font-black text-xl shadow-inner`}>
                    {team.avatarBadge}
                  </div>
                  
                  {/* Team Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-gray-900 dark:text-white font-bold text-base truncate pr-2">{team.name}</h3>
                      <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[11px] font-bold">{team.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {team.members} {t('team.members', 'members')}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                      <span className="capitalize">{t(`sports.${team.sport}`, team.sport)}</span>
                    </div>
                  </div>
                  
                  {/* Role Badge */}
                  <div className="shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      team.role === 'Captain' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                    }`}>
                      {team.role === 'Captain' ? t('team.captain', 'Captain') : t('team.member', 'Member')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('team.noTeams', "You haven't joined any teams for this sport yet.")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Team;
