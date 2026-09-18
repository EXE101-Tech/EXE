import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, Eye, ImagePlus, LogOut, Pencil, Star, Trophy, Users, X } from 'lucide-react';
import heroBgImg from '../../assets/sports/badminton.avif';
import EditProfileModal from '../profile/EditProfileModal';
import { useAuth } from '../../shared/context/AuthContext';

const INITIAL_USER_SKILLS = [
  { sport: 'Cầu lông', key: 'Badminton', emoji: '🏸', level: 'Khá', percentage: 75, games: 28, rating: '4.8', color: 'from-blue-500 to-indigo-500' },
  { sport: 'Bóng đá', key: 'Football', emoji: '⚽', level: 'Trung bình khá', percentage: 65, games: 18, rating: '4.5', color: 'from-emerald-500 to-green-500' },
  { sport: 'Pickleball', key: 'Pickleball', emoji: '🏓', level: 'Mới chơi', percentage: 25, games: 6, rating: '4.1', color: 'from-teal-400 to-cyan-500' },
  { sport: 'Tennis', key: 'Tennis', emoji: '🎾', level: 'Khá', percentage: 70, games: 21, rating: '4.6', color: 'from-orange-400 to-amber-500' },
  { sport: 'Bóng rổ', key: 'Basketball', emoji: '🏀', level: 'Trung bình', percentage: 50, games: 12, rating: '4.3', color: 'from-violet-500 to-indigo-500' },
  { sport: 'Bóng chuyền', key: 'Volleyball', emoji: '🏐', level: 'Cơ bản', percentage: 40, games: 9, rating: '4.2', color: 'from-yellow-400 to-orange-400' },
];

const LEVEL_META = {
  'Chưa biết': { label: 'Chưa biết', percentage: 10 },
  Beginner: { label: 'Mới chơi', percentage: 25 },
  Intermediate: { label: 'Trung bình', percentage: 50 },
  Advanced: { label: 'Khá', percentage: 75 },
  Expert: { label: 'Chuyên nghiệp', percentage: 95 },
};

const STATS = [
  { label: 'Trận đã chơi', value: '42', icon: Trophy, color: 'text-amber-500 bg-amber-500/10' },
  { label: 'Đội đã tham gia', value: '8', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  { label: 'Lần đặt sân', value: '16', icon: CalendarDays, color: 'text-emerald-500 bg-emerald-500/10' },
  { label: 'Điểm uy tín', value: '98', icon: Star, color: 'text-violet-500 bg-violet-500/10' },
];

function Home() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const [skills, setSkills] = useState(INITIAL_USER_SKILLS);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [coverImage, setCoverImage] = useState(heroBgImg);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const coverInputRef = useRef(null);

  const displayName = user?.profile?.full_name || 'Người dùng SportGo';
  const email = user?.email || 'user@sportgo.vn';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleProfileSave = (data) => {
    updateProfile(data);
    if (data.sports) {
      setSkills((currentSkills) => currentSkills.map((skill) => {
        const levelMeta = LEVEL_META[data.sports[skill.key]];
        return levelMeta ? { ...skill, ...levelMeta } : skill;
      }));
    }
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (file) setCoverImage(URL.createObjectURL(file));
    event.target.value = '';
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
            <img src={coverImage} alt="Ảnh bìa hồ sơ" className="w-full h-full object-cover object-[50%_42%]" />
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
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-white transition-colors"
                title="Đổi ảnh bìa"
              >
                <ImagePlus className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi ảnh bìa</span>
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            </div>
          </div>

          <div className="relative px-5 sm:px-8 pb-6">
            <div className="-mt-12 sm:-mt-14 flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] p-1.5 shadow-xl shrink-0">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-black text-4xl sm:text-5xl text-[#589470] dark:text-[#74C365]">{avatarLetter}</div>
              </div>
              <div className="min-w-0 flex-1 lg:pb-1">
                <h2 className="text-xl sm:text-2xl font-black leading-tight text-slate-900 dark:text-white break-words">{displayName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-all mt-1">{email}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 lg:pb-1 shrink-0">
                <button onClick={() => setIsEditProfileOpen(true)} className="px-5 py-3 bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 sm:px-8 pb-7">
            {STATS.map(({ label, value, icon: Icon, color }) => (
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
          </div>
        </section>
      </div>

      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} user={user} onSave={handleProfileSave} />

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
