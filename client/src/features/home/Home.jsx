import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, CalendarCheck, ShieldCheck, MessageSquare, ArrowRight, Activity, TrendingUp, Sparkles, Pencil } from 'lucide-react';
import heroBgImg from '../../assets/sports/badminton.avif';
import EditSkillModal from './components/EditSkillModal';

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
  const [skills, setSkills] = useState(INITIAL_USER_SKILLS);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-white mb-4 sm:mb-6 drop-shadow-lg">
            Sport<span className="text-[#74C365]">Go</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl font-semibold text-white/90 mb-6 sm:mb-10 drop-shadow-md">
            Chơi đúng người - Ghép đúng trình độ
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
        
        {/* ── 2. User Skill Profile Section (Left Column) ── */}
        <div className="lg:col-span-4 flex flex-col gap-6 relative z-20">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-200/30 dark:shadow-black/50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#589470] to-teal-500 flex items-center justify-center text-white shadow-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold dark:text-white">Hồ Sơ Kỹ Năng</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Đánh giá trình độ cá nhân</p>
              </div>
            </div>

            <div className="space-y-6">
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

            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="mt-8 w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 shadow-sm active:scale-95"
            >
              <Pencil className="w-4 h-4" />
              Chỉnh sửa trình độ
            </button>
          </div>
        </div>

        {/* ── 3. System Features Section (Right Column) ── */}
        <div className="lg:col-span-8 flex flex-col pt-8 lg:pt-0">
          <div className="mb-8">
            <h2 className="text-3xl font-black mb-2 dark:text-white">Tính Năng Hệ Thống</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Khám phá các công cụ tuyệt vời để nâng tầm trải nghiệm thể thao của bạn.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Feature 1: Diễn Đàn */}
            <div 
              onClick={() => navigate('/tournaments')}
              className="group bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-400/40 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-5 group-hover:-translate-y-1 transition-transform duration-300">
                <MessageSquare className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Diễn Đàn Giao Lưu</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Nơi bạn đăng tin tìm kèo, thảo luận về các giải đấu hoặc chia sẻ kinh nghiệm chơi thể thao với cộng đồng đam mê trên toàn quốc.
              </p>
            </div>

            {/* Feature 2: Phòng Game */}
            <div 
              onClick={() => navigate('/matches')}
              className="group bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-teal-500/40 dark:hover:border-teal-400/40 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center mb-5 group-hover:-translate-y-1 transition-transform duration-300">
                <Gamepad2 className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Phòng Chờ (Game Rooms)</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tự tạo phòng để chờ người chơi tham gia theo thời gian thực. Hệ thống hỗ trợ chat riêng tư và chốt danh sách tự động.
              </p>
            </div>

            {/* Feature 3: Đặt Sân */}
            <div 
              onClick={() => navigate('/bookings')}
              className="group bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-orange-500/40 dark:hover:border-orange-400/40 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mb-5 group-hover:-translate-y-1 transition-transform duration-300">
                <CalendarCheck className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Hệ Thống Đặt Sân</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tìm kiếm sân bãi theo địa điểm, so sánh giá cả và đặt lịch nhanh chóng. Trải nghiệm tính năng đăng ký làm chủ sân linh hoạt.
              </p>
            </div>

            {/* Feature 4: Teams */}
            <div 
              onClick={() => navigate('/team')}
              className="group bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-purple-500/40 dark:hover:border-purple-400/40 transition-all duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-5 group-hover:-translate-y-1 transition-transform duration-300">
                <ShieldCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Câu Lạc Bộ (Teams)</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Nâng cấp quyền lợi Premium để đẩy top bài đăng, tích lũy điểm đánh giá 5⭐ và nhận huy hiệu uy tín nhằm thu hút nhiều thành viên hơn.
              </p>
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
    </div>

  );
}

export default Home;
