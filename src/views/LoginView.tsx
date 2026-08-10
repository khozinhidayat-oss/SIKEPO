import React, { useState } from 'react';
import { User } from '../types';
import { getUsers, setSessionUser, logActivity, getMaintenanceSettings, isMaintenanceActive, hashPassword, requestPasswordResetLocal } from '../utils/storage';
import { ApiService } from '../services/api';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn, CheckCircle, AlertCircle, Wrench, Loader2, KeyRound, X, Send, Phone, User as UserIcon, FileText } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Reset Password Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetForm, setResetForm] = useState({
    username: '',
    nama: '',
    nipNik: '',
    email: '',
    nomorWhatsapp: '',
    alasan: ''
  });

  const maintenance = getMaintenanceSettings();
  const maintenanceActive = isMaintenanceActive();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const inputClean = email.trim().toLowerCase();
    const inputPass = password.trim();

    try {
      // 1. Try Backend REST API Authentication (Google Apps Script Web App)
      const apiResult = await ApiService.login(inputClean, inputPass);

      if (apiResult && apiResult.data !== null && typeof apiResult.success === 'boolean') {
        if (!apiResult.success) {
          setErrorMsg(apiResult.message || 'Login gagal. Periksa kembali kredensial Anda.');
          setIsLoading(false);
          return;
        }

        if (apiResult.data && apiResult.data.user) {
          const remoteUser: User = apiResult.data.user;
          // Check Maintenance Mode for Remote User
          if (maintenanceActive && remoteUser.role !== 'admin') {
            setErrorMsg('SISTEM DALAM PEMELIHARAAN (MAINTENANCE MODE): Seluruh pengguna selain Administrator dilarang login.');
            setIsLoading(false);
            return;
          }
          setSessionUser(remoteUser);
          logActivity(remoteUser.name, remoteUser.role, 'LOGIN', 'Berhasil login melalui Backend Google Apps Script');
          onLoginSuccess(remoteUser);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback: Local Database Authentication (Strict verification against users table)
      const users = getUsers();
      const user = users.find(u => 
        u.email.toLowerCase() === inputClean || 
        (u.username && u.username.toLowerCase() === inputClean)
      );

      if (!user) {
        setErrorMsg('Email / Username tidak terdaftar pada database sistem!');
        setIsLoading(false);
        return;
      }

      // Strict Password Hash / Plain Check against Database record
      const hashedInput = hashPassword(inputPass);
      const isPasswordValid = Boolean(
        user.passwordHash && (user.passwordHash === inputPass || user.passwordHash === hashedInput)
      );

      if (!isPasswordValid) {
        setErrorMsg('Kata sandi yang Anda masukkan salah!');
        setIsLoading(false);
        return;
      }

      // Validate Account Status
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

      if (!isAccountActive) {
        setErrorMsg('Akun Anda dalam status Non-Aktif. Silakan hubungi Administrator.');
        setIsLoading(false);
        return;
      }

      // Validate Role
      const roleNormalized = String(user.role || '').trim().toLowerCase();
      const isRoleValid = ['admin', 'kesiswaan', 'guru', 'bk', 'superadmin'].includes(roleNormalized);
      if (!isRoleValid) {
        setErrorMsg('Akses Ditolak: Peran akun Anda tidak memiliki hak akses ke sistem.');
        setIsLoading(false);
        return;
      }

      // Check Maintenance Mode
      if (maintenanceActive) {
        if (user.role !== 'admin') {
          setErrorMsg('SISTEM DALAM PEMELIHARAAN (MAINTENANCE MODE): Seluruh pengguna selain Administrator dilarang login.');
          setIsLoading(false);
          return;
        }
        if (!maintenance.allowAdminAccess) {
          setErrorMsg('PEMELIHARAAN TOTAL: Seluruh akses termasuk Administrator dibatasi sementara.');
          setIsLoading(false);
          return;
        }
      }

      // Success Login
      setSessionUser(user);
      logActivity(user.name, user.role, 'LOGIN', 'Berhasil autentikasi ke aplikasi SMART POINT SISWA');
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan saat memproses otentikasi: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setResetError(null);
    setResetSuccess(null);
    setResetForm({
      username: '',
      nama: '',
      nipNik: '',
      email: '',
      nomorWhatsapp: '',
      alasan: ''
    });
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    // Form Validations
    if (!resetForm.username.trim()) {
      setResetError('Username wajib diisi.');
      return;
    }
    if (!resetForm.nama.trim()) {
      setResetError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!resetForm.email.trim()) {
      setResetError('Email wajib diisi.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetForm.email.trim())) {
      setResetError('Format email tidak valid.');
      return;
    }
    if (!resetForm.nomorWhatsapp.trim()) {
      setResetError('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!resetForm.alasan.trim()) {
      setResetError('Alasan Reset Password wajib diisi.');
      return;
    }

    setIsSubmittingReset(true);

    try {
      // 1. Try Backend API
      const apiRes = await ApiService.requestPasswordReset({
        username: resetForm.username.trim(),
        nama: resetForm.nama.trim(),
        email: resetForm.email.trim().toLowerCase(),
        nomorWhatsapp: resetForm.nomorWhatsapp.trim(),
        alasan: resetForm.alasan.trim()
      });

      if (apiRes && typeof apiRes.success === 'boolean') {
        if (apiRes.success) {
          setResetSuccess(apiRes.message || 'Permintaan reset password berhasil dikirim. Silakan menunggu Administrator memproses permintaan Anda.');
          setIsSubmittingReset(false);
          return;
        } else {
          // If GAS API returned explicit failure message (e.g. user not found)
          if (apiRes.data !== null && apiRes.message) {
            setResetError(apiRes.message);
            setIsSubmittingReset(false);
            return;
          }
        }
      }

      // 2. Fallback to local storage verification and submit
      const localRes = requestPasswordResetLocal({
        username: resetForm.username.trim(),
        nama: resetForm.nama.trim(),
        email: resetForm.email.trim().toLowerCase(),
        nomorWhatsapp: resetForm.nomorWhatsapp.trim(),
        alasan: resetForm.alasan.trim()
      });

      if (localRes.success) {
        setResetSuccess(localRes.message);
      } else {
        setResetError(localRes.message);
      }
    } catch (err: any) {
      setResetError('Gagal mengirim permintaan: ' + (err.message || 'Terjadi kesalahan koneksi'));
    } finally {
      setIsSubmittingReset(false);
    }
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
            Autentikasi Database Pengguna
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
                Email / Username
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin / admin@sekolah.sch.id"
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
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Masuk Ke Sistem</span>
                </>
              )}
            </button>

            {/* Lupa Password Link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleOpenResetModal}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Lupa Password? Ajukan Reset Password</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center text-[11px] text-slate-400">
          Terhubung ke Google Apps Script & Database Spreadsheet (users)
        </div>
      </div>

      {/* ================= MODAL LUPA PASSWORD / RESET REQUEST ================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Permintaan Reset Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ajukan verifikasi ke Administrator untuk mereset kata sandi Anda</p>
                </div>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Alert */}
            {resetError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{resetError}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {resetSuccess ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-50 dark:border-emerald-950/50 animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Permintaan Berhasil Dikirim</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-2">
                    {resetSuccess}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Tutup Dialog
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {/* Username & Nama Lengkap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: admin / kesiswaan"
                        value={resetForm.username}
                        onChange={e => setResetForm(p => ({ ...p, username: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Drs. Hendra Wijaya"
                      value={resetForm.nama}
                      onChange={e => setResetForm(p => ({ ...p, nama: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* NIP/NIK & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NIP / NIK Petugas <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 19850315..."
                      value={resetForm.nipNik}
                      onChange={e => setResetForm(p => ({ ...p, nipNik: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Akun <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="email@sekolah.sch.id"
                        value={resetForm.email}
                        onChange={e => setResetForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={resetForm.nomorWhatsapp}
                      onChange={e => setResetForm(p => ({ ...p, nomorWhatsapp: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Alasan Reset Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alasan Reset Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <textarea
                      required
                      rows={3}
                      placeholder="Contoh: Lupa password baru setelah update perangkat HP atau lupa kata sandi akun..."
                      value={resetForm.alasan}
                      onChange={e => setResetForm(p => ({ ...p, alasan: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReset ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim Permintaan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Kirim Permintaan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
