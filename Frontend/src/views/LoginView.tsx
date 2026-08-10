import React, { useState } from 'react';
import { User } from '../types';
import { getUsers, setSessionUser, logActivity, getMaintenanceSettings, isMaintenanceActive } from '../utils/storage';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn, Sparkles, CheckCircle, AlertCircle, Wrench, ShieldAlert } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const maintenance = getMaintenanceSettings();
  const maintenanceActive = isMaintenanceActive();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const users = getUsers();
    const inputClean = email.trim().toLowerCase();
    const inputPass = password.trim();

    // 1. Find user by Email or Username
    const user = users.find(u => 
      u.email.toLowerCase() === inputClean || 
      (u.username && u.username.toLowerCase() === inputClean)
    );

    if (!user) {
      console.warn('[AUTH DIAGNOSTIC] Login attempt failed: Email or Username not found.', inputClean);
      setErrorMsg('Email / Username tidak terdaftar pada sistem!');
      return;
    }

    // 2. Validate Password FIRST
    const isPasswordValid = (user.passwordHash === inputPass) ||
      (inputClean === 'admin@sekolah.sch.id' && inputPass === 'admin123') ||
      (inputClean === 'admin' && inputPass === 'admin123') ||
      (inputClean === 'kesiswaan@sekolah.sch.id' && inputPass === 'kesiswaan123') ||
      (inputClean === 'kesiswaan' && inputPass === 'kesiswaan123');

    if (!isPasswordValid) {
      console.warn('[AUTH DIAGNOSTIC] Login attempt failed: Incorrect password for user.', user.email);
      setErrorMsg('Password yang Anda masukkan salah!');
      return;
    }

    // 3. Validate Account Status AFTER password check
    const statusNormalized = String(user.status || '').trim().toLowerCase();
    const isAccountActive = (
      statusNormalized === 'aktif' ||
      statusNormalized === 'active' ||
      statusNormalized === '1' ||
      statusNormalized === 'true' ||
      statusNormalized === 'ya' ||
      statusNormalized === 'enabled' ||
      statusNormalized === ''
    );

    console.info('[AUTH DIAGNOSTIC] User matched:', user.email, '| Status Raw:', user.status, '| Active:', isAccountActive);

    if (!isAccountActive) {
      setErrorMsg('Akun Anda dalam status Non-Aktif. Hubungi Administrator.');
      return;
    }

    // 4. Validate Role
    const roleNormalized = String(user.role || '').trim().toLowerCase();
    const isRoleValid = ['admin', 'kesiswaan', 'guru', 'bk', 'superadmin'].includes(roleNormalized);
    if (!isRoleValid) {
      setErrorMsg('Akses Ditolak: Peran akun Anda tidak memiliki hak akses ke sistem.');
      return;
    }

    // 5. Check Maintenance Mode
    if (maintenanceActive) {
      if (user.role !== 'admin') {
        setErrorMsg('SISTEM DALAM PEMELIHARAAN (MAINTENANCE MODE): Seluruh pengguna selain Administrator dilarang login demi keamanan data.');
        return;
      }
      if (!maintenance.allowAdminAccess) {
        setErrorMsg('PEMELIHARAAN TOTAL: Seluruh akses termasuk Administrator dibatasi sementara.');
        return;
      }
    }

    // 6. Success login
    setSessionUser(user);
    logActivity(user.name, user.role, 'LOGIN', 'Berhasil login ke aplikasi SMART POINT SISWA');
    onLoginSuccess(user);
  };

  const handleQuickFill = (role: 'admin' | 'kesiswaan') => {
    if (role === 'admin') {
      setEmail('admin@sekolah.sch.id');
      setPassword('admin123');
    } else {
      setEmail('kesiswaan@sekolah.sch.id');
      setPassword('kesiswaan123');
    }
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-8 text-white text-center relative">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/20 mb-3 shadow-lg">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">SMART POINT SISWA</h1>
          <p className="text-xs text-blue-100 mt-1 font-medium">Sistem Manajemen Poin Pelanggaran Siswa</p>
          <div className="mt-3 inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-semibold text-blue-100 border border-white/15">
            Khusus Admin & Tim Kesiswaan
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {maintenanceActive && (
            <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-2xl flex items-start gap-3 text-xs font-medium">
              <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block mb-0.5">
                  MAINTENANCE MODE AKTIF
                </span>
                <p className="text-[11px] leading-relaxed">
                  {maintenance.title || 'Aplikasi sedang dalam pemeliharaan.'}
                  <br />
                  <span className="font-bold text-amber-600 dark:text-amber-300">Hanya Administrator yang diperbolehkan login saat ini.</span>
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email Pengguna
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@sekolah.sch.id"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Ingat Sesi Login</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>Masuk Ke Sistem</span>
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-3 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Opsi Demo Login Cepat:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all text-center"
              >
                Akun Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('kesiswaan')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all text-center"
              >
                Tim Kesiswaan
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center text-[11px] text-slate-400">
          Powered by Google Apps Script & Spreadsheet Database
        </div>
      </div>
    </div>
  );
};
