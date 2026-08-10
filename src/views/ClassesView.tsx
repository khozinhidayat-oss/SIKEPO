import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { UserRole, ClassItem } from '../types';
import { 
  getClasses, saveClass, deleteClass, importClassesBatch,
  getStudents, getMajors, logActivity 
} from '../utils/storage';
import { ApiService } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { 
  GraduationCap, Plus, FileSpreadsheet, Download, Upload, RefreshCw, 
  Search, Filter, Edit3, Trash2, X, CheckCircle, AlertTriangle, 
  ArrowUpDown, ChevronLeft, ChevronRight, Info, ShieldAlert, FileText 
} from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface ClassesViewProps {
  role: UserRole;
  userName: string;
}

interface ParsedImportRow {
  rowNum: number;
  code: string;
  name: string;
  level: string;
  major: string;
  homeroomTeacher: string;
  status: 'Aktif' | 'Nonaktif';
  isValid: boolean;
  errorMessage: string;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ role, userName }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showLoading, hideLoading, showToast } = useLoading();
  const students = getStudents();
  const majors = getMajors();
  const isAdmin = role === 'admin';

  const fetchClasses = async () => {
    setIsDataLoading(true);
    try {
      const res = await ApiService.getClasses();
      if (res.success && Array.isArray(res.data)) {
        setClasses(res.data);
      } else {
        setClasses(getClasses());
      }
    } catch (e) {
      console.error('Error fetching classes:', e);
      setClasses(getClasses());
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const refreshData = () => {
    fetchClasses();
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterMajor, setFilterMajor] = useState<string>('all');

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<keyof ClassItem>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Form Modal State (Single Class Add/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState('X');
  const [formMajor, setFormMajor] = useState(majors[0]?.name || '');
  const [formHomeroomTeacher, setFormHomeroomTeacher] = useState('');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formDescription, setFormDescription] = useState('');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Dynamic lists for filter dropdowns
  const availableLevels = useMemo(() => {
    const levelsSet = new Set<string>();
    classes.forEach(c => { if (c.level) levelsSet.add(c.level); });
    ['X', 'XI', 'XII'].forEach(l => levelsSet.add(l));
    return Array.from(levelsSet).sort();
  }, [classes]);

  const availableMajors = useMemo(() => {
    const majorsSet = new Set<string>();
    majors.forEach(m => majorsSet.add(m.name));
    classes.forEach(c => { if (c.major) majorsSet.add(c.major); });
    return Array.from(majorsSet).sort();
  }, [classes, majors]);

  // Filtered and Sorted Data
  const filteredClasses = useMemo(() => {
    return classes.filter(item => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = !query || 
        (item.code || '').toLowerCase().includes(query) ||
        (item.name || '').toLowerCase().includes(query) ||
        (item.homeroomTeacher || '').toLowerCase().includes(query) ||
        (item.major || '').toLowerCase().includes(query);

      // Status
      const matchStatus = filterStatus === 'all' || 
        (filterStatus === 'Aktif' && item.status === 'Aktif') ||
        (filterStatus === 'Nonaktif' && (item.status === 'Nonaktif' || (item.status as string) === 'Non-Aktif'));

      // Level
      const matchLevel = filterLevel === 'all' || item.level === filterLevel;

      // Major
      const matchMajor = filterMajor === 'all' || item.major === filterMajor;

      return matchSearch && matchStatus && matchLevel && matchMajor;
    }).sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [classes, searchQuery, filterStatus, filterLevel, filterMajor, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredClasses.length / (itemsPerPage || 1)) || 1;
  const paginatedClasses = useMemo(() => {
    if (itemsPerPage === 0) return filteredClasses; // All items
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(start, start + itemsPerPage);
  }, [filteredClasses, currentPage, itemsPerPage]);

  const handleSort = (field: keyof ClassItem) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Form Handlers (Add / Edit)
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormLevel('X');
    setFormMajor(majors[0]?.name || '');
    setFormHomeroomTeacher('');
    setFormStatus('Aktif');
    setFormDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: ClassItem) => {
    setEditingId(item.id);
    setFormCode(item.code || '');
    setFormName(item.name);
    setFormLevel(item.level || 'X');
    setFormMajor(item.major || (majors[0]?.name || ''));
    setFormHomeroomTeacher(item.homeroomTeacher || '');
    setFormStatus((item.status as string) === 'Nonaktif' || (item.status as string) === 'Non-Aktif' ? 'Nonaktif' : 'Aktif');
    setFormDescription(item.description || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!formCode.trim() || !formName.trim()) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Kode Kelas dan Nama Kelas wajib diisi!',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Check duplicate code
    const existing = classes.find(c => 
      c.code.trim().toUpperCase() === formCode.trim().toUpperCase() && c.id !== editingId
    );
    if (existing) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Kode Duplikat',
        message: `Kode Kelas "${formCode}" sudah digunakan oleh kelas ${existing.name}!`,
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsSaving(true);
    showLoading(editingId ? 'Mengupdate data kelas...' : 'Menyimpan data kelas...');
    try {
      const res = await ApiService.saveClass({
        id: editingId || undefined,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        level: formLevel,
        major: formMajor,
        homeroomTeacher: formHomeroomTeacher.trim(),
        status: formStatus,
        description: formDescription.trim()
      });

      if (res.success) {
        logActivity(userName, role, editingId ? 'EDIT_KELAS' : 'TAMBAH_KELAS', `Kelas: ${formCode} - ${formName}`);
        setIsFormOpen(false);
        await fetchClasses();
        showToast(res.message || `Data kelas ${formName} (${formCode}) berhasil disimpan.`, 'success');
      } else {
        showToast(res.message || 'Gagal menyimpan data kelas.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal terhubung ke backend.', 'error');
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  const handleDelete = (item: ClassItem) => {
    if (!isAdmin || isSaving) return;
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Kelas?',
      message: `Apakah Anda yakin ingin menghapus kelas ${item.name} (${item.code}) dari database Google Spreadsheet?`,
      showCancel: true,
      onConfirm: async () => {
        showLoading('Menghapus data kelas...');
        try {
          const res = await ApiService.deleteClass(item.id);
          if (res.success) {
            logActivity(userName, role, 'HAPUS_KELAS', `Kelas: ${item.name} (${item.code})`);
            await fetchClasses();
            showToast(res.message || 'Data kelas berhasil dihapus.', 'success');
          } else {
            showToast(res.message || 'Gagal menghapus kelas.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal terhubung ke backend.', 'error');
        } finally {
          hideLoading();
        }
      }
    });
  };

  // EXPORT EXCEL FUNCTION
  const handleExportExcel = () => {
    if (filteredClasses.length === 0) {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'Tidak Ada Data',
        message: 'Tidak ada data kelas yang sesuai dengan filter untuk diekspor.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Format Excel Rows
    const exportData = filteredClasses.map((item, index) => ({
      'No': index + 1,
      'Kode Kelas': item.code || '-',
      'Nama Kelas': item.name || '-',
      'Tingkat': item.level || '-',
      'Jurusan': item.major || '-',
      'Wali Kelas': item.homeroomTeacher || '-',
      'Status': item.status || 'Aktif'
    }));

    // Create Worksheet & Workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto column widths
    const colWidths = [
      { wch: 6 },  // No
      { wch: 15 }, // Kode Kelas
      { wch: 20 }, // Nama Kelas
      { wch: 10 }, // Tingkat
      { wch: 15 }, // Jurusan
      { wch: 28 }, // Wali Kelas
      { wch: 12 }  // Status
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Kelas');

    const todayStr = new Date().toISOString().split('T')[0];
    const fileName = `Data_Kelas_${todayStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    // Log Activity
    logActivity(
      userName, 
      role, 
      'EXPORT_DATA_KELAS', 
      `Export Data Kelas (${filteredClasses.length} Data)`
    );

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Export Berhasil!',
      message: `File ${fileName} (${filteredClasses.length} data) berhasil diunduh.`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // DOWNLOAD TEMPLATE EXCEL
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Kode Kelas': 'X-TKJ-1',
        'Nama Kelas': 'X TKJ 1',
        'Tingkat': 'X',
        'Jurusan': 'TKJ',
        'Wali Kelas': 'Budi Santoso, S.Pd',
        'Status': 'Aktif'
      },
      {
        'Kode Kelas': 'XI-TKR-2',
        'Nama Kelas': 'XI TKR 2',
        'Tingkat': 'XI',
        'Jurusan': 'TKR',
        'Wali Kelas': 'Siti Rahma, M.Pd',
        'Status': 'Aktif'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 16 }, // Kode Kelas
      { wch: 18 }, // Nama Kelas
      { wch: 10 }, // Tingkat
      { wch: 14 }, // Jurusan
      { wch: 28 }, // Wali Kelas
      { wch: 12 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'kelas');

    XLSX.writeFile(workbook, 'Template_Import_Kelas.xlsx');

    setAlertState({
      isOpen: true,
      type: 'info',
      title: 'Template Diunduh',
      message: 'Template Excel (Template_Import_Kelas.xlsx) berhasil diunduh. Silakan isi data sesuai format.',
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // IMPORT EXCEL HANDLERS
  const handleOpenImportModal = () => {
    setImportFile(null);
    setParsedRows([]);
    setImportProgress(0);
    setIsImportModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Ukuran Terlalu Besar',
        message: 'Ukuran file maksimal adalah 20 MB.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setImportFile(file);
    setIsProcessingFile(true);
    setImportProgress(20);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        setImportProgress(60);
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        // Use 'kelas' sheet if exists, otherwise first sheet
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === 'kelas') || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON array
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        setImportProgress(80);

        // Process and Validate Rows
        const existingClasses = getClasses();
        const codeMapInFile = new Set<string>();
        const parsedResults: ParsedImportRow[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Row 1 is header

          // Extract fields flexibly (case-insensitive keys)
          const code = (row['Kode Kelas'] || row['kode_kelas'] || row['Kode'] || row['kode'] || '').toString().trim();
          const name = (row['Nama Kelas'] || row['nama_kelas'] || row['Nama'] || row['nama'] || '').toString().trim();
          const level = (row['Tingkat'] || row['tingkat'] || '').toString().trim();
          const major = (row['Jurusan'] || row['jurusan'] || '').toString().trim();
          const homeroomTeacher = (row['Wali Kelas'] || row['wali_kelas'] || row['Wali'] || '').toString().trim();
          let rawStatus = (row['Status'] || row['status'] || 'Aktif').toString().trim();

          // Skip completely empty rows
          if (!code && !name && !level && !major && !homeroomTeacher) {
            return;
          }

          let isValid = true;
          const errors: string[] = [];

          // Rule 1: Mandatory fields
          if (!code) {
            isValid = false;
            errors.push('Kode Kelas wajib diisi');
          }
          if (!name) {
            isValid = false;
            errors.push('Nama Kelas wajib diisi');
          }
          if (!level) {
            isValid = false;
            errors.push('Tingkat wajib diisi');
          }
          if (!major) {
            isValid = false;
            errors.push('Jurusan wajib diisi');
          }
          if (!homeroomTeacher) {
            isValid = false;
            errors.push('Wali Kelas wajib diisi');
          }

          // Rule 2: Status normalization & validation
          let normalizedStatus: 'Aktif' | 'Nonaktif' = 'Aktif';
          if (rawStatus.toLowerCase() === 'aktif' || rawStatus.toLowerCase() === 'active') {
            normalizedStatus = 'Aktif';
          } else if (rawStatus.toLowerCase() === 'nonaktif' || rawStatus.toLowerCase() === 'non-aktif' || rawStatus.toLowerCase() === 'inactive') {
            normalizedStatus = 'Nonaktif';
          } else {
            isValid = false;
            errors.push('Status hanya boleh "Aktif" atau "Nonaktif"');
          }

          // Rule 3: Check Duplicate in uploaded file
          const upperCode = code.toUpperCase();
          if (upperCode && codeMapInFile.has(upperCode)) {
            isValid = false;
            errors.push(`Kode Kelas "${code}" duplikat di dalam file ini`);
          } else if (upperCode) {
            codeMapInFile.add(upperCode);
          }

          parsedResults.push({
            rowNum,
            code,
            name,
            level,
            major,
            homeroomTeacher,
            status: normalizedStatus,
            isValid,
            errorMessage: errors.join(', ')
          });
        });

        setParsedRows(parsedResults);
        setImportProgress(100);
      } catch (err) {
        console.error('Error parsing excel:', err);
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'Gagal Membaca File',
          message: 'Format file tidak dapat dibaca. Pastikan file berupa .xlsx, .xls, atau .csv yang valid.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const invalidRowsCount = parsedRows.filter(r => !r.isValid).length;

  const handleConfirmImportSave = () => {
    if (validRowsCount === 0) return;

    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Konfirmasi Simpan Import',
      message: `Apakah Anda yakin ingin menyimpan ${validRowsCount} data kelas yang valid ke spreadsheet?`,
      showCancel: true,
      onConfirm: () => {
        const validClassesToSave = parsedRows
          .filter(r => r.isValid)
          .map(r => ({
            code: r.code.toUpperCase(),
            name: r.name,
            level: r.level,
            major: r.major,
            homeroomTeacher: r.homeroomTeacher,
            status: r.status,
            description: `Diimport via Excel (${new Date().toLocaleDateString('id-ID')})`
          }));

        const count = importClassesBatch(validClassesToSave, userName, role);

        setIsImportModalOpen(false);
        refreshData();

        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Import Berhasil!',
          message: `Berhasil mengimpor ${count} data kelas ke dalam sistem.`,
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>Master Data Kelas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola data kelas, wali kelas, tingkat, serta fitur Import & Export Excel.
          </p>
        </div>

        {/* Action Button Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Download Template Excel"
          >
            <Download className="w-4 h-4" />
            <span>Template Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleOpenImportModal}
                className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                title="Import Excel"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kelas</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR (DataTables Style) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari Kode, Nama, Wali Kelas..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Nonaktif">Status: Nonaktif</option>
            </select>
          </div>

          {/* Filter Tingkat */}
          <div>
            <select
              value={filterLevel}
              onChange={e => { setFilterLevel(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
            >
              <option value="all">Semua Tingkat</option>
              {availableLevels.map(lvl => (
                <option key={lvl} value={lvl}>Tingkat {lvl}</option>
              ))}
            </select>
          </div>

          {/* Filter Jurusan */}
          <div>
            <select
              value={filterMajor}
              onChange={e => { setFilterMajor(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
            >
              <option value="all">Semua Jurusan</option>
              {availableMajors.map(mjr => (
                <option key={mjr} value={mjr}>Jurusan {mjr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Per-Page Selector & Summary Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white font-bold"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={0}>Semua</option>
            </select>
          </div>

          <div className="font-semibold text-slate-600 dark:text-slate-400">
            Total: <span className="font-bold text-blue-600 dark:text-blue-400">{filteredClasses.length}</span> kelas ditemukan
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th 
                  onClick={() => handleSort('code')}
                  className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Kode Kelas</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Kelas</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('level')}
                  className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Tingkat</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('major')}
                  className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Jurusan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('homeroomTeacher')}
                  className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Wali Kelas</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center">Siswa</th>
                <th 
                  onClick={() => handleSort('status')}
                  className="p-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedClasses.length > 0 ? (
                paginatedClasses.map((item, index) => {
                  const studentCount = students.filter(s => s.className === item.name).length;
                  const rowNumber = itemsPerPage === 0 ? index + 1 : (currentPage - 1) * itemsPerPage + index + 1;
                  const isNonActive = item.status === 'Nonaktif' || (item.status as string) === 'Non-Aktif';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{rowNumber}</td>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{item.code || '-'}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{item.name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-[11px] font-bold">
                          {item.level || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{item.major || '-'}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-200">{item.homeroomTeacher || '-'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full font-bold text-[11px]">
                          {studentCount} Siswa
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isNonActive
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {isNonActive ? 'Nonaktif' : 'Aktif'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {isAdmin ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Data Kelas"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">Hanya Lihat</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="w-8 h-8 text-slate-300" />
                      <div className="font-bold text-slate-600 dark:text-slate-300">Data kelas tidak ditemukan</div>
                      <div className="text-xs">Coba ubah kata kunci pencarian atau reset filter.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        {itemsPerPage > 0 && totalPages > 1 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">
              Halaman <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> dari <span className="font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-slate-700 dark:text-slate-300">{currentPage}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL (Single Class Add/Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span>{editingId ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Kelas *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="e.g. X-TKJ-1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Kelas *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. X TKJ 1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat *</label>
                  <select
                    value={formLevel}
                    onChange={e => setFormLevel(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="X">X (Sepuluh)</option>
                    <option value="XI">XI (Sebelas)</option>
                    <option value="XII">XII (Dua Belas)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jurusan *</label>
                  <select
                    value={formMajor}
                    onChange={e => setFormMajor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    {availableMajors.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Wali Kelas *</label>
                <input
                  type="text"
                  required
                  value={formHomeroomTeacher}
                  onChange={e => setFormHomeroomTeacher(e.target.value)}
                  placeholder="e.g. Budi Santoso, S.Pd"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Kelas *</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="status"
                      value="Aktif"
                      checked={formStatus === 'Aktif'}
                      onChange={() => setFormStatus('Aktif')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="status"
                      value="Nonaktif"
                      checked={formStatus === 'Nonaktif'}
                      onChange={() => setFormStatus('Nonaktif')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Nonaktif</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi / Keterangan</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Keterangan tambahan (opsional)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">Import Data Kelas dari File Excel</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Top Banner Info & Template Button */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      Petunjuk Format File Excel
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Kolom wajib: <span className="font-mono font-bold">Kode Kelas, Nama Kelas, Tingkat, Jurusan, Wali Kelas, Status</span>. Max size 20 MB (.xlsx, .xls, .csv).
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {importFile ? importFile.name : 'Klik untuk memilih file Excel atau drag file ke sini'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Mendukung file .xlsx, .xls, dan .csv (Maksimal 20 MB)
                  </div>
                </div>
              </div>

              {/* Processing Progress Bar */}
              {isProcessingFile && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>Membaca & Memvalidasi File...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Validation Summary Badges */}
              {parsedRows.length > 0 && !isProcessingFile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs">
                        Total: {parsedRows.length} Baris
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg font-bold text-xs flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Valid: {validRowsCount}
                      </span>
                      {invalidRowsCount > 0 && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-lg font-bold text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Gagal: {invalidRowsCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2 w-12 text-center">Baris</th>
                          <th className="p-2">Kode</th>
                          <th className="p-2">Nama Kelas</th>
                          <th className="p-2">Tingkat</th>
                          <th className="p-2">Jurusan</th>
                          <th className="p-2">Wali Kelas</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'bg-white dark:bg-slate-800' : 'bg-red-50/50 dark:bg-red-950/20'}>
                            <td className="p-2 text-center text-slate-400 font-mono">{row.rowNum}</td>
                            <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">{row.code || '-'}</td>
                            <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{row.name || '-'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{row.level || '-'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{row.major || '-'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{row.homeroomTeacher || '-'}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{row.status}</td>
                            <td className="p-2">
                              {row.isValid ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-bold text-[10px]">
                                  Valid
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-md font-bold text-[10px] block truncate max-w-[180px]" title={row.errorMessage}>
                                  {row.errorMessage}
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

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  {validRowsCount > 0 ? `${validRowsCount} baris siap disimpan.` : 'Pilih file excel untuk diproses.'}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={validRowsCount === 0 || isProcessingFile}
                    onClick={handleConfirmImportSave}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Simpan Data Valid ({validRowsCount})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SWEETALERT MODAL REUSABLE */}
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
