import { useState } from 'react';
import { UserPlus, CheckCircle, Mail, Eye, EyeOff } from 'lucide-react';
import { validateEmail, validatePassword } from '../../../shared/utils/validators';

import { useAuth } from '../../../shared/context/AuthContext';

function RegisterForm({ onShowLogin }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ và tên';
    
    const emailErr = validateEmail(form.email);
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
      await register({
        email: form.email,
        password: form.password,
        name: form.name
      });
      setIsSuccess(true);
    } catch (err) {
      setErrors({ general: err.message || 'Đăng ký thất bại, vui lòng thử lại' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full bg-white/10 border rounded-xl px-4 py-3 text-white text-sm placeholder-blue-200/60 outline-none transition-colors backdrop-blur-sm ${
      errors[field] ? 'border-red-400' : 'border-white/20 focus:border-white focus:bg-white/20'
    }`;

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.4)] animate-[bounce_1s_ease-in-out]">
          <CheckCircle className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-150">Đăng ký<br/>Thành công!</h2>
        <p className="text-blue-100 text-sm mb-8 px-4 animate-in fade-in duration-500 delay-300">
          Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu!
        </p>
        <button
          onClick={onShowLogin}
          className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-blue-600 font-bold py-3.5 rounded-2xl transition-all shadow-lg text-base animate-in slide-in-from-bottom-4 duration-500 delay-500"
        >
          Quay lại Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-full my-auto">
      <div className="flex flex-col flex-1 w-full pt-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
            <UserPlus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Tạo tài khoản</h2>
            <p className="text-blue-100/80 text-xs mt-0.5">Hành trình bắt đầu từ đây</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col w-full space-y-3 pb-4">
          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">Họ và tên</label>
            <input
              type="text"
              value={form.name}
              onChange={onChange('name')}
              placeholder="Nguyễn Văn A"
              className={inputCls('name')}
            />
            {errors.name && <p className="text-red-300 text-[10px] mt-1 pl-1 font-medium">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={onChange('email')}
              placeholder="your@email.com"
              className={inputCls('email')}
            />
            {errors.email && <p className="text-red-300 text-[10px] mt-1 pl-1 font-medium">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={onChange('password')}
                  placeholder="Tối thiểu 6 ký tự"
                  className={inputCls('password') + " pr-9"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-300 text-[10px] mt-1 pl-1 font-medium">{errors.password}</p>}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1">Xác nhận MK</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  placeholder="Nhập lại"
                  className={inputCls('confirmPassword') + " pr-9"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-300 text-[10px] mt-1 pl-1 font-medium">{errors.confirmPassword}</p>}
            </div>
          </div>

          {errors.general && (
            <p className="text-red-300 text-xs text-center font-medium mt-1">{errors.general}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-blue-600 font-bold py-3.5 rounded-xl transition-all shadow-lg text-sm mt-3"
          >
            {isLoading ? 'Đang xử lý...' : 'Hoàn tất Đăng ký'}
          </button>
        </form>
      </div>

      <div className="mt-auto text-center bg-black/10 w-[calc(100%+3rem)] sm:w-[calc(100%+4rem)] -mb-6 sm:-mb-8 py-5 rounded-b-[2.5rem]">
        <p className="text-blue-100 text-sm font-medium">
          Đã có tài khoản?{' '}
          <button 
            type="button" 
            onClick={onShowLogin}
            className="text-white hover:text-blue-200 font-bold underline transition-colors"
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
