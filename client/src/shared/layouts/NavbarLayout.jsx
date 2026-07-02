import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function NavbarLayout() {
  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative z-50 w-full overflow-x-hidden font-sans transition-colors duration-500 selection:bg-[#589470]/30 flex flex-col">
      <Navbar />
      <div className="flex-1 pt-[104px] sm:pt-[124px]">
        <Outlet />
      </div>
    </div>
  );
}
