import React, { useState, useEffect } from 'react';
import { User } from './types';
import { initializeStorage, getSessionUser, setSessionUser, getSettings, isMaintenanceActive, getMaintenanceSettings } from './utils/storage';
import { LoadingProvider } from './context/LoadingContext';
import { LoginView } from './views/LoginView';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { ClassesView } from './views/ClassesView';
import { MajorsView } from './views/MajorsView';
import { MasterViolationsView } from './views/MasterViolationsView';
import { TransactionPelanggaranView } from './views/TransactionPelanggaranView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { UsersView } from './views/UsersView';
import { BackupResetView } from './views/BackupResetView';
import { ClassPromotionView } from './views/ClassPromotionView';
import { MaintenanceConfigView } from './views/MaintenanceConfigView';
import { PasswordResetRequestsView } from './views/PasswordResetRequestsView';
import { MaintenancePage } from './components/MaintenancePage';
import { Wrench, ArrowRight } from 'lucide-react';

export default function App() {
  return (
    <LoadingProvider>
      <MainLayout />
    </LoadingProvider>
  );
}

function MainLayout() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize storage on mount
  useEffect(() => {
    initializeStorage();
    const session = getSessionUser();
    if (session) {
      setCurrentUser(session);
    }
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    setSessionUser(null);
    setCurrentUser(null);
  };

  const settings = getSettings();
  const maintenanceActive = isMaintenanceActive();
  const maintSettings = getMaintenanceSettings();

  // If user is not logged in, render Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // If Maintenance Mode is Active and logged-in user is NOT Admin:
  if (maintenanceActive && currentUser.role !== 'admin') {
    return (
      <MaintenancePage
        settings={maintSettings}
        schoolName={settings.schoolName || 'SMART POINT SISWA'}
        onRefresh={() => window.location.reload()}
        onAdminLoginClick={handleLogout}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors`}>
      
      {/* Top Banner for Admin when Maintenance Mode is Active */}
      {maintenanceActive && currentUser.role === 'admin' && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 animate-bounce shrink-0" />
            <span>MAINTENANCE MODE SAAT INI SEDANG AKTIF (Anda sedang mengakses sistem sebagai Administrator)</span>
          </div>
          <button
            onClick={() => setActiveTab('maintenance-config')}
            className="px-3 py-1 bg-slate-950 text-amber-300 hover:bg-slate-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
          >
            Atur Pemeliharaan <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          role={currentUser.role}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Navbar */}
          <Navbar
            user={currentUser}
            onLogout={handleLogout}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            schoolName={settings.schoolName}
          />

          {/* View Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
            {activeTab === 'dashboard' && (
              <DashboardView onNavigateTab={(tab) => setActiveTab(tab)} />
            )}

            {activeTab === 'students' && (
              <StudentsView role={currentUser.role} userName={currentUser.name} />
            )}

            {activeTab === 'classes' && (
              <ClassesView role={currentUser.role} userName={currentUser.name} />
            )}

            {activeTab === 'majors' && (
              <MajorsView role={currentUser.role} userName={currentUser.name} />
            )}

            {activeTab === 'master-violations' && (
              <MasterViolationsView role={currentUser.role} userName={currentUser.name} />
            )}

            {activeTab === 'input-violation' && (
              <TransactionPelanggaranView
                role={currentUser.role}
                userName={currentUser.name}
                currentUser={currentUser}
                onSuccessNavigate={() => setActiveTab('reports')}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView role={currentUser.role} userName={currentUser.name} />
            )}

            {activeTab === 'users' && (
              <UsersView role={currentUser.role} userName={currentUser.name} onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)} />
            )}

            {activeTab === 'password-reset-requests' && (
              <PasswordResetRequestsView role={currentUser.role} userName={currentUser.name} onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)} />
            )}

            {activeTab === 'settings' && (
              <SettingsView role={currentUser.role} userName={currentUser.name} />
            )}

            {activeTab === 'maintenance-config' && (
              <MaintenanceConfigView role={currentUser.role} userName={currentUser.name} onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)} />
            )}

            {activeTab === 'class-promotion' && (
              <ClassPromotionView role={currentUser.role} userName={currentUser.name} onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)} />
            )}

            {activeTab === 'backup-reset' && (
              <BackupResetView role={currentUser.role} userName={currentUser.name} onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)} />
            )}
          </main>
        </div>
      </div>

    </div>
  );
}

