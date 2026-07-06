import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { validateEmail } from '../../../shared/utils/validators';

const SOCIAL_BUTTONS = [
  {
    key: 'google',
    label: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
];

import { useAuth } from '../../../shared/context/AuthContext';
import { useTranslation } from 'react-i18next';

function LoginForm({ onShowRegister }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Tạm thời comment validate email & password theo yêu cầu:
    /*
    const errs = {};
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    if (!form.password)
      errs.password = t('auth.passwordRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    */
    
    setErrors({});
    setIsLoading(true);
    
    try {
      await login(form);
      setIsSuccess(true);
      // Wait for success animation before navigating
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      setErrors({ general: err.message || t('auth.invalidCredentials') });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full bg-white dark:bg-white/10 border rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3.5 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 dark:placeholder-blue-200/60 outline-none transition-colors backdrop-blur-sm ${
      errors[field] ? 'border-red-400' : 'border-slate-200 dark:border-white/20 focus:border-brand-primary dark:focus:border-white focus:bg-slate-50 dark:focus:bg-white/20'
    }`;

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_var(--theme-glow)] animate-[bounce_1s_ease-in-out] border border-slate-200 dark:border-white/10 theme-transition">
          <CheckCircle className="w-12 h-12 text-brand-primary theme-transition" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-150 whitespace-pre-line">{t('auth.loginSuccessTitle')}</h2>
        <p className="text-slate-500 dark:text-gray-400 mt-2 animate-in fade-in duration-500 delay-300">{t('auth.redirecting')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full flex-1 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center flex-1 w-full p-5 sm:p-8">
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center mb-3 sm:mb-5 shadow-[0_0_20px_var(--theme-glow)] theme-transition">
        <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-brand-primary fill-brand-primary theme-transition" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t('auth.login')}</h2>
      <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1 mb-4 sm:mb-8 text-center">
        {t('auth.welcomeBack')}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col w-full space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1 sm:mb-1.5">{t('auth.email')}</label>
          <input
            type="email"
            value={form.email}
            onChange={onChange('email')}
            placeholder={t('auth.emailPlaceholder')}
            className={inputCls('email')}
          />
          {errors.email && <p className="text-red-300 text-[11px] sm:text-xs mt-1 sm:mt-1.5 pl-1 font-medium">{errors.email}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 sm:mb-1.5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-300">{t('auth.password')}</label>
            <button type="button" className="text-[11px] sm:text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-white/70 dark:hover:text-white transition-colors">{t('auth.forgotPassword')}</button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={onChange('password')}
              placeholder={t('auth.passwordPlaceholder')}
              className={inputCls('password') + " pr-12"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/50 dark:hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-red-300 text-[11px] sm:text-xs mt-1 sm:mt-1.5 pl-1 font-medium">{errors.password}</p>}
        </div>

        {errors.general && (
          <p className="text-red-300 text-xs sm:text-sm text-center font-medium mt-1.5 sm:mt-2">{errors.general}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-primary hover:opacity-80 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3.5 rounded-2xl transition-all shadow-[0_0_20px_var(--theme-glow)] text-sm sm:text-base mt-2 sm:mt-4 theme-transition"
        >
          {isLoading ? t('auth.processing') : t('auth.login')}
        </button>
      </form>

      <div className="mt-4 sm:mt-8 w-full">
        <div className="flex items-center gap-3 mb-3 sm:mb-5 opacity-70">
          <div className="flex-1 h-px bg-slate-300 dark:bg-white/30" />
          <span className="text-slate-500 dark:text-white text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">
            {t('auth.loginWith')}
          </span>
          <div className="flex-1 h-px bg-slate-300 dark:bg-white/30" />
        </div>
        <div className="flex justify-center">
          {SOCIAL_BUTTONS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              aria-label={`Đăng nhập bằng ${label}`}
              className="w-full py-2.5 sm:py-3.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-2xl flex items-center justify-center gap-2 sm:gap-3 hover:bg-slate-50 dark:hover:bg-white/20 hover:scale-[1.01] transition-all backdrop-blur-sm text-slate-800 dark:text-white font-bold text-xs sm:text-sm shadow-sm"
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>

      <div className="w-full mt-auto text-center bg-transparent dark:bg-black/30 py-3 sm:py-5 rounded-b-[2.5rem] border-t border-slate-200 dark:border-white/5">
        <p className="text-slate-600 dark:text-gray-400 text-xs sm:text-sm font-medium">
          {t('auth.dontHaveAccount')}{' '}
          <button 
            type="button" 
            onClick={onShowRegister}
            className="text-brand-primary dark:text-white hover:text-brand-secondary dark:hover:text-brand-primary font-bold underline transition-colors"
          >
            {t('auth.registerNow')}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
