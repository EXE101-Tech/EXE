import { Bell, Search, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function TopNavbar() {
  const location = useLocation();
  
  // Format pathname to display as Title
  const pathName = location.pathname.substring(1) || 'home';
  const pageTitle = pathName.charAt(0).toUpperCase() + pathName.slice(1);

  return (
    <nav className="h-20 px-6 flex items-center justify-between sticky top-0 z-30 bg-transparent backdrop-blur-sm">
      {/* Page Title & Breadcrumbs */}
      <div>
        <div className="flex items-center text-sm text-gray-400 mb-1">
          <span>Pages</span>
          <span className="mx-2">/</span>
          <span className="text-white capitalize">{pageTitle}</span>
        </div>
        <h1 className="text-xl font-bold text-white capitalize">{pageTitle}</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search here..." 
            className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary/50 transition-colors w-64"
          />
        </div>

        <button className="text-gray-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_var(--theme-glow)]"></span>
        </button>

        <button className="md:hidden text-gray-400 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
