import React from 'react';
import { User } from '../types';
import { 
  LogOut, Menu, Moon, Sun
} from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  schoolName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
  isDarkMode,
  onToggleDarkMode,
  schoolName
}) => {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-xs transition-colors">
      {/* Left: Sidebar Toggle & School Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="text-slate-400">Sekolah</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 dark:text-slate-100 font-semibold text-xs truncate max-w-[240px]">
            {schoolName}
          </span>
        </div>
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

        {/* User Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
              {user.name}
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">
              {user.role === 'admin' ? 'Administrator System' : 'Kesiswaan Online'}
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Keluar / Logout"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
