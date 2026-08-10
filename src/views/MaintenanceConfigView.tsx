import React, { useState, useEffect } from 'react';
import { UserRole, MaintenanceSettings, MaintenanceHistoryItem } from '../types';
import { 
  getMaintenanceSettings, 
  saveMaintenanceSettings, 
  enableMaintenanceMode, 
  disableMaintenanceMode, 
  getMaintenanceHistory 
} from '../utils/storage';
import { ApiService } from '../services/api';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';
import { MaintenancePage } from '../components/MaintenancePage';
import { 
  Wrench, ShieldAlert, CheckCircle2, Clock, Eye, Save, Power, 
  RotateCcw, History, HelpCircle, ArrowLeft, Info, AlertTriangle, 
  Sliders, ShieldCheck, Lock, FileSpreadsheet, Sparkles
} from 'lucide-react';

interface MaintenanceConfigViewProps {
  role: UserRole;
  userName: string;
  onNavigateTab: (tab: string) => void;
}

export const MaintenanceConfigView: React.FC<MaintenanceConfigViewProps> = ({
  role,
  userName,
  onNavigateTab
}) => {
  // Access Control: Only Admin
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 shadow-lg border border-red-200 dark:border-red-800">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">403 Forbidden</h1>
        <p className="text-base text-slate-600 dark:text-slate-400 mb-6 max-w-md">
          Akses Ditolak. Modul Konfigurasi Pemeliharaan (Maintenance Mode) hanya dapat diakses oleh Administrator Sistem.
        </p>
        <button
          onClick={() => onNavigateTab('dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </button>
      </div>
    );
  }

  // Form & System State
  const [formData, setFormData] = useState<MaintenanceSettings>(getMaintenanceSettings());
  const [historyItems, setHistoryItems] = useState<MaintenanceHistoryItem[]>(getMaintenanceHistory());
  const [activeTab, setActiveTab] = useState<'config' | 'history' | 'guide'>('config');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // SweetAlert Modal Config
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    onConfirm?: () => void,
    showCancel: boolean = false,
    confirmText: string = 'Ya, Lanjutkan',
    cancelText: string = 'Batal'
  ) => {
    setAlertConfig({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel,
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const reloadData = () => {
    const current = getMaintenanceSettings();
    setFormData(current);
    setHistoryItems(getMaintenanceHistory());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleChange = (field: keyof MaintenanceSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save Settings
  const handleSaveConfig = () => {
    setIsSaving(true);
    ApiService.setMaintenanceMode(formData.status === 'Aktif', formData, userName, role).then(res => {
      setIsSaving(false);
      if (res.success) {
        saveMaintenanceSettings(formData, userName);
        showAlert(
          'success',
          'Konfigurasi Disimpan!',
          res.message || 'Pengaturan Maintenance Mode berhasil diperbarui dan disinkronkan dengan Google Spreadsheet.'
        );
      } else {
        showAlert('error', 'Gagal Menyimpan', res.message || 'Gagal menyimpan konfigurasi ke Google Apps Script.');
      }
    }).catch(err => {
      setIsSaving(false);
      showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal terhubung ke backend.');
    });
  };

  // Enable Maintenance Mode
  const handleEnableMode = () => {
    showAlert(
      'warning',
      'Aktifkan Maintenance Mode?',
      `Anda akan menonaktifkan sementara akses aplikasi untuk seluruh pengguna selain Administrator.\n\n` +
      `• Judul: ${formData.title}\n` +
      `• Jadwal Mulai: ${formData.startTime}\n` +
      `• Estimasi Selesai: ${formData.endTime || 'Manual'}\n\n` +
      `Pengguna yang sedang login akan diarahkan ke Halaman Pemeliharaan.`,
      async () => {
        setIsSaving(true);
        try {
          const res = await ApiService.setMaintenanceMode(true, { ...formData, status: 'Aktif' }, userName, role);
          if (res.success) {
            const updated = enableMaintenanceMode(formData, userName, role);
            setFormData(updated);
            setHistoryItems(getMaintenanceHistory());
            showAlert(
              'success',
              'Maintenance Mode Aktif!',
              res.message || 'Aplikasi kini dalam mode pemeliharaan di Google Spreadsheet.'
            );
          } else {
            showAlert('error', 'Gagal Mengaktifkan Mode', res.message || 'Gagal mengubah status di Google Apps Script.');
          }
        } catch (err: any) {
          showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal terhubung ke backend.');
        } finally {
          setIsSaving(false);
        }
      },
      true,
      'Ya, Aktifkan Maintenance Mode',
      'Batal'
    );
  };

  // Disable Maintenance Mode
  const handleDisableMode = () => {
    showAlert(
      'info',
      'Nonaktifkan Maintenance Mode?',
      'Apakah Anda yakin ingin mematikan Maintenance Mode dan mengembalikan akses normal untuk seluruh pengguna?',
      async () => {
        setIsSaving(true);
        try {
          const res = await ApiService.setMaintenanceMode(false, { ...formData, status: 'Nonaktif' }, userName, role);
          if (res.success) {
            const updated = disableMaintenanceMode(userName, role);
            setFormData(updated);
            setHistoryItems(getMaintenanceHistory());
            showAlert(
              'success',
              'Aplikasi Kembali Normal!',
              res.message || 'Maintenance Mode berhasil dimatikan di Google Spreadsheet.'
            );
          } else {
            showAlert('error', 'Gagal Mematikan Mode', res.message || 'Gagal mengubah status di Google Apps Script.');
          }
        } catch (err: any) {
          showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal terhubung ke backend.');
        } finally {
          setIsSaving(false);
        }
      },
      true,
      'Ya, Matikan Maintenance Mode',
      'Batal'
    );
  };

  const isModeActive = formData.status === 'Aktif';

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 rounded-md border border-amber-200 dark:border-amber-800">
              Pengaturan Sistem
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Admin Only</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1 flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-500" /> Konfigurasi Pemeliharaan (Maintenance Mode)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola status pemeliharaan sistem, pesan notifikasi pengguna, dan jadwal downtime aplikasi.
          </p>
        </div>

        {/* Live Status Badge & Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-end">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Status Sistem</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mt-0.5 ${
              isModeActive 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isModeActive ? 'bg-red-500' : 'bg-emerald-500'}`} />
              {isModeActive ? 'MAINTENANCE MODE' : 'SISTEM NORMAL'}
            </span>
          </div>

          <button
            onClick={isModeActive ? handleDisableMode : handleEnableMode}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 ${
              isModeActive
                ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isModeActive ? 'Matikan Mode' : 'Aktifkan Mode'}
          </button>
        </div>
      </div>

      {/* Top Warning Banner if Active */}
      {isModeActive && (
        <div className="bg-red-500/10 border-2 border-red-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500 text-white rounded-xl shadow-md shrink-0">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-red-700 dark:text-red-300 uppercase tracking-wide">
                MAINTENANCE MODE SAAT INI SEDANG AKTIF!
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Pengguna non-admin diblokir dari akses CRUD dan diarahkan ke Halaman Pemeliharaan.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
          >
            <Eye className="w-4 h-4" /> Pratinjau Tampilan User
          </button>
        </div>
      )}

      {/* Grid Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Pemeliharaan</span>
            <div className={`text-xl font-extrabold mt-1 ${isModeActive ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formData.status}
            </div>
            <span className="text-[11px] text-slate-400">Target Akses: {formData.allowAdminAccess ? 'Admin Sahaja' : 'Blokir Total'}</span>
          </div>
          <div className={`p-3 rounded-xl ${isModeActive ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jadwal Pemeliharaan</span>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate max-w-[200px]">
              {formData.startTime ? formData.startTime.replace('T', ' ') : '-'}
            </div>
            <span className="text-[11px] text-slate-400">Selesai: {formData.endTime ? formData.endTime.replace('T', ' ') : 'Manual'}</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Terakhir Diperbarui</span>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formData.lastUpdated ? new Date(formData.lastUpdated).toLocaleString('id-ID') : '-'}
            </div>
            <span className="text-[11px] text-slate-400">Oleh: {formData.updatedBy || 'System'}</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Tabs Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden">
        
        {/* Navigation Tab Bar */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 pt-4 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Konfigurasi Form
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat Maintenance ({historyItems.length})
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Panduan & Aturan Integrasi
          </button>
        </div>

        {/* TAB 1: Configuration Form */}
        {activeTab === 'config' && (
          <div className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Primary Notice Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" /> Konten Pemberitahuan Publik
                </h3>

                {/* Status Switch */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Mode Pemeliharaan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as 'Aktif' | 'Nonaktif')}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Nonaktif">Nonaktif (Sistem Berjalan Normal)</option>
                    <option value="Aktif">Aktif (Sistem Dalam Pemeliharaan)</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Judul Pemberitahuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Contoh: Aplikasi Sedang Dalam Pemeliharaan"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pesan Detail Pemeliharaan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    placeholder="Contoh: Maaf, aplikasi sedang dilakukan pemeliharaan dan pembaruan sistem. Silakan coba kembali beberapa saat lagi."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Internal Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Internal Admin (Hanya Terlihat Oleh Admin)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.internalNote || ''}
                    onChange={(e) => handleChange('internalNote', e.target.value)}
                    placeholder="Contoh: Backup database & update Apps Script ke versi 2.4."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

              </div>

              {/* Right Column: Schedule & Security Permissions */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Waktu & Hak Akses Maintenance
                </h3>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Mulai Pemeliharaan
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Selesai (Estimasi / Opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime || ''}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Kosongkan jika waktu selesai tidak dapat dipastikan.</p>
                </div>

                {/* Show Countdown Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Tampilkan Live Countdown</span>
                    <span className="text-[11px] text-slate-400">Menampilkan hitung mundur detik pada halaman pemeliharaan.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.showCountdown}
                    onChange={(e) => handleChange('showCountdown', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Allow Admin Access Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Izinkan Admin Tetap Login</span>
                    <span className="text-[11px] text-slate-400">Admin tetap dapat login untuk melakukan pengujian saat maintenance.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowAdminAccess}
                    onChange={(e) => handleChange('allowAdminAccess', e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Allowed IP Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Izinkan IP Tertentu (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.allowedIp || ''}
                    onChange={(e) => handleChange('allowedIp', e.target.value)}
                    placeholder="Contoh: 180.252.12.1, 192.168.1.1"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Gunakan koma untuk memisahkan beberapa alamat IP.</p>
                </div>

              </div>

            </div>

            {/* Bottom Buttons Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors"
                >
                  <Eye className="w-4 h-4 text-amber-500" /> Pratinjau Talaman
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={isModeActive ? handleDisableMode : handleEnableMode}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all ${
                    isModeActive
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {isModeActive ? 'Matikan Maintenance Mode' : 'Aktifkan Maintenance Mode'}
                </button>

                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Maintenance History Table */}
        {activeTab === 'history' && (
          <div className="p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" /> Catatan Aktivasi & Pemeliharaan Sistem
              </h3>
              <span className="text-xs text-slate-500">Tercatat pada sheet <code>maintenance_history</code></span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Diaktifkan Oleh</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Judul Pemeliharaan</th>
                    <th className="py-3 px-4">Pesan Notifikasi</th>
                    <th className="py-3 px-4">Jadwal Mulai - Selesai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                  {historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada riwayat aktivasi Maintenance Mode.
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {item.date} {item.time}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{item.activatedBy}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.status === 'Aktif'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium max-w-[180px] truncate">{item.title}</td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[240px] truncate">
                          {item.message}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {item.startTime} ➔ {item.endTime || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: Guide */}
        {activeTab === 'guide' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  Aturan Keamanan Maintenance Mode
                </h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  <li><strong>Proteksi CRUD Massal</strong>: Saat Maintenance Mode Aktif, seluruh endpoint penambahan, perbaikan, dan penghapusan data diblokir di level backend Google Apps Script.</li>
                  <li><strong>Akses Terbatas Administrator</strong>: Jika Opsi "Izinkan Admin Tetap Login" diaktifkan, pengguna ber-role <code>admin</code> tetap dapat melakukan konfigurasi dan pengujian sistem.</li>
                  <li><strong>Penyimpanan Ganda (Cache & Sheet)</strong>: Konfigurasi disimpan pada sheet <code>settings</code> dan di-cache menggunakan <code>PropertiesService</code> untuk kecepatan repon backend.</li>
                  <li><strong>Audit Log Otomatis</strong>: Setiap aktivasi, deaktivasi, dan perubahan teks dicatat secara real-time pada sheet <code>activity_log</code> dan <code>maintenance_history</code>.</li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-500" />
                  Integrasi Google Apps Script
                </h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  <li><code>getMaintenanceStatus()</code> - Membaca status maintenance terkini dari cache / sheet settings.</li>
                  <li><code>checkMaintenanceBeforeRequest()</code> - Memvalidasi setiap request API sebelum memproses logika bisnis.</li>
                  <li><code>enableMaintenanceMode()</code> - Mengunci sistem dan mencatat batch pemeliharaan.</li>
                  <li><code>disableMaintenanceMode()</code> - Membuka kembali sistem dan memberitahukan pengguna.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Preview Fullscreen Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <MaintenancePage
            settings={formData}
            schoolName="SMART POINT SISWA - SMK BISA HEBAT"
            onRefresh={() => {
              showAlert('info', 'Pratinjau Refresh', 'Ini adalah simulasi refresh tombol pada halaman pemeliharaan.');
            }}
            onAdminLoginClick={() => {
              showAlert('info', 'Login Admin', 'Menu login Administrator diakses dari halaman pemeliharaan.');
            }}
            isPreview={true}
            onExitPreview={() => setIsPreviewModalOpen(false)}
          />
        </div>
      )}

      {/* SweetAlert Modal Dialog */}
      <SweetAlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />

    </div>
  );
};
