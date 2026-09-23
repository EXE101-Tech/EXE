import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, Eye, LogOut, Pencil, Star, Trophy, Users, X } from 'lucide-react';
import heroBgImg from '../../assets/sports/badminton.avif';
import EditProfileModal from '../profile/EditProfileModal';
import { useAuth } from '../../shared/context/AuthContext';
import OwnerRegistrationModal from '../bookings/components/OwnerRegistrationModal';
import OwnerCancellationModal from '../bookings/components/OwnerCancellationModal';
import { authService, ownerService } from '../../shared/services/api';

const LEVEL_META = {
  'Chưa biết': { label: 'Chưa biết', percentage: 10 },
  Beginner: { label: 'Mới chơi', percentage: 25 },
  Intermediate: { label: 'Trung bình', percentage: 50 },
  Advanced: { label: 'Khá', percentage: 75 },
  Expert: { label: 'Chuyên nghiệp', percentage: 95 },
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

function Home() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, applyOwnerRegistration, cancelOwnerRegistration } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [isOwnerTermsOpen, setIsOwnerTermsOpen] = useState(false);
  const [isOwnerCancellationOpen, setIsOwnerCancellationOpen] = useState(false);
  const [ownedVenueCount, setOwnedVenueCount] = useState(0);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [ownerError, setOwnerError] = useState('');
  const [stats, setStats] = useState({ games_played: 0, teams_joined: 0, bookings_count: 0, average_skill_rating: null });

  const displayName = user?.profile?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const email = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    let active = true;
    Promise.all([authService.getStats(), ownerService.getStatus()]).then(([nextStats, owner]) => {
      if (!active) return;
      setStats(nextStats);
      setOwnedVenueCount(owner.owned_venues_count);
    }).catch((error) => {
      if (active) setOwnerError(error.message || 'Không tải được thống kê tài khoản');
    });
    return () => { active = false; };
  }, [user?.id]);

  const skills = useMemo(() => (user?.sports || []).map((item) => {
    const sportName = item.sport?.name || 'Môn thể thao';
    const key = SPORT_KEY_BY_NAME[sportName.toLowerCase()] || sportName.toLowerCase();
    const level = LEVEL_META[item.skill_level] || { label: item.skill_level, percentage: 0 };
    return {
      key: item.id,
      sport: sportName,
      emoji: SKILL_STYLE[key]?.emoji || '🏅',
      color: SKILL_STYLE[key]?.color || 'from-slate-400 to-slate-600',
      level: level.label,
      percentage: level.percentage,
      games: item.games_played || 0,
      rating: Number(item.rating || 0).toFixed(1),
    };
  }), [user?.sports]);

  const statsCards = [
    { label: 'Trận đã chơi', value: stats.games_played, icon: Trophy, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'CLB tham gia', value: stats.teams_joined, icon: Users, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Lần đặt sân', value: stats.bookings_count, icon: CalendarDays, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Điểm kỹ năng TB', value: stats.average_skill_rating ?? '—', icon: Star, color: 'text-violet-500 bg-violet-500/10' },
  ];

  const handleCancelOwnerRegistration = async () => {
    setOwnerError('');
    try {
      const status = await ownerService.getStatus();
      setOwnedVenueCount(status.owned_venues_count);
    } catch (error) {
      setOwnerError(error.message || 'Không tải được trạng thái chủ sân');
    }
    setIsOwnerCancellationOpen(true);
  };

  const handleCancelOwnerConfirm = async () => {
    setIsCancelSubmitting(true);
    setOwnerError('');
    try {
      await cancelOwnerRegistration();
      setOwnedVenueCount(0);
      setIsOwnerCancellationOpen(false);
    } catch (error) {
      setOwnerError(error.message || 'Không thể hủy đăng ký lúc này');
      const status = await ownerService.getStatus().catch(() => null);
      if (status) setOwnedVenueCount(status.owned_venues_count);
    } finally { setIsCancelSubmitting(false); }
  };

  const handleOwnerRegistration = async () => {
    await applyOwnerRegistration();
    setIsOwnerTermsOpen(false);
    navigate('/bookings');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#EAF2FF] font-sans transition-colors duration-500 px-4 sm:px-6 lg:px-8 py-7 sm:py-10 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <p className="text-base sm:text-lg font-semibold text-slate-500 dark:text-slate-400 mb-1">Xin chào</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white break-words">{displayName}</h1>
        </div>

        <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl shadow-slate-200/30 dark:shadow-black/30 overflow-hidden">
          {/* Cover and profile identity */}
          <div className="relative h-48 sm:h-64 overflow-hidden group/cover">
            <img src={heroBgImg} alt="Ảnh bìa hồ sơ" className="w-full h-full object-cover object-[50%_42%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/35 to-[#589470]/35" />
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
            </div>
          </div>

          <div className="relative px-5 sm:px-8 pb-6">
            <div className="-mt-12 sm:-mt-14 flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1.5 shadow-xl shrink-0 ${user?.ownerStatus === 'registered' ? 'owner-avatar-ring-active' : 'bg-gradient-to-tr from-[#589470] to-[#74C365]'}`}>
                <div className="w-full h-full rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-black text-4xl sm:text-5xl text-[#589470] dark:text-[#74C365]">{avatarLetter}</div>
              </div>
              <div className="min-w-0 flex-1 lg:pb-1">
                <h2 className={`${user?.ownerStatus === 'registered' ? 'owner-water-text' : 'text-slate-900 dark:text-white'} text-xl sm:text-2xl font-black leading-tight break-words`}>{displayName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-all mt-1">{email}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 lg:pb-1 shrink-0">
                <button onClick={() => setIsEditProfileOpen(true)} className="px-5 py-3 bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                  <Pencil className="w-4 h-4" />
                  Chỉnh sửa hồ sơ
                </button>
                <button onClick={() => user?.ownerStatus === 'registered' ? handleCancelOwnerRegistration() : setIsOwnerTermsOpen(true)} className={`px-5 py-3 font-bold rounded-xl transition-all flex items-center justify-center border ${user?.ownerStatus === 'registered' ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200' : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200'}`}>{user?.ownerStatus === 'registered' ? 'Hủy đăng ký chủ sân' : 'Đăng ký làm chủ sân'}</button>
                <button onClick={() => { logout(); navigate('/login'); }} className="px-5 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-500/20 active:scale-95">
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 sm:px-8 pb-7">
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{skill.games} trận <span className="mx-1">·</span> {skill.rating} rating</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${skill.color} transition-all duration-700`} style={{ width: `${skill.percentage}%` }} />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 w-8 text-right">{skill.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
            {skills.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Bạn chưa thêm môn thể thao hoặc trình độ. Hãy cập nhật hồ sơ để lưu kỹ năng của mình.</div>}
          </div>
        </section>
      </div>

      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} user={user} onSave={updateProfile} />
      <OwnerRegistrationModal isOpen={isOwnerTermsOpen} onClose={() => setIsOwnerTermsOpen(false)} onAgree={handleOwnerRegistration} />
      <OwnerCancellationModal isOpen={isOwnerCancellationOpen} ownedVenueCount={ownedVenueCount} isSubmitting={isCancelSubmitting} error={ownerError} onClose={() => setIsOwnerCancellationOpen(false)} onConfirm={handleCancelOwnerConfirm} />

      {isCoverPreviewOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4 sm:p-8 backdrop-blur-sm" onClick={() => setIsCoverPreviewOpen(false)} role="presentation">
          <button type="button" onClick={() => setIsCoverPreviewOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors" aria-label="Đóng ảnh bìa">
            <X className="w-5 h-5" />
          </button>
          <img src={heroBgImg} alt="Ảnh bìa hồ sơ phóng to" className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default Home;
