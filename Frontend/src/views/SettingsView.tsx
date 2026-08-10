import React, { useState } from 'react';
import { UserRole, SystemSettings, BackupHistoryItem } from '../types';
import { 
  getSettings, saveSettings, getActivityLogs, getFullBackupData, 
  restoreFullBackupData, resetAllPoints, logActivity, getDISCIPLINE_RULES 
} from '../utils/storage';
import { 
  Building2, Calendar, ShieldAlert, Lock, Palette, Database, Info,
  Save, RotateCcw, Upload, Download, Check, X, AlertTriangle, Loader2,
  Activity, Globe, Phone, Mail, UserCheck, Shield, Sparkles, FileText,
  Clock, RefreshCw, CheckCircle2, ShieldX, UserCog
} from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface SettingsViewProps {
  role: UserRole;
  userName: string;
}

type TabType = 'profil' | 'tahun_ajaran' | 'poin' | 'keamanan' | 'tampilan' | 'backup' | 'tentang';

export const SettingsView: React.FC<SettingsViewProps> = ({ role, userName }) => {
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [settings, setSettings] = useState<SystemSettings>(getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [logs] = useState(getActivityLogs());

  // Image Upload Previews
  const [logoPreview, setLogoPreview] = useState<string>(settings.schoolLogoUrl || '');
  const [faviconPreview, setFaviconPreview] = useState<string>(settings.faviconUrl || '');

  // SweetAlert State
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Access Control: 403 Forbidden for Non-Admin
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-5">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-950/60 rounded-3xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto border border-rose-200 dark:border-rose-800/60">
            <ShieldX className="w-10 h-10 animate-bounce" />
          </div>
          <div>
            <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-full uppercase tracking-wider">
              HTTP 403 Forbidden
            </span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-3">Akses Ditolak!</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Halaman <strong>Setting Sistem & Konfigurasi Aplikasi</strong> bersifat rahasia dan hanya dapat diakses oleh akun berkewenangan <strong>Administrator</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => window.location.hash = '#dashboard'}
              className="w-full py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs shadow-lg transition-all cursor-pointer"
            >
              Kembali ke Dashboard Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setLogoPreview(url);
      setSettings(prev => ({ ...prev, schoolLogoUrl: url }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Favicon Upload
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setFaviconPreview(url);
      setSettings(prev => ({ ...prev, faviconUrl: url }));
    };
    reader.readAsDataURL(file);
  };

  // Save Settings Handler with Comprehensive Validations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Required Fields Validation
    if (!settings.schoolName.trim()) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Nama Sekolah wajib diisi.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!settings.npsn.trim()) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'NPSN sekolah wajib diisi.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 2. Email Validation
    if (settings.schoolEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.schoolEmail.trim())) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Email Gagal',
        message: 'Format Email Sekolah tidak valid. Contoh: info@sekolah.sch.id',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 3. Website Validation
    if (settings.schoolWebsite.trim() && !/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{1,5})?(\/.*)?$/i.test(settings.schoolWebsite.trim())) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Website Gagal',
        message: 'Format URL Website Sekolah tidak valid. Contoh: https://sekolah.sch.id',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // 4. Phone Validation
    if (settings.schoolPhone.trim() && !/^[\d\s\-\(\)\+]+$/.test(settings.schoolPhone.trim())) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Telepon Gagal',
        message: 'Nomor Telepon hanya boleh berisi angka, spasi, tanda kurung, atau strip.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      saveSettings(settings);
      logActivity(userName, role, 'SIMPAN_SETTING_SISTEM', `Memperbarui konfigurasi sistem sekolah [Tahun: ${settings.academicYear}, Limit Poin: ${settings.pointThreshold}]`);
      setIsSaving(false);

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Pengaturan Disimpan!',
        message: 'Seluruh parameter konfigurasi aplikasi berhasil diperbarui dan disinkronkan ke database.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }, 400);
  };

  // Reset Settings to Default
  const handleResetSettings = () => {
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Reset Pengaturan ke Default?',
      message: 'Apakah Anda yakin ingin mengembalikan seluruh parameter konfigurasi ke standar awal pabrik?',
      showCancel: true,
      onConfirm: () => {
        const defaultSet = getSettings();
        setSettings(defaultSet);
        setLogoPreview(defaultSet.schoolLogoUrl);
        setFaviconPreview(defaultSet.faviconUrl);
        logActivity(userName, role, 'RESET_SETTING_SISTEM', 'Mereset konfigurasi sistem ke pengaturan default.');

        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Pengaturan Direset!',
          message: 'Konfigurasi telah dikembalikan ke nilai default.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };

  // Download Backup JSON
  const handleDownloadBackup = () => {
    const data = getFullBackupData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nowStr = new Date().toISOString().split('T')[0];
    a.download = `Backup_SMART_POINT_${nowStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Update Backup History
    const newHistory: BackupHistoryItem = {
      id: `bkp-${Date.now()}`,
      date: nowStr,
      time: new Date().toLocaleTimeString('id-ID'),
      type: 'Manual',
      user: userName,
      notes: 'Unduh file cadangan JSON sistem',
      size: `${(jsonStr.length / 1024).toFixed(1)} KB`
    };

    const updatedHistory = [newHistory, ...(settings.backupHistory || [])];
    const updatedSettings = { ...settings, backupHistory: updatedHistory };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    logActivity(userName, role, 'BACKUP_SETTINGS', 'Mengunduh file backup JSON database dan pengaturan.');
  };

  // Restore Backup JSON File
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'RESTORE DATABASE & SETTING?',
      message: `Anda akan memulihkan data dari file "${file.name}". Data saat ini akan ditimpa dengan data cadangan. Lanjutkan?`,
      showCancel: true,
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const json = JSON.parse(evt.target?.result as string);
            const ok = restoreFullBackupData(json);
            if (ok) {
              const freshSettings = getSettings();
              setSettings(freshSettings);
              setLogoPreview(freshSettings.schoolLogoUrl);
              setFaviconPreview(freshSettings.faviconUrl);
              logActivity(userName, role, 'RESTORE_SETTINGS', `Mengembalikan database dari file backup [${file.name}].`);

              setAlertState({
                isOpen: true,
                type: 'success',
                title: 'Restore Berhasil!',
                message: 'Database dan konfigurasi sistem berhasil dipulihkan dari file backup.',
                onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
              });
            }
          } catch (err) {
            setAlertState({
              isOpen: true,
              type: 'error',
              title: 'Gagal Restore!',
              message: 'File backup JSON tidak valid atau rusak. Pastikan struktur file sesuai.',
              onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
            });
          }
        };
        reader.readAsText(file);
      }
    });

    e.target.value = '';
  };

  // Reset All Points
  const handleResetPoints = () => {
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'RESET SELURUH POIN SISWA?',
      message: 'PERINGATAN DANGER: Seluruh transaksi poin pelanggaran siswa akan DIKOSONGKAN untuk awal tahun ajaran baru. Tindakan ini tidak dapat dibatalkan!',
      showCancel: true,
      onConfirm: () => {
        resetAllPoints();
        logActivity(userName, role, 'RESET_TOTAL_POIN', 'Melakukan reset total poin seluruh siswa untuk pergantian tahun ajaran.');
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Poin Berhasil Direset!',
          message: 'Seluruh poin pelanggaran siswa telah dikosongkan (0 poin) untuk tahun ajaran baru.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };

  const tabsConfig = [
    { id: 'profil' as TabType, label: 'Profil Sekolah', icon: Building2 },
    { id: 'tahun_ajaran' as TabType, label: 'Tahun Ajaran', icon: Calendar },
    { id: 'poin' as TabType, label: 'Pengaturan Poin', icon: ShieldAlert },
    { id: 'keamanan' as TabType, label: 'Pengguna & Keamanan', icon: Lock },
    { id: 'tampilan' as TabType, label: 'Tampilan Aplikasi', icon: Palette },
    { id: 'backup' as TabType, label: 'Backup & Restore', icon: Database },
    { id: 'tentang' as TabType, label: 'Tentang Aplikasi', icon: Info }
  ];

  const disciplineRules = getDISCIPLINE_RULES();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
            <UserCog className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-blue-500/30">
                Pusat Kontrol Sistem
              </span>
              <span className="text-slate-400 text-xs">• Version {settings.appVersion}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1">Setting Sistem & Konfigurasi</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola parameter sekolah, aturan poin, keamanan, hingga cadangan database tanpa mengubah kode program.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetSettings}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            title="Reset Pengaturan ke Default"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Semua Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Form Container */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* TAB 1: PROFIL SEKOLAH */}
        {activeTab === 'profil' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Identitas & Profil Sekolah</h2>
                <p className="text-xs text-slate-400">Pengaturan data utama sekolah yang dicetak pada laporan dan sertifikat.</p>
              </div>
            </div>

            {/* School Logo & Favicon Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              {/* Logo Sekolah */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Sekolah" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <label className="font-extrabold text-slate-800 dark:text-white block">Logo Utama Sekolah</label>
                  <p className="text-[11px] text-slate-400">Format PNG, JPG, atau WebP. Maks 2MB.</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-[11px] hover:bg-blue-100 border border-blue-200 dark:border-blue-800/60 cursor-pointer mt-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Baru</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Favicon Aplikasi */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <label className="font-extrabold text-slate-800 dark:text-white block">Favicon Aplikasi</label>
                  <p className="text-[11px] text-slate-400">Ikon kecil tab browser (32x32px).</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-[11px] hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60 cursor-pointer mt-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Favicon</span>
                    <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* School Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Sekolah *</label>
                <input
                  type="text"
                  required
                  value={settings.schoolName}
                  onChange={e => setSettings({ ...settings, schoolName: e.target.value })}
                  placeholder="SMK NEGERI 1 SMART POINT"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NPSN (Nomor Pokok Sekolah Nasional) *</label>
                <input
                  type="text"
                  required
                  value={settings.npsn}
                  onChange={e => setSettings({ ...settings, npsn: e.target.value })}
                  placeholder="20314589"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap Sekolah *</label>
                <input
                  type="text"
                  required
                  value={settings.schoolAddress}
                  onChange={e => setSettings({ ...settings, schoolAddress: e.target.value })}
                  placeholder="Jl. Pendidikan No. 45"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kabupaten / Kota</label>
                <input
                  type="text"
                  value={settings.regency}
                  onChange={e => setSettings({ ...settings, regency: e.target.value })}
                  placeholder="Kab. Wonosobo"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Provinsi</label>
                <input
                  type="text"
                  value={settings.province}
                  onChange={e => setSettings({ ...settings, province: e.target.value })}
                  placeholder="Jawa Tengah"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor Telepon Kantor</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={settings.schoolPhone}
                    onChange={e => setSettings({ ...settings, schoolPhone: e.target.value })}
                    placeholder="(0286) 321456"
                    className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Resmi Sekolah</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={settings.schoolEmail}
                    onChange={e => setSettings({ ...settings, schoolEmail: e.target.value })}
                    placeholder="info@sekolah.sch.id"
                    className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Website Sekolah</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={settings.schoolWebsite}
                    onChange={e => setSettings({ ...settings, schoolWebsite: e.target.value })}
                    placeholder="https://sekolah.sch.id"
                    className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Kepala Sekolah & Gelar</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={settings.headmasterName}
                    onChange={e => setSettings({ ...settings, headmasterName: e.target.value })}
                    placeholder="Drs. H. Ahmad Wijaya, M.Pd"
                    className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={settings.headmasterNip}
                  onChange={e => setSettings({ ...settings, headmasterNip: e.target.value })}
                  placeholder="19680512 199303 1 004"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TAHUN AJARAN */}
        {activeTab === 'tahun_ajaran' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Pengaturan Tahun Ajaran & Semester</h2>
                <p className="text-xs text-slate-400">Penetapan kalender akademik aktif untuk periode pencatatan poin kedisiplinan.</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="text-xs text-indigo-900 dark:text-indigo-200">
                <strong>Status Periode Aktif:</strong> Tahun Ajaran <strong className="underline">{settings.academicYear}</strong> Semester <strong className="underline">{settings.semester}</strong>. Hanya 1 tahun ajaran yang dapat berstatus aktif secara bersamaan.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tahun Ajaran Aktif *</label>
                <input
                  type="text"
                  required
                  value={settings.academicYear}
                  onChange={e => setSettings({ ...settings, academicYear: e.target.value })}
                  placeholder="2026/2027"
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-base dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Format baku: YYYY/YYYY (Contoh: 2026/2027)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Semester Aktif *</label>
                <select
                  value={settings.semester}
                  onChange={e => setSettings({ ...settings, semester: e.target.value as 'Ganjil' | 'Genap' })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-base dark:text-white"
                >
                  <option value="Ganjil">Semester Ganjil (Gasal)</option>
                  <option value="Genap">Semester Genap</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">Tentukan semester berjalan untuk rekapitulasi poin harian.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PENGATURAN POIN */}
        {activeTab === 'poin' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Batas Poin & Formula Kedisiplinan</h2>
                <p className="text-xs text-slate-400">Parameter ambang batas poin pelanggaran dan otomatisasi evaluasi status siswa.</p>
              </div>
            </div>

            {/* Threshold & Auto Calculation Switches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Batas Poin Maksimal (Threshold) *</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={500}
                  value={settings.pointThreshold}
                  onChange={e => setSettings({ ...settings, pointThreshold: Number(e.target.value) })}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-rose-600 text-lg"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Batas maksimal poin sebelum siswa direkomendasikan dikembalikan ke orang tua.</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">Hitung Otomatis Total Poin</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Penjumlahan poin pelanggaran harian secara real-time saat transaksi disimpan.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={settings.autoCalculatePoints}
                    onChange={e => setSettings({ ...settings, autoCalculatePoints: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {settings.autoCalculatePoints ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </label>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">Status Kedisiplinan Otomatis</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Perbarui status siswa (Baik, SP1, SP2, SP3, dll) secara otomatis berdasarkan range poin.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={settings.autoDisciplineStatus}
                    onChange={e => setSettings({ ...settings, autoDisciplineStatus: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {settings.autoDisciplineStatus ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </label>
              </div>
            </div>

            {/* Discipline Rules Informational Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Matriks Aturan Status Kedisiplinan Sekolah</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Informasi Rentang Poin & Tindakan Lanjutan</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Status Kedisiplinan</th>
                      <th className="p-3 text-center">Rentang Poin</th>
                      <th className="p-3">Tingkat Peringatan (SP)</th>
                      <th className="p-3">Tindakan Lanjutan BK & Kesiswaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80 font-medium">
                    {disciplineRules.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${rule.badgeClass}`}>
                            {rule.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {idx === 0 && '0 - 24'}
                          {idx === 1 && '25 - 49'}
                          {idx === 2 && '50 - 74'}
                          {idx === 3 && '75 - 89'}
                          {idx === 4 && '90 - 99'}
                          {idx === 5 && '≥ 100'}
                        </td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{rule.warningLevel}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{rule.followUp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PENGGUNA & KEAMANAN */}
        {activeTab === 'keamanan' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Pengguna & Keamanan Sistem</h2>
                <p className="text-xs text-slate-400">Kebijakan durasi sesi login, percobaan kata sandi, dan rekam audit log.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Durasi Session Login (Menit)</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={settings.sessionTimeoutMinutes}
                    onChange={e => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Waktu kedaluwarsa sesi pengguna otomatis jika tidak aktif.</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Maksimum Percobaan Login Gagal</label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={settings.maxLoginAttempts}
                  onChange={e => setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Batas toleransi salah password sebelum akun diblokir sementara.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">Auto Logout Inaktif</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Keluar otomatis jika tidak ada aktivitas pengguna.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoLogoutInactive}
                    onChange={e => setSettings({ ...settings, autoLogoutInactive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">Wajib Ganti Password</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Perintahkan ganti password pada login pertama.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.forcePasswordChangeFirstLogin}
                    onChange={e => setSettings({ ...settings, forcePasswordChangeFirstLogin: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">Aktifkan Audit Log</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Catat seluruh riwayat aksi ke sheet activity_log.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLog}
                    onChange={e => setSettings({ ...settings, enableAuditLog: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TAMPILAN APLIKASI */}
        {activeTab === 'tampilan' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Tampilan & Branding Aplikasi</h2>
                <p className="text-xs text-slate-400">Penyesuaian nama aplikasi, tema warna, dan antarmuka visual.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Aplikasi *</label>
                <input
                  type="text"
                  required
                  value={settings.appName}
                  onChange={e => setSettings({ ...settings, appName: e.target.value })}
                  placeholder="SMART POINT SISWA"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tema Warna Antarmuka</label>
                <select
                  value={settings.theme}
                  onChange={e => setSettings({ ...settings, theme: e.target.value as 'Light' | 'Dark' | 'System' })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                >
                  <option value="Light">Terang (Light Theme)</option>
                  <option value="Dark">Gelap (Dark Theme)</option>
                  <option value="System">Mengikuti Sistem Perangkat</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Warna Utama (Primary Accent Color)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-12 h-10 rounded-xl border border-slate-300 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tampilkan Logo di Dashboard</label>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Tampilkan Logo Sekolah</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showLogoOnDashboard}
                      onChange={e => setSettings({ ...settings, showLogoOnDashboard: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BACKUP & RESTORE */}
        {activeTab === 'backup' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Backup & Pemulihan Database</h2>
                <p className="text-xs text-slate-400">Pencadangan file JSON spreadsheet, pemulihan data, dan pembersihan poin tahun ajaran.</p>
              </div>
            </div>

            {/* Backup Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Cadangkan Database (Backup JSON)</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unduh seluruh data siswa, kelas, jurusan, jenis pelanggaran, transaksi poin, dan konfigurasi sistem ke dalam 1 file JSON terenkripsi.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup Database (.json)</span>
                </button>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Pulihkan dari File Backup (Restore)</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unggah file backup JSON untuk mengembalikan seluruh database ke kondisi sebelumnya. Konfirmasi wajib sebelum proses restore.
                </p>
                <label className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload & Restore Database</span>
                  <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                </label>
              </div>
            </div>

            {/* Danger Zone: Reset All Student Points */}
            <div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Reset Total Poin Siswa (Tahun Ajaran Baru)</h3>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
                Menghapus seluruh transaksi poin pelanggaran siswa sehingga poin kembali ke 0. Digunakan saat pergantian tahun ajaran baru.
              </p>
              <button
                type="button"
                onClick={handleResetPoints}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Total Poin Siswa ke 0</span>
              </button>
            </div>

            {/* Backup History Log Table */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Pencadangan Database (Backup Log)</span>
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Tanggal & Waktu</th>
                      <th className="p-3">Tipe Backup</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Catatan Aktivitas</th>
                      <th className="p-3 text-right">Ukuran File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80 font-medium">
                    {(settings.backupHistory || []).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {item.date} {item.time}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            item.type === 'Otomatis' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{item.user}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{item.notes}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{item.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: TENTANG APLIKASI */}
        {activeTab === 'tentang' && (
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center text-sky-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Tentang Aplikasi SMART POINT SISWA</h2>
                <p className="text-xs text-slate-400">Informasi versi rilis, arsitektur database, dan changelog pengembangan.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nama Aplikasi</span>
                <div className="text-sm font-black text-slate-800 dark:text-white mt-1">{settings.appName}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Versi Aplikasi</span>
                <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1">{settings.appVersion}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Versi Database</span>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">{settings.dbVersion}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Google Apps Script</span>
                <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1">{settings.gasVersion}</div>
              </div>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tim Pengembang:</span>
                <strong className="text-blue-400">{settings.developerName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tanggal Rilis Build:</span>
                <strong className="font-mono">{settings.buildDate}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Platform Backend:</span>
                <strong className="text-emerald-400">Google Apps Script & Google Spreadsheet Engine</strong>
              </div>
            </div>

            {/* Changelog Timeline */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Riwayat Pembaruan Versi (Changelog)</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-600 dark:text-blue-400 text-sm">v2.5.0 (Rilis Terbaru)</span>
                    <span className="text-[10px] font-mono text-slate-400">2026-07-29</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-0.5 pl-1">
                    <li>Modul Setting Sistem terpusat (Profil Sekolah, Tahun Ajaran, Limit Poin, Keamanan, Backup/Restore).</li>
                    <li>Template Excel Data Siswa, Import dengan preview validasi baris, dan Export Excel.</li>
                    <li>Peralihan otomatis Status Kedisiplinan & Peringatan SP berdasarkan rentang poin.</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-700 dark:text-slate-300">v2.0.0</span>
                    <span className="text-[10px] font-mono text-slate-400">2026-05-15</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-0.5 pl-1">
                    <li>Integrasi backend Google Apps Script dengan spreadsheet database.</li>
                    <li>Modul Laporan PDF & Sertifikat Penghargaan / Surat Peringatan.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Activity Logs Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Audit Log Aktivitas Sistem</h3>
              <p className="text-xs text-slate-400">Rekam jejak setiap aksi yang dilakukan oleh Admin & Tim Kesiswaan.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-xl">
            Total {logs.length} Log
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-extrabold sticky top-0">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Pengguna</th>
                <th className="p-3">Role</th>
                <th className="p-3">Aksi</th>
                <th className="p-3">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{log.userName}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      log.userRole === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {log.userRole}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SweetAlert Notification Modal */}
      <SweetAlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        showCancel={alertState.showCancel}
        onConfirm={alertState.onConfirm}
        onCancel={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
