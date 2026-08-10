import React, { useState, useEffect } from 'react';
import { UserRole, PromotionPreviewItem, PromotionHistoryItem } from '../types';
import { 
  getSettings, 
  getPromotionPreview, 
  executeClassPromotion, 
  getPromotionHistory, 
  rollbackLastPromotion, 
  getNextAcademicYear 
} from '../utils/storage';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';
import { 
  ShieldAlert, TrendingUp, RefreshCw, Play, RotateCcw, 
  CheckCircle2, AlertTriangle, Info, ArrowRight, Search, 
  Filter, GraduationCap, History, Layers, ArrowLeft, Download,
  Check, XCircle, FileSpreadsheet, AlertOctagon, HelpCircle
} from 'lucide-react';

interface ClassPromotionViewProps {
  role: UserRole;
  userName: string;
  onNavigateTab: (tab: string) => void;
}

export const ClassPromotionView: React.FC<ClassPromotionViewProps> = ({
  role,
  userName,
  onNavigateTab
}) => {
  // Access control check: Only Admin can access
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 shadow-lg border border-red-200 dark:border-red-800">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">403 Forbidden</h1>
        <p className="text-base text-slate-600 dark:text-slate-400 mb-6 max-w-md">
          Akses Ditolak. Modul Kenaikan Kelas Otomatis hanya dapat diakses oleh Administrator Sistem.
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

  // State Management
  const currentSettings = getSettings();
  const [oldAcademicYear, setOldAcademicYear] = useState<string>(currentSettings.academicYear || '2026/2027');
  const [newAcademicYear, setNewAcademicYear] = useState<string>(getNextAcademicYear(currentSettings.academicYear || '2026/2027'));

  const [previewItems, setPreviewItems] = useState<PromotionPreviewItem[]>([]);
  const [historyItems, setHistoryItems] = useState<PromotionHistoryItem[]>([]);
  
  const [activeTab, setActiveTab] = useState<'simulation' | 'history' | 'guide'>('simulation');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // SweetAlert State
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

  // Load preview and history on mount and when academic years change
  const loadData = () => {
    const settings = getSettings();
    const currYear = settings.academicYear || '2026/2027';
    setOldAcademicYear(currYear);
    const nextYear = getNextAcademicYear(currYear);
    setNewAcademicYear(nextYear);

    const preview = getPromotionPreview(currYear, nextYear);
    setPreviewItems(preview);

    const hist = getPromotionHistory();
    setHistoryItems(hist);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSimulation = () => {
    if (!oldAcademicYear || !newAcademicYear) {
      showAlert('warning', 'Peringatan Data', 'Harap isi Tahun Ajaran Asal dan Tahun Ajaran Tujuan.');
      return;
    }

    if (oldAcademicYear.trim() === newAcademicYear.trim()) {
      showAlert('warning', 'Tahun Ajaran Sama', 'Tahun Ajaran Tujuan harus berbeda dari Tahun Ajaran Saat Ini.');
      return;
    }

    const preview = getPromotionPreview(oldAcademicYear, newAcademicYear);
    setPreviewItems(preview);
    showAlert('success', 'Simulasi Berhasil', `Simulasi kenaikan kelas berhasil dijalankan untuk ${preview.length} data siswa.`);
  };

  // Process Class Promotion Execution
  const handleExecutePromotion = () => {
    if (oldAcademicYear.trim() === newAcademicYear.trim()) {
      showAlert('error', 'Validasi Gagal', 'Tahun Ajaran Baru harus berbeda dan lebih tinggi dari Tahun Ajaran Lama.');
      return;
    }

    const readyItems = previewItems.filter(p => p.status === 'Siap Diproses' || p.status === 'Siap Lulus');
    const errorItems = previewItems.filter(p => p.status === 'Kelas Tujuan Tidak Ditemukan' || p.status === 'Data Tidak Lengkap');

    if (readyItems.length === 0) {
      showAlert('warning', 'Tidak Ada Data Siap Diproses', 'Tidak ditemukan siswa yang memenuhi syarat kenaikan kelas / kelulusan.');
      return;
    }

    let warningMsg = `Anda akan memproses Kenaikan Kelas secara massal:\n\n` +
      `• Tahun Ajaran: ${oldAcademicYear} ➔ ${newAcademicYear}\n` +
      `• Siswa Naik Kelas: ${previewItems.filter(p => p.status === 'Siap Diproses').length} siswa\n` +
      `• Siswa Lulus (Alumni): ${previewItems.filter(p => p.status === 'Siap Lulus').length} siswa`;

    if (errorItems.length > 0) {
      warningMsg += `\n\n⚠️ Catatan: Terdapat ${errorItems.length} siswa dengan status error (kelas tujuan tidak ditemukan / data tidak lengkap) yang TIDAK AKAN diproses.`;
    }

    showAlert(
      'warning',
      'Konfirmasi Kenaikan Kelas Massal',
      warningMsg,
      () => {
        // Start animated progress bar simulation
        setIsProcessing(true);
        setProgressPercent(10);

        const interval = setInterval(() => {
          setProgressPercent(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 20;
          });
        }, 150);

        setTimeout(() => {
          clearInterval(interval);
          setProgressPercent(100);

          setTimeout(() => {
            const res = executeClassPromotion(previewItems, oldAcademicYear, newAcademicYear, userName);
            setIsProcessing(false);
            setProgressPercent(0);

            if (res.success) {
              loadData();
              showAlert(
                'success',
                'Kenaikan Kelas Berhasil!',
                `Proses Kenaikan Kelas Massal selesai!\n\n` +
                `• Total Diproses: ${res.totalProcessed} siswa\n` +
                `• Berhasil Naik Kelas: ${res.totalPromoted} siswa\n` +
                `• Berhasil Lulus/Alumni: ${res.totalGraduated} siswa\n` +
                `• Tahun Ajaran Aktif baru: ${newAcademicYear}`
              );
            }
          }, 300);
        }, 1000);
      },
      true,
      'Proses Kenaikan Kelas Sekarang',
      'Batal'
    );
  };

  // Rollback Last Promotion
  const handleRollback = () => {
    const activeHistory = historyItems.filter(h => h.status !== 'Rollback');
    if (activeHistory.length === 0) {
      showAlert('info', 'Tidak Ada Batch', 'Tidak ada riwayat kenaikan kelas aktif yang dapat dibatalkan.');
      return;
    }

    const latestBatchId = activeHistory[0].batchId;
    const batchItems = historyItems.filter(h => h.batchId === latestBatchId && h.status !== 'Rollback');

    showAlert(
      'error',
      'PERINGATAN SANGAT PENTING (ROLLBACK)',
      `Apakah Anda yakin ingin membatalkan (rollback) proses kenaikan kelas terakhir?\n\n` +
      `• Batch ID: ${latestBatchId}\n` +
      `• Jumlah Siswa Terdampak: ${batchItems.length} siswa\n` +
      `• Mengembalikan ke Tahun Ajaran: ${batchItems[0]?.oldAcademicYear || 'Sebelumnya'}\n\n` +
      `Tindakan ini akan mengembalikan data kelas dan status seluruh siswa pada batch terakhir!`,
      () => {
        const res = rollbackLastPromotion(userName, role);
        if (res.success) {
          loadData();
          showAlert('success', 'Rollback Berhasil!', res.message);
        } else {
          showAlert('error', 'Gagal Rollback', res.message);
        }
      },
      true,
      'Ya, Batalkan Proses Terakhir',
      'Kembali'
    );
  };

  // Filter preview items
  const filteredPreview = previewItems.filter(item => {
    const matchSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.oldClassName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.newClassName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Filter history items
  const filteredHistory = historyItems.filter(item => {
    return (
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.oldClassName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.newClassName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Export to CSV helper
  const exportPreviewCsv = () => {
    const headers = ['NIS', 'Nama Siswa', 'Jurusan', 'Tahun Ajaran Lama', 'Tahun Ajaran Baru', 'Kelas Lama', 'Kelas Baru', 'Status', 'Catatan'];
    const rows = filteredPreview.map(p => [
      p.nis, p.name, p.majorName, p.oldAcademicYear, p.newAcademicYear, p.oldClassName, p.newClassName, p.status, p.statusNote || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(x => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Simulasi_Kenaikan_Kelas_${oldAcademicYear.replace('/', '-')}_ke_${newAcademicYear.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts
  const countReady = previewItems.filter(p => p.status === 'Siap Diproses').length;
  const countGrad = previewItems.filter(p => p.status === 'Siap Lulus').length;
  const countError = previewItems.filter(p => p.status === 'Kelas Tujuan Tidak Ditemukan' || p.status === 'Data Tidak Lengkap').length;
  const countAlumni = previewItems.filter(p => p.status === 'Sudah Alumni').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 rounded-md border border-emerald-200 dark:border-emerald-800">
              Modul Akademik
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Admin Only</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Kenaikan Kelas Otomatis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Proses pemindahan tingkat dan kelas siswa secara massal saat pergantian Tahun Ajaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          
          <button
            onClick={handleRollback}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Rollback Terakhir
          </button>

          <button
            onClick={handleExecutePromotion}
            disabled={isProcessing || (countReady === 0 && countGrad === 0)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all ${
              isProcessing || (countReady === 0 && countGrad === 0)
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            {isProcessing ? 'Memproses...' : 'Proses Kenaikan Kelas'}
          </button>
        </div>
      </div>

      {/* Academic Year Control & Transition Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-700/50">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Current Year */}
          <div className="md:col-span-5 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Tahun Ajaran Saat Ini (Aktif)
            </span>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white">{oldAcademicYear}</span>
                <p className="text-xs text-slate-400 mt-0.5">Database Google Spreadsheet</p>
              </div>
            </div>
          </div>

          {/* Transition Icon */}
          <div className="md:col-span-2 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Kenaikan</span>
          </div>

          {/* Target Year Selector */}
          <div className="md:col-span-5 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">
              Tahun Ajaran Tujuan (Baru)
            </span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                placeholder="2027/2028"
                className="w-full bg-slate-900/90 border border-slate-600 rounded-lg px-3 py-2 text-lg font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleRunSimulation}
                className="shrink-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Jalankan Simulasi"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Simulasi
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-400">Pilihan Cepat:</span>
              <button
                onClick={() => setNewAcademicYear(getNextAcademicYear(oldAcademicYear))}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                +1 Thn ({getNextAcademicYear(oldAcademicYear)})
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Processing Progress Bar */}
      {isProcessing && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-emerald-200 dark:border-emerald-800 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Memproses Kenaikan Kelas Massal...
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Meng-update tingkat, kelas, dan status akademik siswa pada database...
          </p>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Card 1: Total Siswa */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Terdata</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{previewItems.length}</div>
            <span className="text-[11px] text-slate-400">Siswa Aktif / Alumni</span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Siap Naik Kelas */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Siap Naik Kelas</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{countReady}</div>
            <span className="text-[11px] text-slate-400">Tingkat X & XI</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Siap Lulus (Alumni) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Siap Lulus (Alumni)</span>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{countGrad}</div>
            <span className="text-[11px] text-slate-400">Tingkat XII</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Error / Perlu Dibenahi */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-red-200 dark:border-red-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Perlu Perhatian</span>
            <div className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{countError}</div>
            <span className="text-[11px] text-slate-400">Kelas Tujuan Tdk Ditemukan</span>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('simulation')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'simulation'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Simulasi & Preview Kenaikan ({previewItems.length})
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              Riwayat Kenaikan Kelas ({historyItems.length})
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'guide'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Aturan & Panduan Modul
            </button>
          </div>

          {activeTab === 'simulation' && (
            <div className="pb-3 flex items-center gap-2">
              <button
                onClick={exportPreviewCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Simulation & Preview Table */}
        {activeTab === 'simulation' && (
          <div className="p-6 space-y-4">
            
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan NIS, Nama, Kelas Lama/Baru..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Status ({previewItems.length})</option>
                  <option value="Siap Diproses">Siap Naik Kelas ({countReady})</option>
                  <option value="Siap Lulus">Siap Lulus / Alumni ({countGrad})</option>
                  <option value="Kelas Tujuan Tidak Ditemukan">Error: Kelas Tdk Ditemukan</option>
                  <option value="Data Tidak Lengkap">Data Tidak Lengkap</option>
                  <option value="Sudah Alumni">Sudah Alumni ({countAlumni})</option>
                </select>
              </div>
            </div>

            {/* Error Banner Warning if any error items exist */}
            {countError > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-800 dark:text-red-300">
                    Ditemukan {countError} Siswa dengan Kelas Tujuan Tidak Ditemukan!
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                    Pastikan kelas tingkat lanjutan (misal: XI TM 1, XII TM 1) sudah terdaftar aktif pada <strong>Master Data Kelas</strong>. Siswa bermasalah tidak akan dimasukkan dalam proses kenaikan kelas massal.
                  </p>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Jurusan</th>
                    <th className="py-3 px-4 text-center">Thn Ajaran</th>
                    <th className="py-3 px-4">Kelas Lama</th>
                    <th className="py-3 px-4">Kelas Baru</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                  {filteredPreview.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada data siswa yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPreview.map((item, index) => {
                      let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                      let icon = <Info className="w-3.5 h-3.5" />;

                      if (item.status === 'Siap Diproses') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800';
                        icon = <Check className="w-3.5 h-3.5 text-emerald-600" />;
                      } else if (item.status === 'Siap Lulus') {
                        badgeClass = 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
                        icon = <GraduationCap className="w-3.5 h-3.5 text-blue-600" />;
                      } else if (item.status === 'Kelas Tujuan Tidak Ditemukan') {
                        badgeClass = 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
                        icon = <XCircle className="w-3.5 h-3.5 text-red-600" />;
                      } else if (item.status === 'Data Tidak Lengkap') {
                        badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800';
                        icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400 text-xs">{index + 1}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{item.nis}</td>
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{item.majorName}</td>
                          <td className="py-3 px-4 text-center text-xs font-mono">
                            <span className="text-slate-500">{item.oldAcademicYear}</span>
                            <span className="mx-1 text-emerald-500 font-bold">➔</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.newAcademicYear}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{item.oldClassName}</td>
                          <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                            {item.newClassName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                              {icon} {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Execute Promotion Footer Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <strong>{filteredPreview.length}</strong> dari <strong>{previewItems.length}</strong> total data siswa.
              </div>

              <button
                onClick={handleExecutePromotion}
                disabled={isProcessing || (countReady === 0 && countGrad === 0)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all ${
                  isProcessing || (countReady === 0 && countGrad === 0)
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                }`}
              >
                <Play className="w-4 h-4 fill-white" />
                Jalankan Kenaikan Kelas ({countReady + countGrad} Siswa)
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Promotion History Table */}
        {activeTab === 'history' && (
          <div className="p-6 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari di riwayat berdasarkan NIS, Nama, Kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleRollback}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Rollback Batch Terakhir
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 text-center">Thn Ajaran</th>
                    <th className="py-3 px-4 text-center">Tingkat</th>
                    <th className="py-3 px-4">Kelas Lama ➔ Baru</th>
                    <th className="py-3 px-4">Diproses Oleh</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Belum ada catatan riwayat kenaikan kelas.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {item.date} {item.time}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">{item.nis}</td>
                        <td className="py-3 px-4 font-medium">{item.studentName}</td>
                        <td className="py-3 px-4 text-center text-xs font-mono">
                          {item.oldAcademicYear} ➔ {item.newAcademicYear}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-xs">
                          {item.oldLevel} ➔ {item.newLevel}
                        </td>
                        <td className="py-3 px-4 font-semibold text-xs">
                          <span className="text-slate-500">{item.oldClassName}</span>
                          <span className="mx-1 text-emerald-500">➔</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{item.newClassName}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">{item.processedBy}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'Naik Kelas'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : item.status === 'Lulus'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 line-through'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 3: Rules & Guide */}
        {activeTab === 'guide' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Aturan Kenaikan Kelas Massal
                </h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
                  <li><strong>Tingkat X ➔ XI</strong>: Siswa kelas X otomatis naik ke kelas XI (Contoh: X TM 1 ➔ XI TM 1).</li>
                  <li><strong>Tingkat XI ➔ XII</strong>: Siswa kelas XI otomatis naik ke kelas XII (Contoh: XI TM 2 ➔ XII TM 2).</li>
                  <li><strong>Tingkat XII ➔ Lulus (Alumni)</strong>: Siswa kelas XII tidak dipindahkan ke kelas baru. Status akademik diubah menjadi <em>Lulus</em> dan status siswa menjadi <em>Alumni</em>.</li>
                  <li><strong>Jurusan Tidak Berubah</strong>: Jurusan siswa tetap sama sepanjang masa studi.</li>
                  <li><strong>Riwayat Pelanggaran & Poin Safe</strong>: Poin pelanggaran dan rekam jejak kedisiplinan siswa tetap aman tersimpan berdasarkan NIS siswa dan TIDAK DIHAPUS.</li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  Aturan Fitur Rollback (Pembatalan)
                </h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
                  <li><strong>Fitur Pembatalan (Rollback)</strong> dapat digunakan jika terjadi kesalahan dalam menjalankan proses kenaikan kelas.</li>
                  <li>Membatalkan proses kenaikan terakhir dan mengembalikan seluruh siswa dalam batch tersebut ke tingkat, kelas, dan Tahun Ajaran semula.</li>
                  <li>Rollback mengembalikan juga settingan Tahun Ajaran Aktif di sistem.</li>
                  <li>Catatan pembatalan akan ditandai pada sheet <code>promotion_history</code>.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* SweetAlert Dialog Modal */}
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
