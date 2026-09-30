import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { validateGmailEmail, validatePassword } from '../../../shared/utils/validators';

import { useAuth } from '../../../shared/context/AuthContext';

function RegisterForm({ onShowLogin }) {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const googleCodeClientRef = useRef(null);
  const googleCallbackRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    googleCallbackRef.current = async (code) => {
      if (!code) {
        setErrors({ general: 'Google không trả về thông tin đăng nhập. Vui lòng thử lại.' });
        return;
      }
      setErrors({});
      setIsLoading(true);
      try {
        const result = await loginWithGoogle(code);
        if (result?.is_new_user) {
          localStorage.setItem('sportgo-onboarding-pending', String(result.user.id));
          navigate('/onboarding');
          return;
        }
        setIsSuccess(true);
        setTimeout(() => navigate(result?.user?.isAdmin ? '/admin' : '/home'), 1200);
      } catch (err) {
        setErrors({ general: err.message || 'Không thể đăng ký bằng Google. Vui lòng thử lại.' });
      } finally {
        setIsLoading(false);
      }
    };
    return () => { googleCallbackRef.current = null; };
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (!googleClientId) return undefined;

    let cancelled = false;
    const onLoad = () => {
      if (cancelled || !window.google?.accounts?.oauth2) return;
      googleCodeClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: (response) => {
          if (response.error) {
            setErrors({ general: 'Không thể đăng ký bằng Google. Vui lòng thử lại.' });
            return;
          }
          googleCallbackRef.current?.(response.code);
        },
        error_callback: (response) => {
          if (response.type === 'popup_failed_to_open') {
            setErrors({ general: 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup rồi thử lại.' });
          }
        },
      });
    };
    const onError = () => setErrors({ general: 'Không tải được dịch vụ đăng nhập Google. Vui lòng tải lại trang.' });

    let script = document.querySelector('script[data-google-identity="true"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      document.head.appendChild(script);
    }

    if (window.google?.accounts?.oauth2) onLoad();
    else {
      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
    }

    return () => {
      cancelled = true;
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
  }, [googleClientId, navigate]);

  const handleGoogleRegister = () => {
    setErrors((current) => ({ ...current, general: '' }));
    if (!googleCodeClientRef.current) {
      setErrors({ general: 'Dịch vụ đăng ký Google chưa sẵn sàng. Vui lòng tải lại trang.' });
      return;
    }
    googleCodeClientRef.current.requestCode();
  };

  const onChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ và tên';
    const emailErr = validateGmailEmail(form.email);
    if (emailErr) errs.email = emailErr;

    const pwErr = validatePassword(form.password);
    if (pwErr) errs.password = pwErr;

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(errs).length) { setErrors(errs); return; }
    
    setErrors({});
    setIsLoading(true);
    
    try {
      const result = await register({
        email: form.email,
        password: form.password,
        name: form.name,
      });
      localStorage.setItem('sportgo-onboarding-pending', String(result.user.id));
      navigate('/onboarding');
    } catch (err) {
      setErrors({ general: err.message || 'Đăng ký thất bại, vui lòng thử lại' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full bg-white dark:bg-white/10 border rounded-xl px-3.5 py-2 sm:px-4 sm:py-3 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 dark:placeholder-blue-200/60 outline-none transition-colors backdrop-blur-sm ${
      errors[field] ? 'border-red-400' : 'border-slate-200 dark:border-white/20 focus:border-brand-primary dark:focus:border-white focus:bg-slate-50 dark:focus:bg-white/20'
    }`;

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_var(--theme-glow)] animate-[bounce_1s_ease-in-out] theme-transition">
          <CheckCircle className="w-12 h-12 text-brand-primary theme-transition" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-150">Đăng ký<br/>Thành công!</h2>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-8 px-4 animate-in fade-in duration-500 delay-300">
          Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu!
        </p>
        <button
          onClick={onShowLogin}
          className="w-full bg-brand-primary hover:opacity-80 active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_0_20px_var(--theme-glow)] text-base animate-in slide-in-from-bottom-4 duration-500 delay-500 theme-transition"
        >
          Quay lại Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full flex-1">
      <div className="flex flex-col items-center flex-1 w-full p-4 sm:p-8 pt-1 sm:pt-2">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-6 mt-2 sm:mt-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_var(--theme-glow)] theme-transition">
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary theme-transition" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Tạo tài khoản</h2>
            <p className="text-slate-500 dark:text-gray-400 text-[11px] sm:text-xs mt-0.5">Hành trình bắt đầu từ đây</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col w-full space-y-2 sm:space-y-3 pb-2 sm:pb-4">
          {/* Họ và tên */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-gray-300 mb-0.5 sm:mb-1">Họ và tên</label>
            <input
              type="text"
              value={form.name}
              onChange={onChange('name')}
              placeholder="Nguyễn Văn A"
              className={inputCls('name')}
            />
            {errors.name && <p className="text-red-300 text-[10px] mt-0.5 sm:mt-1 pl-1 font-medium">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-gray-300 mb-0.5 sm:mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={onChange('email')}
              onBlur={() => {
                if (!form.email) return;
                setErrors((current) => ({ ...current, email: validateGmailEmail(form.email) || '' }));
              }}
              placeholder="you@gmail.com"
              className={inputCls('email')}
            />
            {errors.email && <p className="text-red-300 text-[10px] mt-0.5 sm:mt-1 pl-1 font-medium">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Mật khẩu */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-gray-300 mb-0.5 sm:mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={onChange('password')}
                  placeholder="Tối thiểu 6 ký tự"
                  className={inputCls('password') + " pr-8 sm:pr-9"}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/50 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-300 text-[10px] mt-0.5 sm:mt-1 pl-1 font-medium">{errors.password}</p>}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-gray-300 mb-0.5 sm:mb-1">Xác nhận MK</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  placeholder="Nhập lại"
                  className={inputCls('confirmPassword') + " pr-8 sm:pr-9"}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/50 dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-300 text-[10px] mt-0.5 sm:mt-1 pl-1 font-medium">{errors.confirmPassword}</p>}
            </div>
          </div>

          {errors.general && (
            <p className="text-red-300 text-xs text-center font-medium mt-1">{errors.general}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-primary hover:opacity-80 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3.5 rounded-xl transition-all shadow-[0_0_20px_var(--theme-glow)] text-xs sm:text-sm mt-2 sm:mt-3 theme-transition"
          >
            {isLoading ? 'Đang xử lý...' : 'Hoàn tất Đăng ký'}
          </button>
        </form>

        <div className="w-full mt-1 sm:mt-3">
          <div className="flex items-center gap-3 mb-2 sm:mb-3 opacity-70">
            <div className="flex-1 h-px bg-slate-300 dark:bg-white/30" />
            <span className="text-slate-500 dark:text-white text-[9px] sm:text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">Hoặc đăng ký qua Google</span>
            <div className="flex-1 h-px bg-slate-300 dark:bg-white/30" />
          </div>
          {googleClientId ? (
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-xl flex items-center justify-center gap-2 sm:gap-3 hover:bg-slate-50 dark:hover:bg-white/20 hover:scale-[1.01] transition-all backdrop-blur-sm text-slate-800 dark:text-white font-bold text-xs sm:text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Đăng ký qua Google</span>
            </button>
          ) : (
            <p className="text-center text-xs text-amber-600 dark:text-amber-300">Đăng ký Google chưa được cấu hình.</p>
          )}
        </div>
      </div>

      <div className="w-full mt-auto text-center bg-transparent dark:bg-black/30 py-3 sm:py-5 rounded-b-[2.5rem] border-t border-slate-200 dark:border-white/5">
        <p className="text-slate-600 dark:text-gray-400 text-xs sm:text-sm font-medium">
          Đã có tài khoản?{' '}
          <button 
            type="button" 
            onClick={onShowLogin}
            className="text-brand-primary dark:text-white hover:text-brand-secondary dark:hover:text-brand-primary font-bold underline transition-colors"
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
