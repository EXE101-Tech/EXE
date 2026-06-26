import { useState } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

function AuthPage() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-[#060B19] p-4"
      style={{ perspective: '1200px' }}
    >
      <div 
        className="relative w-full max-w-[420px] h-[680px] duration-700 ease-in-out"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
        }}
      >
        {/* Mặt trước: Đăng nhập */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-blue-800 shadow-[0_0_50px_rgba(37,99,235,0.3)] p-6 sm:p-8 flex flex-col overflow-y-auto scrollbar-hide"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <LoginForm onShowRegister={() => setIsFlipped(true)} />
        </div>

        {/* Mặt sau: Đăng ký */}
        <div 
          className="absolute inset-0 w-full h-full rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-900 shadow-[0_0_50px_rgba(37,99,235,0.3)] p-6 sm:p-8 flex flex-col overflow-y-auto scrollbar-hide"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <RegisterForm onShowLogin={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
