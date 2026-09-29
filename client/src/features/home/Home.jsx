import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, ImagePlus, LogOut, Pencil, Trophy, Users, X } from 'lucide-react';
import heroBgImg from '../../assets/sports/badminton.avif';
import EditProfileModal from '../profile/EditProfileModal';
import { useAuth } from '../../shared/context/AuthContext';
import MySocialPosts from '../profile/MySocialPosts';
import { authService, storageService } from '../../shared/services/api';
import { isActiveSport } from '../../shared/constants/sports';

const LEVEL_META = {
  'Chưa biết': 'Chưa biết',
  Beginner: 'Mới chơi',
  Intermediate: 'Trung bình',
  Advanced: 'Khá',
  Expert: 'Chuyên nghiệp',
};

const SKILL_STYLE = {
  badminton: { emoji: '🏸', color: 'from-blue-500 to-indigo-500' },
  football: { emoji: '⚽', color: 'from-emerald-500 to-green-500' },
  pickleball: { emoji: '🏓', color: 'from-teal-400 to-cyan-500' },
  tennis: { emoji: '🎾', color: 'from-orange-400 to-amber-500' },
  basketball: { emoji: '🏀', color: 'from-violet-500 to-indigo-500' },
  volleyball: { emoji: '🏐', color: 'from-yellow-400 to-orange-400' },
};
const SPORT_KEY_BY_NAME = { badminton: 'badminton', 'cầu lông': 'badminton', football: 'football', 'bóng đá': 'football', pickleball: 'pickleball', tennis: 'tennis', basketball: 'basketball', 'bóng rổ': 'basketball', volleyball: 'volleyball', 'bóng chuyền': 'volleyball' };
const SPORT_DISPLAY_NAME = { badminton: 'Cầu lông', football: 'Bóng đá', pickleball: 'Pickleball', tennis: 'Tennis', basketball: 'Bóng rổ', volleyball: 'Bóng chuyền' };
const LEVEL_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };

function Home() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, refreshProfile } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [stats, setStats] = useState({ games_played: 0, games_by_sport: {}, teams_joined: 0 });

  const displayName = user?.profile?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const email = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const coverImage = user?.profile?.cover_url || heroBgImg;

  const handleCoverChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCoverError('');
    setIsUploadingCover(true);
    try {
      const coverUrl = await storageService.uploadImage(file);
      await updateProfile({ cover_url: coverUrl });
    } catch (error) {
      setCoverError(error.message || 'Không tải được ảnh bìa');
    } finally {
      setIsUploadingCover(false);
    }
  };

  useEffect(() => {
    let active = true;
    let loadingStats = false;
    refreshProfile().catch(() => {});

    const loadStats = async () => {
      if (!active || document.visibilityState !== 'visible' || loadingStats) return;
      loadingStats = true;
      try {
        const nextStats = await authService.getStats();
        if (active) setStats(nextStats);
      } catch {
        // Keep the last successful values if the API is briefly unavailable.
      } finally {
        loadingStats = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadStats();
    };

    loadStats();
    const intervalId = window.setInterval(loadStats, 2000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, refreshProfile]);

  const skills = useMemo(() => {
    const bySport = new Map();
    for (const item of (user?.sports || []).filter((entry) => isActiveSport(entry.sport?.name))) {
      const sportName = item.sport?.name || 'Môn thể thao';
      const key = SPORT_KEY_BY_NAME[sportName.trim().toLowerCase()] || sportName.toLowerCase();
      const previous = bySport.get(key);
      const games = stats.games_by_sport?.[item.sport_id] ?? item.games_played ?? 0;
      bySport.set(key, {
        key, sport: SPORT_DISPLAY_NAME[key] || sportName,
        emoji: SKILL_STYLE[key]?.emoji || '🏅',
        color: SKILL_STYLE[key]?.color || 'from-slate-400 to-slate-600',
        level: (LEVEL_RANK[item.skill_level] || 0) >= (LEVEL_RANK[previous?.rawLevel] || 0) ? (LEVEL_META[item.skill_level] || item.skill_level) : previous.level,
        rawLevel: (LEVEL_RANK[item.skill_level] || 0) >= (LEVEL_RANK[previous?.rawLevel] || 0) ? item.skill_level : previous.rawLevel,
        games: (previous?.games || 0) + games,
      });
    }
    return [...bySport.values()];
  }, [user?.sports, stats.games_by_sport]);

  const statsCards = [
    { label: 'Trận đã chơi', value: stats.games_played, icon: Trophy, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'CLB tham gia', value: stats.teams_joined, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  ];

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-[#EAF2FF] font-sans transition-colors duration-500 px-4 sm:px-6 lg:px-8 py-7 sm:py-10 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <p className="sg-eyebrow mb-1">HÀNH TRÌNH CỦA BẠN</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white break-words">Hồ sơ cá nhân</h1>
        </div>

        <section className="member-content-surface rounded-3xl overflow-hidden">
          {/* Cover and profile identity */}
          <div className="relative h-48 sm:h-64 overflow-hidden group/cover">
            <img src={coverImage} alt="Ảnh bìa hồ sơ" className="w-full h-full object-cover object-[50%_42%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/35 to-[#5e87f7]/35" />
            <div className="absolute right-4 top-4 flex items-center gap-2 opacity-100 sm:opacity-0 group-hover/cover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setIsCoverPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-black/45 px-3 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                title="Xem ảnh bìa"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Xem ảnh</span>
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black/45 px-3 py-2 text-xs font-bold text-white backdrop-blur-md transition-colors hover:bg-black/60">
                <ImagePlus className="h-4 w-4" />
                <span>{isUploadingCover ? 'Đang tải…' : 'Đổi ảnh bìa'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={isUploadingCover} className="sr-only" onChange={handleCoverChange} />
              </label>
            </div>
          </div>

          {coverError && <p role="alert" className="mx-5 mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 sm:mx-8">{coverError}</p>}

          <div className="relative px-5 sm:px-8 pb-6">
            <div className="-mt-12 sm:-mt-14 flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1.5 shadow-xl shrink-0 bg-gradient-to-tr from-[#5e87f7] to-[#83a6ff] ${user?.isPremium ? 'sg-premium-avatar-shell' : ''}`}>
                <div className="w-full h-full overflow-hidden rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-black text-4xl sm:text-5xl text-[#5e87f7] dark:text-[#83a6ff]">{user?.profile?.avatar_url ? <img src={user.profile.avatar_url} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : avatarLetter}</div>
              </div>
              <div className="min-w-0 flex-1 lg:pb-1 lg:translate-y-1.5">
                <h2 className={`text-slate-900 dark:text-white text-xl sm:text-2xl font-black leading-tight break-words ${user?.isPremium ? 'sg-premium-name' : ''}`}>{displayName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-all mt-1">{email}</p>
                {user?.profile?.bio && <p className="sg-profile-bio">{user.profile.bio}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 lg:pb-1 shrink-0">
                <button onClick={() => setIsEditProfileOpen(true)} className="px-5 py-3 bg-gradient-to-r from-[#83a6ff] to-[#5e87f7] hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                  <Pencil className="w-4 h-4" />
                  Chỉnh sửa hồ sơ
                </button>
                <button onClick={() => { logout(); navigate('/login'); }} className="px-5 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-500/20 active:scale-95">
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 px-5 sm:px-8 pb-7">
            {statsCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-900/30 p-3.5 sm:p-4">
                <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mb-2`}><Icon className="w-4 h-4" /></div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/70 dark:border-slate-700/70" />

          {/* Sport cards */}
          <div className="p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Activity className="w-5 h-5" /></div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Hồ sơ kỹ năng</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Trình độ và hoạt động thể thao</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {skills.map((skill) => (
                <div key={skill.key} className="group rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/25 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center text-xl shadow-sm`}>{skill.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">{skill.sport}</h3>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/70 px-2 py-1 rounded-lg whitespace-nowrap">{skill.level}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{skill.games} trận</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {skills.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Bạn chưa thêm môn thể thao hoặc trình độ. Hãy cập nhật hồ sơ để lưu kỹ năng của mình.</div>}
          </div>
        </section>
        <MySocialPosts />
      </div>

      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} user={user} onSave={updateProfile} />
      {isCoverPreviewOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4 sm:p-8 backdrop-blur-sm" onClick={() => setIsCoverPreviewOpen(false)} role="presentation">
          <button type="button" onClick={() => setIsCoverPreviewOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors" aria-label="Đóng ảnh bìa">
            <X className="w-5 h-5" />
          </button>
          <img src={coverImage} alt="Ảnh bìa hồ sơ phóng to" className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default Home;
