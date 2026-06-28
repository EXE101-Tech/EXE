import { Bell, Search, Menu, Sun, Moon, MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

export default function TopNavbar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  const { toggleChat } = useChat();
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if no preference
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const newDark = !prev;
      if (newDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newDark;
    });
  };

  const pathName = location.pathname.substring(1) || 'home';
  const pageTitle = pathName.charAt(0).toUpperCase() + pathName.slice(1);

  return (
    <nav className="h-20 px-6 flex items-center justify-between sticky top-0 z-30 bg-transparent backdrop-blur-sm">
      {/* Page Title & Breadcrumbs */}
      <div>
        <div className="flex items-center text-sm text-slate-500 dark:text-gray-400 mb-1">
          <span>Pages</span>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white capitalize">{pageTitle}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{pageTitle}</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search here..." 
            className="bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary/50 transition-colors w-64"
          />
        </div>

        <button onClick={toggleTheme} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors relative">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button onClick={toggleChat} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors relative">
          <MessageCircle className="w-5 h-5" />
        </button>

        <button className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_var(--theme-glow)]"></span>
        </button>

        <button className="md:hidden text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
