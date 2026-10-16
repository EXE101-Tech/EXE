import { Outlet } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useState, useLayoutEffect } from 'react';
import Particles from '../../features/landing/components/Particles.jsx';

export default function PublicLayout() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('publicTheme') === 'dark');

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const newDark = !isDark;
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('publicTheme', newDark ? 'dark' : 'light');
    setIsDark(newDark);
  };

  return (
    <div className="sg-public">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles />
      </div>
      <div className="relative z-10 h-full w-full">
        <Outlet />
      </div>
      
      {/* Floating Theme Toggle for Public Pages */}
      <button 
        onClick={toggleTheme}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full glass-panel flex items-center justify-center text-slate-700 dark:text-white hover:scale-110 transition-transform group shadow-[0_0_15px_var(--theme-glow)]"
        title="Toggle Theme"
      >
        {isDark ? (
          <Sun className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
        ) : (
          <Moon className="w-5 h-5 group-hover:text-brand-primary transition-colors" />
        )}
      </button>
    </div>
  );
}
