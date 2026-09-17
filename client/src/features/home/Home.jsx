import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, CalendarCheck, ShieldCheck, MessageSquare, ArrowRight, Activity, TrendingUp, Sparkles, Pencil, LogOut, User } from 'lucide-react';
import heroBgImg from '../../assets/sports/badminton.avif';
import EditSkillModal from './components/EditSkillModal';
import EditProfileModal from '../profile/EditProfileModal';
import { useAuth } from '../../shared/context/AuthContext';

const INITIAL_USER_SKILLS = [
  { sport: 'Cầu lông', level: 'Khá', percentage: 75, color: 'bg-blue-500' },
  { sport: 'Bóng đá', level: 'Trung bình khá', percentage: 65, color: 'bg-green-500' },
  { sport: 'Pickleball', level: 'Mới chơi', percentage: 25, color: 'bg-teal-500' },
  { sport: 'Tennis', level: 'Khá', percentage: 70, color: 'bg-orange-500' },
  { sport: 'Bóng rổ', level: 'Trung bình', percentage: 50, color: 'bg-indigo-500' },
  { sport: 'Bóng chuyền', level: 'Cơ bản', percentage: 40, color: 'bg-yellow-500' },
];

function Home() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const [skills, setSkills] = useState(INITIAL_USER_SKILLS);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const getAvatarLetter = () => {
    const name = user?.profile?.full_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a1128] text-slate-900 dark:text-[#F6F7ED] font-sans transition-colors duration-500 selection:bg-[#589470]/30 overflow-x-hidden pb-12">
      
      {/* ── 1. Hero Banner ── */}
      <section className="relative w-full h-[550px] flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBgImg} 
            alt="Hero background" 
            className="w-full h-full object-cover object-[50%_40%]" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-50 dark:to-[#0a1128] transition-colors duration-500" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 shrink-0" />
            <span>Nền tảng thể thao & ghép kèo số 1</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-white mb-4 sm:mb-6 drop-shadow-lg leading-tight sm:leading-tight md:leading-tight">
            Xin chào, <br />
            <span className="text-[#74C365] inline-block mt-1 sm:mt-2">{user?.profile?.full_name || 'Người dùng'}</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl font-semibold text-white/90 mb-6 sm:mb-10 drop-shadow-md">
            Quản lý hồ sơ và nâng tầm trải nghiệm thể thao của bạn
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/tournaments')}
              className="px-8 py-3.5 bg-[#74C365] hover:bg-[#60a852] text-white font-bold rounded-xl shadow-lg shadow-[#74C365]/30 transition-all flex items-center justify-center gap-2"
            >
              Khám phá diễn đàn <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/matches')}
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Vào phòng game
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* ── 2. User Profile Info Section (Left Column) ── */}
        <div className="lg:col-span-4 flex flex-col gap-6 relative z-20">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-200/30 dark:shadow-black/50 text-center">
            
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-tr from-[#589470] to-[#74C365] p-1 shadow-xl mb-4 sm:mb-6">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#001F3F] flex items-center justify-center font-black text-4xl sm:text-5xl text-[#589470] dark:text-[#74C365]">
                {getAvatarLetter()}
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
              {user?.profile?.full_name || 'Người dùng SportGo'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-8">
              {user?.email || 'user@sportgo.vn'}
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setIsEditProfileOpen(true)}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white font-bold rounded-xl sm:rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                Chỉnh sửa hồ sơ
              </button>

              <button 
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full py-3 sm:py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-500/20 active:scale-95"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. Skill Profile Section (Right Column) ── */}
        <div className="lg:col-span-8 flex flex-col gap-6 relative z-20 pt-8 lg:pt-0">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-200/30 dark:shadow-black/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">Hồ Sơ Kỹ Năng</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Đánh giá trình độ cá nhân</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 shadow-sm active:scale-95 shrink-0"
              >
                <Pencil className="w-4 h-4" />
                Chỉnh sửa trình độ
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {skills.map((skill, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{skill.sport}</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-md">
                      {skill.level}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-600/50">
                    <div 
                      className={`h-full ${skill.color} rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]`} 
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <EditSkillModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        skills={skills} 
        onSave={(newSkills) => setSkills(newSkills)} 
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onSave={(data) => {
          updateProfile(data);
        }}
      />
    </div>

  );
}

export default Home;
