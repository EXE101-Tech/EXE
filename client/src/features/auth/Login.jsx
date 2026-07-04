import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

function AuthPage({ defaultIsRegister = false }) {
  const [isFlipped, setIsFlipped] = useState(defaultIsRegister);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFlipped(defaultIsRegister);
  }, [defaultIsRegister]);

  const handleNavigate = (path) => (e) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      navigate(path);
    }, 400);
  };

  return (
    <div 
      className={`w-full h-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden page-fade-in ${isExiting ? 'page-fade-out' : ''}`}
      style={{ perspective: '1200px' }}
    >
      {/* Back to Home Button */}
      <a 
        href="/" 
        onClick={handleNavigate('/')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-slate-700 dark:text-white hover:text-brand-primary dark:hover:text-brand-primary hover:scale-105 transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold">Back to Home</span>
      </a>

      <div 
        className="relative w-full max-w-[420px] h-[680px] duration-700 ease-in-out"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
        }}
      >
        {/* Mặt trước: Đăng nhập */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[2.5rem] glass-panel flex flex-col overflow-y-auto scrollbar-hide theme-transition"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <LoginForm onShowRegister={() => setIsFlipped(true)} />
        </div>

        {/* Mặt sau: Đăng ký */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[2.5rem] glass-panel flex flex-col overflow-y-auto scrollbar-hide theme-transition"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <RegisterForm onShowLogin={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
