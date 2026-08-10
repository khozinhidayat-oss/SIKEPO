import React, { useState, useEffect } from 'react';
import { DisciplineRule, UserRole } from '../types';
import { 
  getDisciplineRules, saveDisciplineRule, deleteDisciplineRule, 
  toggleDisciplineRule, reorderDisciplineRules, getDisciplineRuleByPoints,
  logActivity
} from '../utils/storage';
import { 
  ShieldAlert, Plus, Search, Filter, ArrowUp, ArrowDown, Edit3, Trash2, Eye,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, FileText, UserCheck, Home, 
  HeartHandshake, ChevronLeft, ChevronRight, Info, Layers, Lock, Sparkles, Sliders
} from 'lucide-react';

interface DisciplineMatrixManagerProps {
  userRole: UserRole | string;
  userName: string;
  showAlert: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  confirmAction?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, onConfirm: () => void) => void;
}

export const DisciplineMatrixManager: React.FC<DisciplineMatrixManagerProps> = ({
  userRole,
  userName,
  showAlert,
  confirmAction
}) => {
  const isAdmin = userRole === 'admin';

  // Data & Filtering States
  const [rules, setRules] = useState<DisciplineRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [minPointFilter, setMinPointFilter] = useState<string>('');
  const [maxPointFilter, setMaxPointFilter] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals States
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<Partial<DisciplineRule> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedRule, setSelectedRule] = useState<DisciplineRule | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deletingRule, setDeletingRule] = useState<DisciplineRule | null>(null);

  // Live Simulator State
  const [simulatedPoints, setSimulatedPoints] = useState<number>(35);

  // Form Input Errors State
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = () => {
    setLoading(true);
    try {
      const data = getDisciplineRules();
      setRules([...data]);
    } catch (err) {
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  // Preset options for Status Kedisiplinan
  const statusOptions = [
    'Baik',
    'Perlu Pembinaan',
    'Pembinaan Intensif',
    'Pengawasan Khusus',
    'Sangat Berat',
    'Dikembalikan kepada Orang Tua'
  ];

  // Filtering Logic
  const filteredRules = rules.filter(r => {
    // Search match
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      r.ruleName.toLowerCase().includes(term) ||
      r.statusKedisiplinan.toLowerCase().includes(term) ||
      (r.jenisPembinaan && r.jenisPembinaan.toLowerCase().includes(term)) ||
      (r.tindakanSekolah && r.tindakanSekolah.toLowerCase().includes(term)) ||
      (r.suratDiterbitkan && r.suratDiterbitkan.toLowerCase().includes(term));

    // Active status match
    let matchActive = true;
    const isAct = r.isActive === true || String(r.isActive).toUpperCase() === 'TRUE' || String(r.isActive) === 'Aktif';
    if (filterActive === 'active') matchActive = isAct;
    if (filterActive === 'inactive') matchActive = !isAct;

    // Point range match
    let matchPoint = true;
    if (minPointFilter !== '') {
      const minVal = Number(minPointFilter);
      if (!isNaN(minVal) && r.maxPoint < minVal) matchPoint = false;
    }
    if (maxPointFilter !== '') {
      const maxVal = Number(maxPointFilter);
      if (!isNaN(maxVal) && r.minPoint > maxVal) matchPoint = false;
    }

    return matchSearch && matchActive && matchPoint;
  });

  // Sorting by Priority
  const sortedRules = [...filteredRules].sort((a, b) => Number(a.priority) - Number(b.priority));

  // Pagination Logic
  const totalPages = Math.ceil(sortedRules.length / pageSize) || 1;
  const paginatedRules = sortedRules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Form Handlers
  const handleOpenAdd = () => {
    if (!isAdmin) return;
    const nextPriority = rules.length > 0 ? Math.max(...rules.map(r => Number(r.priority) || 0)) + 1 : 1;
    setEditingRule({
      id: '',
      ruleName: '',
      minPoint: 0,
      maxPoint: 20,
      statusKedisiplinan: 'Baik',
      jenisPembinaan: 'Pembinaan Wali Kelas & Guru BK',
      tindakanSekolah: 'Teguran Lisan',
      suratDiterbitkan: 'Tidak Ada',
      pemanggilanOrtu: false,
      homeVisit: false,
      konselingBk: false,
      rekomendasiTindakLanjut: '',
      priority: nextPriority,
      isActive: true,
      keterangan: ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (rule: DisciplineRule) => {
    if (!isAdmin) return;
    setEditingRule({
      ...rule,
      pemanggilanOrtu: rule.pemanggilanOrtu === true || rule.pemanggilanOrtu === 'Ya' || String(rule.pemanggilanOrtu).toUpperCase() === 'TRUE',
      homeVisit: rule.homeVisit === true || rule.homeVisit === 'Ya' || String(rule.homeVisit).toUpperCase() === 'TRUE',
      konselingBk: rule.konselingBk === true || rule.konselingBk === 'Ya' || String(rule.konselingBk).toUpperCase() === 'TRUE',
      isActive: rule.isActive === true || String(rule.isActive).toUpperCase() === 'TRUE' || String(rule.isActive) === 'Aktif'
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingRule?.ruleName || editingRule.ruleName.trim() === '') {
      errors.ruleName = 'Nama aturan wajib diisi.';
    }

    if (!editingRule?.statusKedisiplinan || editingRule.statusKedisiplinan.trim() === '') {
      errors.statusKedisiplinan = 'Status kedisiplinan wajib diisi.';
    }

    if (!editingRule?.jenisPembinaan || editingRule.jenisPembinaan.trim() === '') {
      errors.jenisPembinaan = 'Jenis pembinaan wajib diisi.';
    }

    const min = Number(editingRule?.minPoint);
    const max = Number(editingRule?.maxPoint);

    if (isNaN(min) || min < 0) {
      errors.minPoint = 'Minimal point harus berupa angka positif >= 0.';
    }

    if (isNaN(max) || max < 0) {
      errors.maxPoint = 'Maksimal point harus berupa angka positif.';
    }

    if (!errors.minPoint && !errors.maxPoint && min > max) {
      errors.minPoint = 'Minimal point harus lebih kecil atau sama dengan Maksimal point.';
    }

    // Overlap validation with existing active rules
    const isAct = editingRule?.isActive ?? true;
    if (!errors.minPoint && !errors.maxPoint && isAct) {
      const activeOtherRules = rules.filter(r => 
        r.id !== editingRule?.id && 
        (r.isActive === true || String(r.isActive).toUpperCase() === 'TRUE' || String(r.isActive) === 'Aktif')
      );

      for (const r of activeOtherRules) {
        if (!(max < r.minPoint || min > r.maxPoint)) {
          errors.minPoint = `Konflik Rentang Poin: Poin (${min} - ${max}) bertumpang tindih dengan aturan aktif "${r.ruleName}" (${r.minPoint} - ${r.maxPoint}). Selesaikan bentrokan rentang poin.`;
          break;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveForm = async () => {
    if (!isAdmin) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      const isNew = !editingRule?.id;
      const res = await saveDisciplineRule(editingRule, userName, userRole);

      if (res.success) {
        setIsAddEditOpen(false);
        setEditingRule(null);
        loadRules();
        showAlert(
          'success',
          'Berhasil Disimpan!',
          `Aturan kedisiplinan "${editingRule?.ruleName}" berhasil ${isNew ? 'ditambahkan' : 'diperbarui'} sebagai acuan sistem.`
        );
      } else {
        showAlert('error', 'Gagal Menyimpan', res.message || 'Terjadi kesalahan saat menyimpan aturan.');
      }
    } catch (err: any) {
      showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule: DisciplineRule) => {
    if (!isAdmin) return;
    const newStatus = !(rule.isActive === true || String(rule.isActive).toUpperCase() === 'TRUE' || String(rule.isActive) === 'Aktif');

    setLoading(true);
    try {
      const res = await toggleDisciplineRule(rule.id, newStatus, userName, userRole);
      if (res.success) {
        loadRules();
        showAlert(
          'success',
          'Status Aktif Diperbarui',
          `Aturan "${rule.ruleName}" kini ${newStatus ? 'Aktif' : 'Nonaktif'}.`
        );
      } else {
        showAlert('error', 'Gagal Mengubah Status', res.message || 'Gagal mengubah status aktif aturan.');
      }
    } catch (err: any) {
      showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal memproses request.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isAdmin || !deletingRule) return;

    setLoading(true);
    try {
      const res = await deleteDisciplineRule(deletingRule.id, userName, userRole);
      if (res.success) {
        setIsDeleteOpen(false);
        setDeletingRule(null);
        loadRules();
        showAlert('success', 'Berhasil Dihapus', `Aturan "${deletingRule.ruleName}" telah dihapus dari sistem.`);
      } else {
        showAlert('error', 'Gagal Menghapus', res.message || 'Gagal menghapus aturan kedisiplinan.');
      }
    } catch (err: any) {
      showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal menghapus aturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sortedRules.length) return;

    const newRules = [...sortedRules];
    const tempPriority = newRules[index].priority;
    newRules[index].priority = newRules[targetIdx].priority;
    newRules[targetIdx].priority = tempPriority;

    const ordersPayload = newRules.map((r, i) => ({
      id: r.id,
      priority: i + 1
    }));

    setLoading(true);
    try {
      const res = await reorderDisciplineRules(ordersPayload, userName, userRole);
      if (res.success) {
        loadRules();
        showAlert('success', 'Urutan Diperbarui', 'Urutan prioritas aturan kedisiplinan berhasil diperbarui.');
      } else {
        showAlert('error', 'Gagal Reorder', res.message || 'Gagal mengubah urutan aturan.');
      }
    } catch (err: any) {
      showAlert('error', 'Kesalahan Sistem', err.message || 'Gagal reorder aturan.');
    } finally {
      setLoading(false);
    }
  };

  // Live Simulator calculation
  const simulatedRuleInfo = getDisciplineRuleByPoints(simulatedPoints);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldAlert className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 space-y-3 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            Master Rule Engine Kedisiplinan
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Matriks Aturan Status Kedisiplinan Sekolah
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Pusat konfigurasi aturan dan kebijakan kedisiplinan siswa (<strong>Single Source of Truth</strong>). Seluruh perhitungan poin, penetapan status kedisiplinan, rekomendasi pembinaan, penerbitan surat peringatan, hingga pemanggilan orang tua dan home visit dikendalikan penuh secara dinamis melalui matriks ini.
          </p>

          {!isAdmin && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Mode Akses Kesiswaan (Read Only): Anda dapat melihat seluruh matriks aturan sebagai referensi resmi sekolah.
            </div>
          )}
        </div>
      </div>

      {/* Live Rule Engine Simulator Banner */}
      <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-indigo-200 dark:border-indigo-900/50">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            Simulator / Penguji Rule Engine Kedisiplinan Real-time
          </div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Sistem mengambil keputusan otomatis dari Matriks Aturan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Input Poin Uji */}
          <div className="md:col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Masukkan Total Poin Pelanggaran Siswa:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="999"
                value={simulatedPoints}
                onChange={(e) => setSimulatedPoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-center font-bold text-lg text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="range"
                min="0"
                max="120"
                value={simulatedPoints}
                onChange={(e) => setSimulatedPoints(parseInt(e.target.value) || 0)}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Result Outcome Display */}
          <div className="md:col-span-8 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Status Kedisiplinan:</span>
              <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-xs font-black border ${simulatedRuleInfo.badgeClass}`}>
                {simulatedRuleInfo.status}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Tindakan / Surat Sekolah:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-1">
                {simulatedRuleInfo.warningLevel || '-'}
              </span>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${simulatedRuleInfo.pemanggilanOrtu ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  Pemanggilan Ortu: {simulatedRuleInfo.pemanggilanOrtu ? 'YA' : 'TIDAK'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${simulatedRuleInfo.homeVisit ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  Home Visit: {simulatedRuleInfo.homeVisit ? 'YA' : 'TIDAK'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${simulatedRuleInfo.konselingBk ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  Konseling BK: {simulatedRuleInfo.konselingBk ? 'YA' : 'TIDAK'}
                </span>
              </div>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 italic font-medium">
                Aturan Terikat: {simulatedRuleInfo.ruleName || 'Default System'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Controls & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Daftar Aturan Matriks Kedisiplinan ({sortedRules.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola rentang poin, jenis pembinaan, dan konsekuensi administratif sekolah secara terstruktur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadRules}
              disabled={loading}
              className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              title="Refresh / Sync Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Aturan Baru
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {/* Search */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama aturan, status, jenis pembinaan, surat..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Filter Status Aktif */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterActive}
              onChange={(e: any) => { setFilterActive(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Semua Status Aktif</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Hanya Nonaktif</option>
            </select>
          </div>

          {/* Filter Point Range */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Point:</span>
            <input
              type="number"
              placeholder="Min"
              value={minPointFilter}
              onChange={(e) => { setMinPointFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-mono outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPointFilter}
              onChange={(e) => { setMaxPointFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-mono outline-none"
            />
            {(minPointFilter !== '' || maxPointFilter !== '') && (
              <button
                onClick={() => { setMinPointFilter(''); setMaxPointFilter(''); }}
                className="px-2 py-2 text-rose-500 hover:text-rose-700 text-xs font-bold"
                title="Reset Rentang Point"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                {isAdmin && <th className="p-3.5 text-center w-12">Prioritas</th>}
                <th className="p-3.5 min-w-[200px]">Nama Aturan & Rentang Point</th>
                <th className="p-3.5 min-w-[140px]">Status Kedisiplinan</th>
                <th className="p-3.5 min-w-[180px]">Jenis Pembinaan</th>
                <th className="p-3.5 min-w-[160px]">Tindakan & Surat</th>
                <th className="p-3.5 min-w-[130px] text-center">Akses Khusus</th>
                <th className="p-3.5 min-w-[90px] text-center">Status</th>
                <th className="p-3.5 text-right min-w-[120px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
              {paginatedRules.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Tidak ada aturan kedisiplinan yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedRules.map((rule, idx) => {
                  const globalIdx = sortedRules.findIndex(r => r.id === rule.id);
                  const isAct = rule.isActive === true || String(rule.isActive).toUpperCase() === 'TRUE' || String(rule.isActive) === 'Aktif';

                  const isOrtu = rule.pemanggilanOrtu === true || rule.pemanggilanOrtu === 'Ya' || String(rule.pemanggilanOrtu).toUpperCase() === 'TRUE';
                  const isHome = rule.homeVisit === true || rule.homeVisit === 'Ya' || String(rule.homeVisit).toUpperCase() === 'TRUE';
                  const isBk = rule.konselingBk === true || rule.konselingBk === 'Ya' || String(rule.konselingBk).toUpperCase() === 'TRUE';

                  return (
                    <tr 
                      key={rule.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${!isAct ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''}`}
                    >
                      {isAdmin && (
                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              #{rule.priority || globalIdx + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleMovePriority(globalIdx, 'up')}
                                disabled={globalIdx === 0}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-25"
                                title="Naikkan Prioritas"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMovePriority(globalIdx, 'down')}
                                disabled={globalIdx === sortedRules.length - 1}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-25"
                                title="Turunkan Prioritas"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {rule.ruleName}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-md border border-indigo-200 dark:border-indigo-800">
                            Poin {rule.minPoint} - {rule.maxPoint}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold border bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                          {rule.statusKedisiplinan}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {rule.jenisPembinaan}
                      </td>

                      <td className="p-3.5 space-y-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {rule.tindakanSekolah || '-'}
                        </div>
                        {rule.suratDiterbitkan && rule.suratDiterbitkan !== 'Tidak Ada' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <FileText className="w-3 h-3" />
                            {rule.suratDiterbitkan}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col items-center gap-1 text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full font-bold w-full text-center ${isOrtu ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                            Ortu: {isOrtu ? 'YA' : 'TDK'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold w-full text-center ${isHome ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                            Home Visit: {isHome ? 'YA' : 'TDK'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold w-full text-center ${isBk ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                            BK: {isBk ? 'YA' : 'TDK'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        {isAdmin ? (
                          <button
                            onClick={() => handleToggleActive(rule)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              isAct 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200' 
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border border-slate-300 hover:bg-slate-300'
                            }`}
                          >
                            {isAct ? '✓ Aktif' : 'Nonaktif'}
                          </button>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isAct ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                            {isAct ? 'Aktif' : 'Nonaktif'}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedRule(rule); setIsDetailOpen(true); }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all"
                            title="Lihat Detail Aturan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(rule)}
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400 transition-all"
                                title="Edit Aturan"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => { setDeletingRule(rule); setIsDeleteOpen(true); }}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400 transition-all"
                                title="Hapus Aturan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div>
            Menampilkan {sortedRules.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedRules.length)} dari {sortedRules.length} aturan.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT ATURAN */}
      {isAddEditOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {editingRule.id ? 'Edit Aturan Kedisiplinan' : 'Tambah Aturan Kedisiplinan Baru'}
              </h3>
              <button 
                onClick={() => setIsAddEditOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-xs">
              {/* Nama Aturan */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Aturan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRule.ruleName || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, ruleName: e.target.value })}
                  placeholder="Contoh: Pelanggaran Ringan - Peringatan Lisan 1"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {formErrors.ruleName && <p className="text-rose-500 text-[11px] mt-1">{formErrors.ruleName}</p>}
              </div>

              {/* Rentang Point */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Minimal Point <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule.minPoint !== undefined ? editingRule.minPoint : 0}
                    onChange={(e) => setEditingRule({ ...editingRule, minPoint: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formErrors.minPoint && <p className="text-rose-500 text-[11px] mt-1">{formErrors.minPoint}</p>}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Maksimal Point <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule.maxPoint !== undefined ? editingRule.maxPoint : 0}
                    onChange={(e) => setEditingRule({ ...editingRule, maxPoint: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formErrors.maxPoint && <p className="text-rose-500 text-[11px] mt-1">{formErrors.maxPoint}</p>}
                </div>
              </div>

              {/* Status Kedisiplinan & Preset */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Kedisiplinan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingRule.statusKedisiplinan || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, statusKedisiplinan: e.target.value })}
                    placeholder="Pilih dari preset di bawah atau ketikkan status kustom..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {statusOptions.map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditingRule({ ...editingRule, statusKedisiplinan: st })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                          editingRule.statusKedisiplinan === st
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                {formErrors.statusKedisiplinan && <p className="text-rose-500 text-[11px] mt-1">{formErrors.statusKedisiplinan}</p>}
              </div>

              {/* Jenis Pembinaan */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Pembinaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRule.jenisPembinaan || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, jenisPembinaan: e.target.value })}
                  placeholder="Contoh: Pembinaan Wali Kelas, Guru BK & Tim Kesiswaan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formErrors.jenisPembinaan && <p className="text-rose-500 text-[11px] mt-1">{formErrors.jenisPembinaan}</p>}
              </div>

              {/* Tindakan Sekolah & Surat Diterbitkan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tindakan Sekolah</label>
                  <input
                    type="text"
                    value={editingRule.tindakanSekolah || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, tindakanSekolah: e.target.value })}
                    placeholder="Contoh: Peringatan Tertulis 1 (SP1)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Surat yang Diterbitkan</label>
                  <input
                    type="text"
                    value={editingRule.suratDiterbitkan || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, suratDiterbitkan: e.target.value })}
                    placeholder="Contoh: Surat Peringatan 1 (SP1)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Switches for Special Flags */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="block font-bold text-slate-700 dark:text-slate-300">
                  Konsekuensi Administratif Khusus:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingRule.pemanggilanOrtu}
                      onChange={(e) => setEditingRule({ ...editingRule, pemanggilanOrtu: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Pemanggilan Ortu</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingRule.homeVisit}
                      onChange={(e) => setEditingRule({ ...editingRule, homeVisit: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Home Visit</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingRule.konselingBk}
                      onChange={(e) => setEditingRule({ ...editingRule, konselingBk: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Konseling BK</span>
                  </label>
                </div>
              </div>

              {/* Rekomendasi Tindak Lanjut */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rekomendasi Tindak Lanjut</label>
                <input
                  type="text"
                  value={editingRule.rekomendasiTindakLanjut || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, rekomendasiTindakLanjut: e.target.value })}
                  placeholder="Contoh: Pemanggilan Ortu & Pembuatan Surat Perjanjian 1"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Priority & Status Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Urutan Prioritas Evaluasi</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule.priority || 1}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Keaktifan Aturan</label>
                  <label className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingRule.isActive}
                      onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {editingRule.isActive ? 'Aturan Aktif (Digunakan Rule Engine)' : 'Nonaktif (Diabaikan)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  value={editingRule.keterangan || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, keterangan: e.target.value })}
                  placeholder="Catatan internal atau keterangan pedoman sekolah..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Simpan Aturan Matriks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL ATURAN */}
      {isDetailOpen && selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Detail Aturan Kedisiplinan
              </h3>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/60">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Nama Aturan:</span>
                <span className="text-base font-black text-indigo-900 dark:text-indigo-200 block mt-0.5">
                  {selectedRule.ruleName}
                </span>
                <span className="inline-block mt-2 px-3 py-1 bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg">
                  Rentang Poin: {selectedRule.minPoint} - {selectedRule.maxPoint}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Status Kedisiplinan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedRule.statusKedisiplinan}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Status Aktif Aturan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedRule.isActive ? '✓ Aktif (Rule Engine)' : 'Nonaktif'}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Jenis Pembinaan:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedRule.jenisPembinaan}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Tindakan Sekolah:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedRule.tindakanSekolah || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Surat Diterbitkan:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedRule.suratDiterbitkan || '-'}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold uppercase">Rekomendasi Tindak Lanjut:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedRule.rekomendasiTindakLanjut || '-'}
                  </span>
                </div>
              </div>

              {/* Special Flags Badges */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${selectedRule.pemanggilanOrtu ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  Pemanggilan Ortu: {selectedRule.pemanggilanOrtu ? 'Ya' : 'Tidak'}
                </span>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${selectedRule.homeVisit ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  Home Visit: {selectedRule.homeVisit ? 'Ya' : 'Tidak'}
                </span>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${selectedRule.konselingBk ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  Konseling BK: {selectedRule.konselingBk ? 'Ya' : 'Tidak'}
                </span>
              </div>

              {selectedRule.keterangan && (
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-700 dark:text-slate-300 italic">
                  "{selectedRule.keterangan}"
                </div>
              )}

              {/* Audit Meta info */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 space-y-1 font-mono">
                <div>ID Aturan: {selectedRule.id}</div>
                <div>Dibuat Oleh: {selectedRule.createdBy || 'Admin'} ({selectedRule.createdAt ? new Date(selectedRule.createdAt).toLocaleString('id-ID') : '-'})</div>
                <div>Diperbarui Oleh: {selectedRule.updatedBy || 'Admin'} ({selectedRule.updatedAt ? new Date(selectedRule.updatedAt).toLocaleString('id-ID') : '-'})</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {isDeleteOpen && deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Konfirmasi Hapus Aturan</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengosongkan aturan dari matriks kedisiplinan.</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <div className="font-bold">{deletingRule.ruleName}</div>
              <div>Rentang Poin: {deletingRule.minPoint} - {deletingRule.maxPoint} Poin</div>
              <div>Status: {deletingRule.statusKedisiplinan}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Ya, Hapus Aturan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
