import { useState, useEffect } from 'react';
import { Camera, X, Save, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ALL_SPORTS = ['Badminton', 'Tennis', 'Football', 'Pickleball'];
function EditProfileModal({ isOpen, onClose, user, onSave }) {
  const { t } = useTranslation();
  const SKILL_LEVELS = [
    { value: 'Chưa biết', label: t('header.unknown') },
    { value: 'Beginner', label: t('sports.beginner', 'Beginner') },
    { value: 'Intermediate', label: t('sports.intermediate', 'Intermediate') },
    { value: 'Advanced', label: t('sports.advanced', 'Advanced') },
    { value: 'Expert', label: t('sports.expert', 'Expert') }
  ];

  const [formData, setFormData] = useState({
    name: '',
    sports: {}
  });
  
  const [isRendered, setIsRendered] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      
      // Do not override if we are in the middle of a success animation
      if (!isSuccess) {
        const initialSports = {};
        ALL_SPORTS.forEach(sport => {
          const userSport = user?.sports?.find(s => s.sport.name === sport);
          initialSports[sport] = userSport ? userSport.skill_level : 'Chưa biết';
        });

        setFormData({
          name: user?.profile?.full_name || user?.name || '',
          sports: initialSports
        });
      }
    } else {
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsSuccess(false); // Reset success state completely when modal hides
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user, isSuccess]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSportChange = (sport, level) => {
    setFormData(prev => ({
      ...prev,
      sports: { ...prev.sports, [sport]: level }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSuccess(true);
    onSave?.(formData);
    setTimeout(() => {
      onClose();
      // Reset flip after close animation finishes
      setTimeout(() => setIsSuccess(false), 300);
    }, 2000);
  };

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => !isSuccess && onClose()}
      ></div>

      {/* Modal */}
      <div 
        className={`relative w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-[2.5rem] rounded-tl-[4rem] rounded-br-[4rem] border border-white/20 dark:border-gray-800/50 p-6 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.3)] transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'
        }`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-5 text-center mt-2">{t('profile.editTitle')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide px-1 pb-2">
          
          {/* Avatar Edit with Flip */}
          <div className="flex flex-col items-center mb-4 z-10 relative">
            <div 
              className="relative cursor-pointer perspective-1000 w-20 h-20"
              style={{ perspective: '1000px' }}
            >
              <div 
                className="w-full h-full transition-transform duration-700 ease-in-out"
                style={{ transformStyle: 'preserve-3d', transform: isSuccess ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* Front Face: Avatar */}
                <div 
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30 group"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {(formData.name || user?.email || '').charAt(0).toUpperCase()}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Back Face: Checkmark */}
                <div 
                  className="absolute inset-0 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            <span className={`text-[10px] mt-3 font-bold uppercase tracking-wider transition-colors duration-500 ${isSuccess ? 'text-green-500 scale-110' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500 cursor-pointer'}`}>
              {isSuccess ? t('profile.updateSuccess') : t('profile.changeAvatar')}
            </span>
          </div>

          {/* Form Content (dims on success) */}
          <div className={`space-y-4 transition-all duration-700 ${isSuccess ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'}`}>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">{t('profile.fullName')}</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                placeholder={t('profile.enterFullName')}
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">{t('profile.sportsSkill')}</label>
              <div className="space-y-2.5">
                {ALL_SPORTS.map(sport => (
                  <div key={sport} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 pl-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sport}</span>
                    <select
                      value={formData.sports[sport] || 'Chưa biết'}
                      onChange={(e) => handleSportChange(sport, e.target.value)}
                      className="bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      {SKILL_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] mt-6"
            >
              {t('profile.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfileModal;
