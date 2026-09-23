import { useState, useEffect } from 'react';
import { CheckCircle, ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { storageService } from '../../shared/services/api';

const ALL_SPORTS = [
  { key: 'badminton', label: 'Badminton' },
  { key: 'tennis', label: 'Tennis' },
  { key: 'football', label: 'Football' },
  { key: 'pickleball', label: 'Pickleball' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'volleyball', label: 'Volleyball' },
];
const SPORT_KEY_BY_NAME = {
  badminton: 'badminton', 'cầu lông': 'badminton', tennis: 'tennis', football: 'football', 'bóng đá': 'football',
  pickleball: 'pickleball', basketball: 'basketball', 'bóng rổ': 'basketball', volleyball: 'volleyball', 'bóng chuyền': 'volleyball',
};
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
    sports: {},
    avatar_url: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  
  const [isRendered, setIsRendered] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      
      // Do not override if we are in the middle of a success animation
      if (!isSuccess) {
        const initialSports = {};
        ALL_SPORTS.forEach(({ key }) => {
          const userSport = user?.sports?.find((item) => SPORT_KEY_BY_NAME[item.sport?.name?.toLowerCase()] === key);
          initialSports[key] = userSport ? userSport.skill_level : 'Chưa biết';
        });

        setFormData({
          name: user?.profile?.full_name || user?.name || '',
          sports: initialSports,
          avatar_url: user?.profile?.avatar_url || '',
        });
        setAvatarFile(null);
        setAvatarPreview('');
      }
    } else {
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsSuccess(false); // Reset success state completely when modal hides
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user, isSuccess]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSportChange = (sport, level) => {
    setFormData(prev => ({
      ...prev,
      sports: { ...prev.sports, [sport]: level }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const avatarUrl = avatarFile ? await storageService.uploadImage(avatarFile) : formData.avatar_url;
      await onSave?.({ ...formData, avatar_url: avatarUrl });
      setAvatarFile(null);
      setAvatarPreview('');
      setIsSuccess(true);
      setTimeout(() => {
      onClose();
      // Reset flip after close animation finishes
      setTimeout(() => setIsSuccess(false), 300);
      }, 1000);
    } catch (error) {
      setSaveError(error.message || 'Không lưu được hồ sơ');
    }
  };

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
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
                className="relative perspective-1000 w-20 h-20"
              style={{ perspective: '1000px' }}
            >
              <div 
                className="w-full h-full transition-transform duration-700 ease-in-out"
                style={{ transformStyle: 'preserve-3d', transform: isSuccess ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* Front Face: Avatar */}
                <div 
                  className="absolute inset-0 overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30 group"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {(avatarPreview || formData.avatar_url) ? <img src={avatarPreview || formData.avatar_url} alt="Ảnh đại diện xem trước" className="h-full w-full object-cover" /> : (formData.name || user?.email || '').charAt(0).toUpperCase()}
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
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200">
              <ImagePlus className="h-3.5 w-3.5" />{avatarFile ? avatarFile.name : 'Đổi ảnh đại diện'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] || null; event.target.value = ''; setAvatarFile(file); setAvatarPreview(file ? URL.createObjectURL(file) : ''); }} />
            </label>
            <span className="mt-1 text-[10px] text-slate-400">Ảnh JPEG, PNG, WebP hoặc AVIF · tối đa 8 MB</span>
            {isSuccess && <span className="mt-2 text-xs font-bold text-green-500">{t('profile.updateSuccess')}</span>}
          </div>

          {/* Form Content (dims on success) */}
          <div className={`space-y-4 transition-all duration-700 ${isSuccess ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'}`}>
            {saveError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{saveError}</p>}
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
                  <div key={sport.key} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 pl-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sport.label}</span>
                    <select
                      value={formData.sports[sport.key] || 'Chưa biết'}
                      onChange={(e) => handleSportChange(sport.key, e.target.value)}
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
