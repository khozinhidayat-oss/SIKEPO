import React, { useState, useMemo, useRef } from 'react';
import { UserRole, MasterViolation } from '../types';
import { 
  getMasterViolations, saveMasterViolation, deleteMasterViolation, 
  saveMasterViolationsBatch, logActivity 
} from '../utils/storage';
import { 
  AlertOctagon, Plus, Edit3, Trash2, X, Search, FileSpreadsheet, 
  Upload, Download, RefreshCw, FileText, CheckCircle2, AlertCircle, 
  XCircle, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Layers,
  FileCheck, ShieldAlert
} from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';
import * as XLSX from 'xlsx';

interface MasterViolationsViewProps {
  role: UserRole;
  userName: string;
}

interface ParsedImportRow {
  rowNum: number;
  code: string;
  category: string;
  name: string;
  points: number;
  action: string;
  status: 'Aktif' | 'Nonaktif' | 'Non-Aktif';
  isValid: boolean;
  isDuplicateInDb: boolean;
  errors: { col: string; msg: string }[];
}

export const MasterViolationsView: React.FC<MasterViolationsViewProps> = ({ role, userName }) => {
  const [violations, setViolations] = useState<MasterViolation[]>(getMasterViolations());
  const isAdmin = role === 'admin';

  // Table Filters & Pagination State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [minPointsFilter, setMinPointsFilter] = useState('');
  const [maxPointsFilter, setMaxPointsFilter] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState<keyof MasterViolation>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form Modal State (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Kedisiplinan Waktu');
  const [name, setName] = useState('');
  const [points, setPoints] = useState(10);
  const [action, setAction] = useState('Teguran Lisan');
  const [status, setStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');

  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [duplicateOption, setDuplicateOption] = useState<'skip' | 'update' | 'cancel'>('skip');
  const [previewTab, setPreviewTab] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SweetAlert Modal State
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

  const refreshData = () => {
    const list = getMasterViolations();
    setViolations(list);
  };

  // Categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    violations.forEach(v => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set);
  }, [violations]);

  // Filtered Data
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      // Search
      const s = search.toLowerCase();
      const matchesSearch = !s || 
        (v.code && v.code.toLowerCase().includes(s)) ||
        (v.name && v.name.toLowerCase().includes(s)) ||
        (v.category && v.category.toLowerCase().includes(s)) ||
        (v.action && v.action.toLowerCase().includes(s));

      // Category filter
      const matchesCategory = categoryFilter === 'Semua' || v.category === categoryFilter;

      // Status filter
      const matchesStatus = statusFilter === 'Semua' || 
        (statusFilter === 'Aktif' && (v.status === 'Aktif')) ||
        (statusFilter === 'Non-Aktif' && (v.status === 'Non-Aktif' || v.status === 'Nonaktif'));

      // Points Range Filter
      const minP = minPointsFilter !== '' ? Number(minPointsFilter) : -Infinity;
      const maxP = maxPointsFilter !== '' ? Number(maxPointsFilter) : Infinity;
      const matchesPoints = v.points >= minP && v.points <= maxP;

      return matchesSearch && matchesCategory && matchesStatus && matchesPoints;
    });
  }, [violations, search, categoryFilter, statusFilter, minPointsFilter, maxPointsFilter]);

  // Sorted Data
  const sortedViolations = useMemo(() => {
    return [...filteredViolations].sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredViolations, sortField, sortDirection]);

  // Pagination Calculation
  const totalPages = Math.ceil(sortedViolations.length / pageSize) || 1;
  const paginatedViolations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedViolations.slice(start, start + pageSize);
  }, [sortedViolations, currentPage, pageSize]);

  const handleSort = (field: keyof MasterViolation) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('Semua');
    setStatusFilter('Semua');
    setMinPointsFilter('');
    setMaxPointsFilter('');
    setCurrentPage(1);
  };

  // Open Form Modal (Add / Edit)
  const handleOpenAdd = () => {
    setEditingId(null);
    setCode(`PLG${String(violations.length + 1).padStart(3, '0')}`);
    setCategory('Kedisiplinan Waktu');
    setName('');
    setPoints(10);
    setAction('Teguran Lisan');
    setStatus('Aktif');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (v: MasterViolation) => {
    setEditingId(v.id);
    setCode(v.code || '');
    setCategory(v.category);
    setName(v.name);
    setPoints(v.points);
    setAction(v.action || 'Teguran Lisan');
    setStatus(v.status === 'Nonaktif' ? 'Non-Aktif' : v.status);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;

    const saved = saveMasterViolation({
      id: editingId || undefined,
      code: code.trim().toUpperCase() || undefined,
      category: category.trim(),
      name: name.trim(),
      points: Number(points) || 1,
      action: action.trim() || 'Teguran Lisan',
      status
    });

    logActivity(
      userName, 
      role, 
      editingId ? 'EDIT_MASTER_PELANGGARAN' : 'TAMBAH_MASTER_PELANGGARAN', 
      `Master: ${saved.code || ''} - ${saved.name} (${saved.points} Poin)`
    );

    setIsFormOpen(false);
    refreshData();

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Berhasil Disimpan!',
      message: `Data master pelanggaran "${saved.name}" telah berhasil disimpan.`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleDelete = (v: MasterViolation) => {
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Pelanggaran?',
      message: `Apakah Anda yakin ingin menghapus master pelanggaran "${v.name}" (${v.code || '-'})?`,
      showCancel: true,
      onConfirm: () => {
        deleteMasterViolation(v.id);
        logActivity(userName, role, 'HAPUS_MASTER_PELANGGARAN', `Master: ${v.code || ''} - ${v.name}`);
        refreshData();
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Terhapus!',
          message: 'Master pelanggaran berhasil dihapus.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Kode Pelanggaran': 'PLG001',
        'Kategori': 'Kedisiplinan Waktu',
        'Nama Pelanggaran': 'Terlambat Masuk Sekolah (< 15 Menit)',
        'Poin': 5,
        'Tindakan': 'Teguran Lisan',
        'Status': 'Aktif'
      },
      {
        'Kode Pelanggaran': 'PLG002',
        'Kategori': 'Kerapian & Seragam',
        'Nama Pelanggaran': 'Seragam Tidak Sesuai Ketentuan Hari',
        'Poin': 10,
        'Tindakan': 'Teguran Tertulis',
        'Status': 'Aktif'
      },
      {
        'Kode Pelanggaran': 'PLG003',
        'Kategori': 'Sikap & Perilaku',
        'Nama Pelanggaran': 'Merokok di Lingkungan Sekolah',
        'Poin': 50,
        'Tindakan': 'Pemanggilan Orang Tua',
        'Status': 'Aktif'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 18 }, // Kode Pelanggaran
      { wch: 22 }, // Kategori
      { wch: 45 }, // Nama Pelanggaran
      { wch: 10 }, // Poin
      { wch: 30 }, // Tindakan
      { wch: 12 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master_Pelanggaran');

    XLSX.writeFile(workbook, 'Template_Master_Pelanggaran.xlsx');

    logActivity(userName, role, 'DOWNLOAD_TEMPLATE_PELANGGARAN', 'Mengunduh template Excel Master Pelanggaran');
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = sortedViolations.map((v, idx) => ({
      'No': idx + 1,
      'Kode Pelanggaran': v.code || `PLG${String(idx + 1).padStart(3, '0')}`,
      'Kategori': v.category,
      'Nama Pelanggaran': v.name,
      'Poin': v.points,
      'Tindakan': v.action || 'Teguran',
      'Status': v.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 18 }, // Kode
      { wch: 25 }, // Kategori
      { wch: 45 }, // Nama
      { wch: 10 }, // Poin
      { wch: 30 }, // Tindakan
      { wch: 12 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'master_pelanggaran');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Master_Pelanggaran_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    logActivity(
      userName, 
      role, 
      'EXPORT_MASTER_PELANGGARAN', 
      `Export Master Pelanggaran (${exportData.length} Data)`
    );

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Export Berhasil!',
      message: `File "${fileName}" berisi ${exportData.length} data pelanggaran berhasil diunduh.`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Import Excel Handling
  const handleOpenImportModal = () => {
    setImportFile(null);
    setParsedRows([]);
    setProgress(0);
    setIsProcessing(false);
    setDuplicateOption('skip');
    setPreviewTab('all');
    setIsImportOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // 20 MB size limit check
    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Ukuran File Terlalu Besar!',
        message: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal ${MAX_SIZE_MB} MB.`,
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setImportFile(file);
    setIsProcessing(true);
    setProgress(15);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        setProgress(50);
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse JSON
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        setProgress(75);

        // Validation against rules
        validateImportJson(rawJson);
      } catch (err: any) {
        setIsProcessing(false);
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'Gagal Membaca File!',
          message: 'Format file tidak valid atau rusak. Pastikan file berformat .xlsx, .xls, atau .csv.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  const validateImportJson = (jsonRows: any[]) => {
    const dbViolations = getMasterViolations();
    const existingDbCodes = new Set(dbViolations.map(v => (v.code || '').trim().toUpperCase()).filter(Boolean));
    const fileCodesSeen = new Set<string>();
    const fileNamesSeen = new Set<string>();

    const rowsResult: ParsedImportRow[] = [];

    jsonRows.forEach((row, idx) => {
      // Flexibly extract keys regardless of casing/spacing
      const findVal = (keys: string[]) => {
        for (const k of Object.keys(row)) {
          const normKey = k.trim().toLowerCase();
          if (keys.some(key => normKey.includes(key))) {
            return String(row[k]).trim();
          }
        }
        return '';
      };

      const codeVal = findVal(['kode', 'code', 'id_pelanggaran', 'kodepelanggaran']).toUpperCase();
      const catVal = findVal(['kategori', 'category']);
      const nameVal = findVal(['nama', 'jenis', 'namapelanggaran', 'jenispelanggaran']);
      const pointsRaw = findVal(['poin', 'point', 'bobot']);
      const actionVal = findVal(['tindakan', 'sanksi', 'action']);
      let statusVal = findVal(['status']);

      // Normalize status
      if (!statusVal || statusVal.toLowerCase() === 'aktif') {
        statusVal = 'Aktif';
      } else if (['nonaktif', 'non-aktif', 'tidak aktif', 'inactive'].includes(statusVal.toLowerCase())) {
        statusVal = 'Non-Aktif';
      }

      // Check if row is totally blank
      if (!codeVal && !catVal && !nameVal && !pointsRaw) {
        return; // Ignore empty rows
      }

      const pointsVal = Number(pointsRaw);
      const errors: { col: string; msg: string }[] = [];

      // Validation Rules
      if (!codeVal) {
        errors.push({ col: 'Kode Pelanggaran', msg: 'Kode Pelanggaran wajib diisi' });
      } else if (fileCodesSeen.has(codeVal)) {
        errors.push({ col: 'Kode Pelanggaran', msg: `Kode "${codeVal}" duplikat dalam file Excel ini` });
      } else {
        fileCodesSeen.add(codeVal);
      }

      if (!catVal) {
        errors.push({ col: 'Kategori', msg: 'Kategori wajib diisi' });
      }

      if (!nameVal) {
        errors.push({ col: 'Nama Pelanggaran', msg: 'Nama Pelanggaran wajib diisi' });
      } else if (fileNamesSeen.has(nameVal.toLowerCase())) {
        errors.push({ col: 'Nama Pelanggaran', msg: `Nama "${nameVal}" duplikat dalam file Excel ini` });
      } else {
        fileNamesSeen.add(nameVal.toLowerCase());
      }

      if (isNaN(pointsVal) || pointsVal < 1) {
        errors.push({ col: 'Poin', msg: 'Poin harus berupa angka bulat positif minimal 1' });
      }

      if (!actionVal) {
        errors.push({ col: 'Tindakan', msg: 'Tindakan sanksi wajib diisi' });
      }

      if (statusVal !== 'Aktif' && statusVal !== 'Non-Aktif') {
        errors.push({ col: 'Status', msg: 'Status hanya boleh "Aktif" atau "Nonaktif"' });
      }

      const isDuplicateInDb = codeVal ? existingDbCodes.has(codeVal) : false;
      const isValid = errors.length === 0;

      rowsResult.push({
        rowNum: idx + 2, // 1-indexed including header row
        code: codeVal,
        category: catVal,
        name: nameVal,
        points: isNaN(pointsVal) ? 0 : pointsVal,
        action: actionVal || 'Teguran',
        status: statusVal as any,
        isValid,
        isDuplicateInDb,
        errors
      });
    });

    setProgress(100);
    setIsProcessing(false);
    setParsedRows(rowsResult);
  };

  // Preview tab filters
  const filteredPreviewRows = useMemo(() => {
    if (previewTab === 'valid') return parsedRows.filter(r => r.isValid && !r.isDuplicateInDb);
    if (previewTab === 'duplicate') return parsedRows.filter(r => r.isValid && r.isDuplicateInDb);
    if (previewTab === 'invalid') return parsedRows.filter(r => !r.isValid);
    return parsedRows;
  }, [parsedRows, previewTab]);

  const totalValidCount = parsedRows.filter(r => r.isValid).length;
  const totalDuplicateCount = parsedRows.filter(r => r.isValid && r.isDuplicateInDb).length;
  const totalInvalidCount = parsedRows.filter(r => !r.isValid).length;

  const handleExecuteImport = () => {
    if (totalValidCount === 0) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Tidak Ada Data Valid!',
        message: 'Silakan perbaiki kesalahan pada file Excel Anda sebelum mengimport.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (totalDuplicateCount > 0 && duplicateOption === 'cancel') {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'Import Dibatalkan',
        message: 'Proses import dibatalkan karena terdapat kode duplikat dan opsi "Batalkan Proses" dipilih.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const validRowsToImport = parsedRows
      .filter(r => r.isValid)
      .map(r => ({
        id: undefined,
        code: r.code,
        category: r.category,
        name: r.name,
        points: r.points,
        action: r.action,
        status: r.status
      }));

    const result = saveMasterViolationsBatch(validRowsToImport, duplicateOption);

    logActivity(
      userName,
      role,
      'IMPORT_MASTER_PELANGGARAN',
      `Import Master Pelanggaran (${result.inserted} baru, ${result.updated} diperbarui, ${result.skipped} dilewati)`
    );

    setIsImportOpen(false);
    refreshData();

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Import Berhasil!',
      message: `Proses import selesai!\n\n• Data Baru Diberikan: ${result.inserted}\n• Data Diperbarui: ${result.updated}\n• Data Dilewati: ${result.skipped}\n• Data Gagal/Invalid: ${totalInvalidCount}`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 rounded-xl">
              <AlertOctagon className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                Master Data Pelanggaran Siswa
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola jenis pelanggaran, kategori, bobot poin sanksi, serta fitur Import & Export Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={refreshData}
            title="Refresh Data"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Template Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleOpenImportModal}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pelanggaran</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pelanggaran</div>
          <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">{violations.length} Jenis</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Status Aktif</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {violations.filter(v => v.status === 'Aktif').length} Item
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Nonaktif</div>
          <div className="text-xl font-extrabold text-slate-500 mt-1">
            {violations.filter(v => v.status === 'Non-Aktif' || v.status === 'Nonaktif').length} Item
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Rata-rata Poin</div>
          <div className="text-xl font-extrabold text-red-600 mt-1">
            {violations.length > 0 
              ? Math.round(violations.reduce((acc, v) => acc + v.points, 0) / violations.length) 
              : 0} Poin
          </div>
        </div>
      </div>

      {/* DataTables Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Cari kode, jenis, atau kategori..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-red-600 focus:outline-none dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Kategori Filter */}
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white text-xs cursor-pointer"
            >
              <option value="Semua">Semua Kategori</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white text-xs cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Status Aktif</option>
              <option value="Non-Aktif">Status Nonaktif</option>
            </select>

            {/* Poin Range Filters */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Poin:</span>
              <input
                type="number"
                placeholder="Min"
                value={minPointsFilter}
                onChange={e => { setMinPointsFilter(e.target.value); setCurrentPage(1); }}
                className="w-12 bg-transparent text-center font-bold text-xs focus:outline-none dark:text-white"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPointsFilter}
                onChange={e => { setMaxPointsFilter(e.target.value); setCurrentPage(1); }}
                className="w-12 bg-transparent text-center font-bold text-xs focus:outline-none dark:text-white"
              />
            </div>

            {(search || categoryFilter !== 'Semua' || statusFilter !== 'Semua' || minPointsFilter || maxPointsFilter) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">
                    <span>Kode</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">
                    <span>Kategori</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Nama Jenis Pelanggaran</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('points')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Bobot Poin</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4">Tindakan / Sanksi</th>
                <th className="p-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {isAdmin && <th className="p-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedViolations.length > 0 ? (
                paginatedViolations.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                    <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {v.code || `PLG${String(idx + 1).padStart(3, '0')}`}
                    </td>
                    <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                      {v.category}
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                      {v.name}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-black rounded-lg text-xs">
                        +{v.points} Poin
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {v.action || 'Teguran Lisan'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'Aktif' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit Data"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                    <AlertOctagon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div>Tidak ada data master pelanggaran yang sesuai filter.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DataTables Pagination Footer */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entri per halaman</span>
          </div>

          <div>
            Menampilkan {sortedViolations.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} sampai {Math.min(currentPage * pageSize, sortedViolations.length)} dari {sortedViolations.length} total entri
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-slate-700 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-400" />
                <span>{editingId ? 'Edit Master Pelanggaran' : 'Tambah Master Pelanggaran'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Pelanggaran *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="PLG001"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori Pelanggaran *</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Contoh: Kedisiplinan Waktu, Kerapian, Perilaku"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Jenis Pelanggaran *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Terlambat Masuk Sekolah"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bobot Poin (+)</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={points}
                  onChange={e => setPoints(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-extrabold text-red-600 dark:text-red-400 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tindakan / Sanksi *</label>
                <input
                  type="text"
                  required
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  placeholder="Contoh: Teguran Lisan / Pemanggilan Ortu"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Simpan Master Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-700">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Import Master Pelanggaran dari Excel</h3>
                  <p className="text-xs text-slate-400">Upload file Excel (.xlsx, .xls, .csv) maksimal 20 MB</p>
                </div>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* File Selector / Drag & Drop Box */}
              {!importFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-3xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/30 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Klik untuk memilih file Excel atau drag & drop di sini
                  </h4>
                  <p className="text-slate-400 mt-1 text-[11px]">
                    Format file yang didukung: .xlsx, .xls, .csv (Maksimal 20 MB)
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                    className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template Dulu</span>
                  </button>
                </div>
              ) : (
                /* Selected File Card & Actions */
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{importFile.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {(importFile.size / (1024 * 1024)).toFixed(2)} MB • {parsedRows.length} baris data terdeteksi
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setImportFile(null); setParsedRows([]); }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                    <span>Membaca & Memvalidasi File Excel...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Validation Summary & Preview Section */}
              {parsedRows.length > 0 && !isProcessing && (
                <div className="space-y-4">
                  {/* Summary Counters Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Total Baris</div>
                      <div className="text-lg font-black text-slate-800 dark:text-white">{parsedRows.length}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Data Valid</div>
                      <div className="text-lg font-black text-emerald-600">{totalValidCount}</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase">Kode Duplikat</div>
                      <div className="text-lg font-black text-amber-600">{totalDuplicateCount}</div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="text-[10px] text-red-700 dark:text-red-300 font-bold uppercase">Bermasalah / Error</div>
                      <div className="text-lg font-black text-red-600">{totalInvalidCount}</div>
                    </div>
                  </div>

                  {/* Duplicate Resolution Options */}
                  {totalDuplicateCount > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                      <div className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Penanganan Kode Pelanggaran Duplikat ({totalDuplicateCount} Data Ada di Database)</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Terdapat {totalDuplicateCount} kode pelanggaran dalam Excel yang sudah terdaftar di sistem. Pilih tindakan:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 font-bold ${
                          duplicateOption === 'skip' ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="duplicateOption"
                            value="skip"
                            checked={duplicateOption === 'skip'}
                            onChange={() => setDuplicateOption('skip')}
                          />
                          <span>Lewati Data Lama</span>
                        </label>

                        <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 font-bold ${
                          duplicateOption === 'update' ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="duplicateOption"
                            value="update"
                            checked={duplicateOption === 'update'}
                            onChange={() => setDuplicateOption('update')}
                          />
                          <span>Perbarui Data Lama</span>
                        </label>

                        <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 font-bold ${
                          duplicateOption === 'cancel' ? 'bg-red-100 border-red-400 text-red-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="duplicateOption"
                            value="cancel"
                            checked={duplicateOption === 'cancel'}
                            onChange={() => setDuplicateOption('cancel')}
                          />
                          <span>Batalkan Import</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Detailed Errors Log Box (if any invalid rows) */}
                  {totalInvalidCount > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/60 space-y-2">
                      <div className="font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        <span>Daftar Kesalahan Validasi ({totalInvalidCount} Baris Tidak Boleh Disimpan)</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {parsedRows.filter(r => !r.isValid).map(r => (
                          <div key={r.rowNum} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400">
                            <span className="font-bold">Baris #{r.rowNum}:</span> {r.errors.map(e => `${e.col} (${e.msg})`).join('; ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <button
                      onClick={() => setPreviewTab('all')}
                      className={`px-3 py-1.5 font-bold rounded-xl text-xs ${
                        previewTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                      }`}
                    >
                      Semua Baris ({parsedRows.length})
                    </button>
                    <button
                      onClick={() => setPreviewTab('valid')}
                      className={`px-3 py-1.5 font-bold rounded-xl text-xs ${
                        previewTab === 'valid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700'
                      }`}
                    >
                      Valid Baru ({parsedRows.filter(r => r.isValid && !r.isDuplicateInDb).length})
                    </button>
                    <button
                      onClick={() => setPreviewTab('duplicate')}
                      className={`px-3 py-1.5 font-bold rounded-xl text-xs ${
                        previewTab === 'duplicate' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950 text-amber-700'
                      }`}
                    >
                      Duplikat Kode ({totalDuplicateCount})
                    </button>
                    <button
                      onClick={() => setPreviewTab('invalid')}
                      className={`px-3 py-1.5 font-bold rounded-xl text-xs ${
                        previewTab === 'invalid' ? 'bg-red-600 text-white' : 'bg-red-50 dark:bg-red-950 text-red-700'
                      }`}
                    >
                      Error ({totalInvalidCount})
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-bold uppercase text-[10px] text-slate-500">
                        <tr>
                          <th className="p-3">Baris</th>
                          <th className="p-3">Kode</th>
                          <th className="p-3">Kategori</th>
                          <th className="p-3">Nama Pelanggaran</th>
                          <th className="p-3 text-center">Poin</th>
                          <th className="p-3">Tindakan</th>
                          <th className="p-3 text-center">Status Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredPreviewRows.map(r => (
                          <tr key={r.rowNum} className={!r.isValid ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
                            <td className="p-3 font-mono font-bold text-slate-400">#{r.rowNum}</td>
                            <td className="p-3 font-mono font-bold">{r.code || '-'}</td>
                            <td className="p-3">{r.category || '-'}</td>
                            <td className="p-3 font-bold">{r.name || '-'}</td>
                            <td className="p-3 text-center font-black text-red-600">+{r.points}</td>
                            <td className="p-3">{r.action || '-'}</td>
                            <td className="p-3 text-center">
                              {!r.isValid ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[10px]">
                                  Error ({r.errors.length})
                                </span>
                              ) : r.isDuplicateInDb ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                                  Duplikat Kode
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[10px]">
                                  Valid Baru
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={parsedRows.length === 0 || totalValidCount === 0 || (totalDuplicateCount > 0 && duplicateOption === 'cancel')}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Simpan {totalValidCount} Data Valid ke Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SweetAlert Component */}
      <SweetAlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        showCancel={alertState.showCancel}
        onConfirm={alertState.onConfirm}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
