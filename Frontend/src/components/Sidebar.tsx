import React from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, Users, GraduationCap, AlertOctagon, 
  PlusCircle, FileSpreadsheet, Settings, UserCog, 
  Database, Layers, ShieldCheck, X, ChevronRight, TrendingUp, Wrench
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'majors'
  | 'master-violations'
  | 'input-violation'
  | 'reports'
  | 'settings'
  | 'class-promotion'
  | 'maintenance-config'
  | 'users'
  | 'backup-reset';

interface SidebarProps {
  role: UserRole;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile
}) => {
  const isAdmin = role === 'admin';

  interface MenuItem {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
    badge?: string;
  }

  const menuGroups: { groupName: string; items: MenuItem[] }[] = [
    {
      groupName: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'students', label: 'Data Siswa', icon: <Users className="w-4 h-4" /> }
      ]
    },
    {
      groupName: 'MASTER DATA',
      items: (
        [
          { id: 'classes' as ActiveTab, label: 'Data Kelas', icon: <GraduationCap className="w-4 h-4" />, adminOnly: true },
          { id: 'majors' as ActiveTab, label: 'Data Jurusan', icon: <Layers className="w-4 h-4" />, adminOnly: true },
          { id: 'master-violations' as ActiveTab, label: 'Master Pelanggaran', icon: <AlertOctagon className="w-4 h-4" />, adminOnly: true }
        ] as MenuItem[]
      ).filter(item => !item.adminOnly || isAdmin)
    },
    {
      groupName: 'TRANSAKSI POIN',
      items: [
        { id: 'input-violation', label: 'Input Pelanggaran', icon: <PlusCircle className="w-4 h-4 text-red-500" /> }
      ]
    },
    {
      groupName: 'LAPORAN',
      items: [
        { id: 'reports', label: 'Laporan Point', icon: <FileSpreadsheet className="w-4 h-4" /> }
      ]
    }
  ];

  if (isAdmin) {
    menuGroups.push({
      groupName: 'PENGATURAN & USER',
      items: [
        { id: 'settings', label: 'Setting Sistem', icon: <Settings className="w-4 h-4" /> },
        { id: 'maintenance-config', label: 'Konfigurasi Pemeliharaan', icon: <Wrench className="w-4 h-4 text-amber-400" /> },
        { id: 'class-promotion', label: 'Kenaikan Kelas', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
        { id: 'users', label: 'Kelola User', icon: <UserCog className="w-4 h-4" /> },
        { id: 'backup-reset', label: 'Backup & Reset', icon: <Database className="w-4 h-4" /> }
      ]
    });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-0 left-0 z-40 h-screen w-64 bg-[#1E293B] text-slate-300 
        flex flex-col shrink-0 transition-transform duration-300 ease-in-out border-r border-slate-700/50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight leading-none">SMART POINT</h1>
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-1">Sistem Poin Siswa</p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Banner */}
        <div className="px-6 py-2 bg-slate-900/40 border-b border-slate-700/30 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Akses</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isAdmin 
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' 
              : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
          }`}>
            {isAdmin ? 'Admin' : 'Kesiswaan'}
          </span>
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-500 mb-2 px-2">
                {group.groupName}
              </div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium
                        transition-colors cursor-pointer group
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-900/50 mt-auto border-t border-slate-700/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white">SMART POINT SISWA</div>
            <div className="text-[10px] text-slate-400">Google Apps Script & Sheet</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
        </div>
      </aside>
    </>
  );
};
