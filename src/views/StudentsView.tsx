import React, { useState, useMemo, useEffect } from 'react';
import { StudentPointSummary, UserRole, ClassItem, MajorItem } from '../types';
import { 
  getStudentPointSummaries, logActivity, getSettings,
  getDisciplineRuleByPoints
} from '../utils/storage';
import { ApiService } from '../services/api';
import { 
  Users, Plus, Search, Filter, Download, Upload, Edit3, Trash2, 
  Eye, X, AlertTriangle, AlertOctagon,
  RotateCcw, RefreshCw, Printer, ChevronLeft, ChevronRight, ArrowUpDown, 
  Layers, GraduationCap, School, Check, Loader2, FileSpreadsheet, UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface StudentsViewProps {
  role: UserRole;
  userName: string;
}

// Helper to determine Tingkat code and display label
export function getStudentLevelInfo(className: string | undefined | null, classesList: ClassItem[] = []): { code: string; label: string } {
  if (!className) return { code: 'X', label: 'Sepuluh (X)' };
  const safeClassName = String(className).trim();
  const matchedClass = (classesList || []).find(c => 
    (c && c.name && c.name.toLowerCase() === safeClassName.toLowerCase()) || 
    (c && c.code && c.code.toLowerCase() === safeClassName.toLowerCase())
  );
  if (matchedClass && matchedClass.level) {
    const lvl = String(matchedClass.level).toUpperCase();
    if (lvl.includes('XII') || lvl.includes('12')) return { code: 'XII', label: 'Dua Belas (XII)' };
    if (lvl.includes('XI') || lvl.includes('11')) return { code: 'XI', label: 'Sebelas (XI)' };
    if (lvl.includes('X') || lvl.includes('10')) return { code: 'X', label: 'Sepuluh (X)' };
  }
  
  const clsUpper = safeClassName.toUpperCase();
  if (clsUpper.startsWith('XII') || clsUpper.includes(' XII ') || clsUpper.startsWith('12')) {
    return { code: 'XII', label: 'Dua Belas (XII)' };
  }
  if (clsUpper.startsWith('XI') || clsUpper.includes(' XI ') || clsUpper.startsWith('11')) {
    return { code: 'XI', label: 'Sebelas (XI)' };
  }
  if (clsUpper.startsWith('X') || clsUpper.includes(' X ') || clsUpper.startsWith('10')) {
    return { code: 'X', label: 'Sepuluh (X)' };
  }
  return { code: 'X', label: 'Sepuluh (X)' };
}

// Helper to reliably resolve a student's major name individually from student record or class relation
export function getStudentMajorName(student: any, classesList: ClassItem[] = []): string {
  if (!student) return '-';
  if (student.majorName && String(student.majorName).trim() !== '') {
    return String(student.majorName).trim();
  }
  if (student.major && String(student.major).trim() !== '') {
    return String(student.major).trim();
  }
  if (student.className || student.class) {
    const clsName = String(student.className || student.class).trim().toLowerCase();
    const matchedClass = (classesList || []).find(c => c && c.name && String(c.name).trim().toLowerCase() === clsName);
    if (matchedClass && matchedClass.major) {
      return matchedClass.major;
    }
  }
  return '-';
}

export const StudentsView: React.FC<StudentsViewProps> = ({ role, userName }) => {
  const [students, setStudents] = useState<StudentPointSummary[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [rawMajors, setRawMajors] = useState<MajorItem[]>([]);
  const settings = getSettings();
  const isAdmin = role === 'admin';

  // Filters
  const [selectedMajor, setSelectedMajor] = useState('ALL');
  const [selectedTingkat, setSelectedTingkat] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // DataTables Controls
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<'nis' | 'name' | 'gender' | 'majorName' | 'className' | 'status' | 'totalPelanggaran'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // UI & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const [stdRes, clsRes, mjrRes, trxRes] = await Promise.all([
        ApiService.getStudents(),
        ApiService.getClasses(),
        ApiService.getMajors(),
        ApiService.getTransactions()
      ]);

      const fetchedClasses = (clsRes.success && Array.isArray(clsRes.data)) ? clsRes.data : [];
      const fetchedMajors = (mjrRes.success && Array.isArray(mjrRes.data)) ? mjrRes.data : [];
      setClasses(fetchedClasses);
      setRawMajors(fetchedMajors);

      if (stdRes.success && Array.isArray(stdRes.data)) {
        const trxs = (trxRes.success && Array.isArray(trxRes.data)) ? trxRes.data : [];
        const summaries: StudentPointSummary[] = stdRes.data.map((student: any) => {
          const resolvedMajor = getStudentMajorName(student, fetchedClasses);
          const resolvedLevel = getStudentLevelInfo(student.className, fetchedClasses).code;
          const studentTrx = trxs.filter((t: any) => t.studentId === student.id || t.studentNis === student.nis);
          const totalPelanggaran = studentTrx.reduce((sum: number, t: any) => sum + (Number(t.points) || 0), 0);
          const ruleInfo = getDisciplineRuleByPoints(totalPelanggaran);
          return {
            ...student,
            majorName: resolvedMajor,
            level: resolvedLevel,
            disciplineStatus: ruleInfo.status,
            warningLevel: ruleInfo.warningLevel,
            followUpAction: ruleInfo.followUp,
            totalPelanggaran,
            netPoints: totalPelanggaran,
            exceedsThreshold: totalPelanggaran >= (settings.pointThreshold || settings.defaultPoints || 100)
          };
        });
        setStudents(summaries);
      } else {
        setStudents(getStudentPointSummaries());
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents(getStudentPointSummaries());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    gender: 'L' as 'L' | 'P',
    className: '',
    majorName: '',
    level: 'X',
    status: 'Aktif' as 'Aktif' | 'Non-Aktif'
  });

  // Student Detail View Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentPointSummary | null>(null);

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

  const [isFetchingMajors, setIsFetchingMajors] = useState(false);

  // Master Jurusan options strictly retrieved from Master Jurusan Spreadsheet API
  const allMajors = useMemo(() => {
    const uniqueMajors = new Set<string>();
    (rawMajors || []).forEach(m => {
      if (m && m.name && m.name.trim() !== '') {
        uniqueMajors.add(m.name.trim());
      }
    });
    return Array.from(uniqueMajors).sort();
  }, [rawMajors]);

  // Classes filtered by selected Jurusan in Form
  const classesForSelectedMajor = useMemo(() => {
    if (!formData.majorName) return classes;
    const sel = formData.majorName.trim().toLowerCase();
    const filtered = classes.filter(c => c.major && c.major.trim().toLowerCase() === sel);
    return filtered.length > 0 ? filtered : classes;
  }, [classes, formData.majorName]);

  // Fixed Tingkat choices
  const tingkatOptions = [
    { code: 'ALL', label: 'Semua Tingkat' },
    { code: 'X', label: 'Sepuluh (X)' },
    { code: 'XI', label: 'Sebelas (XI)' },
    { code: 'XII', label: 'Dua Belas (XII)' }
  ];

  // Cascading Available Classes
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();

    (classes || []).forEach(c => {
      if (!c) return;
      const cName = c.name || '';
      const cLevel = getStudentLevelInfo(cName, classes).code;
      const cMajor = c.major || cName;

      const selMajor = (selectedMajor || 'ALL').toLowerCase();
      const matchMajor = selectedMajor === 'ALL' || cMajor.toLowerCase().includes(selMajor) || cName.toLowerCase().includes(selMajor);
      const matchTingkat = selectedTingkat === 'ALL' || cLevel === selectedTingkat;

      if (matchMajor && matchTingkat && cName) {
        classSet.add(cName);
      }
    });

    (students || []).forEach(s => {
      if (!s) return;
      const sClassName = s.className || '';
      const sMajorName = getStudentMajorName(s, classes);
      const sLevel = getStudentLevelInfo(sClassName, classes).code;

      const selMajor = (selectedMajor || 'ALL').toLowerCase();
      const matchMajor = selectedMajor === 'ALL' || sMajorName.toLowerCase().includes(selMajor);
      const matchTingkat = selectedTingkat === 'ALL' || sLevel === selectedTingkat;

      if (matchMajor && matchTingkat && sClassName) {
        classSet.add(sClassName);
      }
    });

    return Array.from(classSet).sort();
  }, [classes, students, selectedMajor, selectedTingkat]);

  // Auto reset selectedClass if no longer valid in cascading list
  useEffect(() => {
    if (selectedClass !== 'ALL' && !availableClasses.includes(selectedClass)) {
      setSelectedClass('ALL');
    }
  }, [selectedMajor, selectedTingkat, availableClasses, selectedClass]);

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    return (students || []).filter(student => {
      if (!student) return false;
      const sName = student.name || '';
      const sNis = student.nis || '';
      const sClassName = student.className || '';
      const sMajorName = getStudentMajorName(student, classes);
      const levelInfo = getStudentLevelInfo(sClassName, classes);

      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = 
        !q ||
        sName.toLowerCase().includes(q) ||
        sNis.toLowerCase().includes(q) ||
        sClassName.toLowerCase().includes(q) ||
        sMajorName.toLowerCase().includes(q);

      const selMajor = (selectedMajor || 'ALL').toLowerCase();
      const matchesMajor = 
        selectedMajor === 'ALL' || 
        sMajorName.toLowerCase() === selMajor;

      const matchesTingkat = 
        selectedTingkat === 'ALL' || 
        levelInfo.code === selectedTingkat;

      const selClass = (selectedClass || 'ALL').toLowerCase();
      const matchesClass = 
        selectedClass === 'ALL' || 
        sClassName.toLowerCase() === selClass;

      const matchesGender = 
        selectedGender === 'ALL' || 
        student.gender === selectedGender;

      const matchesStatus = 
        selectedStatus === 'ALL' || 
        student.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesMajor && matchesTingkat && matchesClass && matchesGender && matchesStatus;
    }).sort((a, b) => {
      let valA: any = a ? a[sortField] : '';
      let valB: any = b ? b[sortField] : '';

      if (sortField === 'majorName') {
        valA = getStudentMajorName(a, classes);
        valB = getStudentMajorName(b, classes);
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' || typeof valB === 'string') {
        const strA = String(valA);
        const strB = String(valB);
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
      return sortDirection === 'asc' 
        ? Number(valA) - Number(valB) 
        : Number(valB) - Number(valA);
    });
  }, [students, searchQuery, selectedMajor, selectedTingkat, selectedClass, selectedGender, selectedStatus, sortField, sortDirection, classes]);

  // Pagination calculation
  const totalRecords = filteredStudents.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  
  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIdx, startIdx + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
    setIsFilterApplied(true);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 200);
  };

  const handleResetFilter = () => {
    setIsLoading(true);
    setSelectedMajor('ALL');
    setSelectedTingkat('ALL');
    setSelectedClass('ALL');
    setSelectedGender('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterApplied(false);

    setTimeout(() => {
      setIsLoading(false);
      setAlertState({
        isOpen: true,
        type: 'info',
        title: 'Filter Direset',
        message: 'Seluruh filter (Jurusan, Tingkat, Kelas, Gender, Status) telah dikembalikan ke opsi "Semua".',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }, 200);
  };

  const handleRefreshData = async () => {
    await fetchStudents();
    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Data Diperbarui',
      message: 'Data siswa sekolah berhasil disegarkan dari database Google Spreadsheet.',
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Add & Edit Handlers
  const handleOpenAdd = async () => {
    setEditingId(null);
    setIsFetchingMajors(true);
    let currentMajors = rawMajors;
    try {
      const mjrRes = await ApiService.getMajors();
      if (mjrRes.success && Array.isArray(mjrRes.data)) {
        currentMajors = mjrRes.data;
        setRawMajors(mjrRes.data);
      }
    } catch (e) {
      console.error('Failed to fetch majors:', e);
    } finally {
      setIsFetchingMajors(false);
    }

    const firstMajorName = currentMajors[0]?.name || '';
    const initialClass = classes.find(c => c.major === firstMajorName)?.name || classes[0]?.name || '';
    const matchedClass = classes.find(c => c.name === initialClass);

    setFormData({
      nis: '',
      name: '',
      gender: 'L',
      className: initialClass,
      majorName: matchedClass?.major || firstMajorName,
      level: matchedClass?.level || 'X',
      status: 'Aktif'
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (student: StudentPointSummary) => {
    setEditingId(student.id);
    setIsFetchingMajors(true);
    try {
      const mjrRes = await ApiService.getMajors();
      if (mjrRes.success && Array.isArray(mjrRes.data)) {
        setRawMajors(mjrRes.data);
      }
    } catch (e) {
      console.error('Failed to fetch majors:', e);
    } finally {
      setIsFetchingMajors(false);
    }

    const resolvedMajor = getStudentMajorName(student, classes);
    const levelInfo = getStudentLevelInfo(student.className, classes);
    setFormData({
      nis: student.nis,
      name: student.name,
      gender: student.gender,
      className: student.className,
      majorName: resolvedMajor,
      level: levelInfo.code,
      status: student.status === 'Non-Aktif' || student.status === 'Nonaktif' ? 'Non-Aktif' : 'Aktif'
    });
    setIsFormOpen(true);
  };

  const handleMajorChangeInForm = (newMajorName: string) => {
    const sel = newMajorName.trim().toLowerCase();
    const matchingClasses = classes.filter(c => c.major && c.major.trim().toLowerCase() === sel);
    const newClassName = matchingClasses[0]?.name || '';
    const levelInfo = getStudentLevelInfo(newClassName, classes);

    setFormData(prev => ({
      ...prev,
      majorName: newMajorName,
      className: newClassName,
      level: levelInfo.code
    }));
  };

  const handleClassChangeInForm = (newClassName: string) => {
    const matchedClass = classes.find(c => c.name === newClassName);
    const levelInfo = getStudentLevelInfo(newClassName, classes);
    setFormData(prev => ({
      ...prev,
      className: newClassName,
      majorName: matchedClass?.major || prev.majorName,
      level: levelInfo.code
    }));
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const nisTrim = formData.nis.trim();
    const nameTrim = formData.name.trim();

    if (isSaving || !nisTrim || !nameTrim || !formData.className || !formData.majorName) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Data Belum Lengkap',
        message: 'Mohon lengkapi NIS, Nama Siswa, Jurusan, Tingkat, dan Kelas.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // NIS uniqueness validation
    const existingNisStudent = students.find(s => String(s.nis).trim() === nisTrim && s.id !== editingId);
    if (existingNisStudent) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'NIS Sudah Terdaftar',
        message: `Siswa dengan NIS "${nisTrim}" sudah terdaftar atas nama ${existingNisStudent.name}. NIS harus unik!`,
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await ApiService.saveStudent({
        id: editingId || undefined,
        nis: nisTrim,
        name: nameTrim,
        gender: formData.gender,
        className: formData.className,
        majorName: formData.majorName,
        level: formData.level,
        status: formData.status
      });

      if (res.success) {
        logActivity(userName, role, editingId ? 'EDIT_SISWA' : 'TAMBAH_SISWA', `Siswa: ${nameTrim} (NIS: ${nisTrim})`);
        setIsFormOpen(false);
        await fetchStudents();
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Berhasil Disimpan!',
          message: res.message || `Data siswa ${nameTrim} berhasil disimpan ke database Google Spreadsheet.`,
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'Gagal Menyimpan!',
          message: res.message || 'Gagal menyimpan data siswa ke backend Google Apps Script.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan!',
        message: err.message || 'Kesalahan jaringan atau server saat menyimpan data.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = (student: StudentPointSummary) => {
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Data Siswa?',
      message: `Apakah Anda yakin ingin menghapus siswa ${student.name} (NIS: ${student.nis}) dari database Google Spreadsheet?`,
      showCancel: true,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const res = await ApiService.deleteStudent(student.id);
          if (res.success) {
            logActivity(userName, role, 'HAPUS_SISWA', `Menghapus siswa: ${student.name}`);
            await fetchStudents();
            setAlertState({
              isOpen: true,
              type: 'success',
              title: 'Terhapus!',
              message: res.message || 'Data siswa telah berhasil dihapus dari Google Spreadsheet.',
              onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
            });
          } else {
            setAlertState({
              isOpen: true,
              type: 'error',
              title: 'Gagal Menghapus!',
              message: res.message || 'Gagal menghapus data siswa dari Google Apps Script.',
              onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
            });
          }
        } catch (err: any) {
          setAlertState({
            isOpen: true,
            type: 'error',
            title: 'Kesalahan Sistem',
            message: err.message || 'Gagal terhubung ke backend.',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Export Excel - Fixed Relational Data per Row
  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const exportData = filteredStudents.map((s, idx) => {
      const levelInfo = getStudentLevelInfo(s.className, classes);
      const majorName = getStudentMajorName(s, classes);
      return {
        No: idx + 1,
        NIS: s.nis,
        'Nama Siswa': s.name,
        'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        Jurusan: majorName,
        Tingkat: levelInfo.code,
        Kelas: s.className,
        Status: s.status,
        'Total Poin': s.totalPelanggaran,
        'Status Kedisiplinan': s.disciplineStatus || 'Baik'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 15 }, { wch: 25 },
      { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 22 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa');
    XLSX.writeFile(workbook, `Data_Siswa_${dateStr}.xlsx`);
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        NIS: '231001',
        'Nama Siswa': 'Ahmad Fauzi',
        'Jenis Kelamin': 'Laki-laki',
        Jurusan: 'Teknik Pemesinan',
        Tingkat: 'X',
        Kelas: 'X TP 1',
        Status: 'Aktif'
      },
      {
        NIS: '231002',
        'Nama Siswa': 'Siti Nurhaliza',
        'Jenis Kelamin': 'Perempuan',
        Jurusan: 'Teknik Komputer dan Jaringan',
        Tingkat: 'X',
        Kelas: 'X TKJ 1',
        Status: 'Aktif'
      },
      {
        NIS: '231003',
        'Nama Siswa': 'Budi Prasetyo',
        'Jenis Kelamin': 'Laki-laki',
        Jurusan: 'Teknik Kendaraan Ringan',
        Tingkat: 'XI',
        Kelas: 'XI TKR 2',
        Status: 'Aktif'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 12 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Data_Siswa');
    XLSX.writeFile(workbook, 'Template_Data_Siswa.xlsx');
  };

  // Import Modal & Validation States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importParsedRows, setImportParsedRows] = useState<Array<{
    lineNo: number;
    data: any;
    isValid: boolean;
    isDuplicate: boolean;
    errors: Array<{ column: string; reason: string }>;
  }>>([]);
  const [importPreviewFilter, setImportPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Parse & Validate Excel File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);

        if (!rawData || rawData.length === 0) {
          setAlertState({
            isOpen: true,
            type: 'error',
            title: 'File Kosong',
            message: 'File Excel yang diunggah tidak memiliki data siswa.',
            onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
          });
          return;
        }

        const existingDbNisSet = new Set(students.map(s => String(s.nis || '').trim().toLowerCase()));
        const existingDbCompositeSet = new Set(students.map(s => `${String(s.name || '').trim().toLowerCase()}|${String(getStudentMajorName(s, classes) || '').trim().toLowerCase()}|${String(s.className || '').trim().toLowerCase()}`));
        
        const fileSeenKeySet = new Set<string>();
        const parsedResults: any[] = [];

        rawData.forEach((row, index) => {
          const lineNo = index + 2;
          const nis = String(row.NIS || row.nis || row['Nomor Induk'] || '').trim();
          const nisn = String(row.NISN || row.nisn || '').trim();
          const name = String(row['Nama Siswa'] || row.Nama || row.nama || row.name || '').trim();
          const genderRaw = String(row['Jenis Kelamin'] || row.JenisKelamin || row.gender || row.JK || 'Laki-laki').trim();
          const major = String(row.Jurusan || row.jurusan || row.majorName || '').trim();
          const levelRaw = String(row.Tingkat || row.tingkat || row.level || 'X').trim().toUpperCase();
          const className = String(row.Kelas || row.kelas || row.className || '').trim();
          const statusRaw = String(row.Status || row.status || 'Aktif').trim();

          if (!nis && !name && !nisn) return;

          const rowErrors: Array<{ column: string; reason: string }> = [];
          let isDuplicateInFile = false;
          let isExistingInDb = false;

          const dedupeKey = nisn ? `nisn:${nisn.toLowerCase()}` : (nis ? `nis:${nis.toLowerCase()}` : `composite:${name.toLowerCase()}|${major.toLowerCase()}|${className.toLowerCase()}`);

          if (fileSeenKeySet.has(dedupeKey)) {
            isDuplicateInFile = true;
            rowErrors.push({ column: 'File Excel', reason: 'Baris ganda di dalam file Excel yang diunggah.' });
          } else {
            fileSeenKeySet.add(dedupeKey);
          }

          if ((nis && existingDbNisSet.has(nis.toLowerCase())) || existingDbCompositeSet.has(`${name.toLowerCase()}|${major.toLowerCase()}|${className.toLowerCase()}`)) {
            isExistingInDb = true;
          }

          if (!nis && !nisn) {
            rowErrors.push({ column: 'NIS / NISN', reason: 'NIS atau NISN wajib diisi.' });
          }
          if (!name) {
            rowErrors.push({ column: 'Nama Siswa', reason: 'Nama Siswa wajib diisi.' });
          }

          const gLower = genderRaw.toLowerCase();
          let validGender: 'L' | 'P' = 'L';
          if (gLower.includes('laki') || gLower === 'l') {
            validGender = 'L';
          } else if (gLower.includes('perempuan') || gLower === 'p') {
            validGender = 'P';
          } else if (genderRaw) {
            rowErrors.push({ column: 'Jenis Kelamin', reason: 'Jenis Kelamin harus Laki-laki atau Perempuan.' });
          }

          let resolvedMajor = major;
          if (!resolvedMajor && className) {
            const matchedClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
            if (matchedClass && matchedClass.major) {
              resolvedMajor = matchedClass.major;
            }
          }
          if (!resolvedMajor) {
            resolvedMajor = allMajors[0] || 'Umum';
          }

          let validLevel = levelRaw;
          if (validLevel !== 'X' && validLevel !== 'XI' && validLevel !== 'XII') {
            validLevel = getStudentLevelInfo(className, classes).code;
          }

          const sLower = statusRaw.toLowerCase();
          const validStatus = (sLower === 'non-aktif' || sLower === 'tidak aktif' || sLower === 'nonaktif') ? 'Non-Aktif' : 'Aktif';

          const isValid = rowErrors.length === 0;

          parsedResults.push({
            lineNo,
            data: {
              nis,
              nisn,
              name,
              gender: validGender,
              className: className || classes[0]?.name || 'X IPA 1',
              majorName: resolvedMajor,
              level: validLevel,
              status: validStatus
            },
            isValid,
            isDuplicate: isDuplicateInFile,
            isExistingInDb,
            errors: rowErrors
          });
        });

        setImportParsedRows(parsedResults);
        setIsImportModalOpen(true);
      } catch (err) {
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'Format File Tidak Valid',
          message: 'Gagal membaca file Excel. Pastikan format file sesuai dengan template.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Confirm Import Valid Data directly to Google Spreadsheet Backend (UPSERT)
  const handleConfirmImport = async () => {
    if (isImporting) return;

    const validRows = importParsedRows.filter(r => r.isValid).map(r => r.data);
    if (validRows.length === 0) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Data Tidak Valid',
        message: 'Tidak ada data siswa valid yang dapat diimpor.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(20);

    try {
      setImportProgress(60);
      const res = await ApiService.importStudents(validRows);
      setImportProgress(85);

      if (res.success) {
        logActivity(userName, role, 'IMPORT_EXCEL_SISWA', `Import Excel UPSERT (${importFileName}): ${validRows.length} baris diproses.`);
        await fetchStudents();
        setImportProgress(100);
        setIsImporting(false);
        setIsImportModalOpen(false);

        const d = res.data || {};
        const totalExcel = d.totalExcel ?? validRows.length;
        const validCount = d.validCount ?? validRows.length;
        const insertCount = d.insertCount ?? 0;
        const updateCount = d.updateCount ?? 0;
        const duplicateCount = d.duplicateCount ?? 0;
        const failCount = d.failCount ?? 0;
        const totalInSpreadsheet = d.totalInSpreadsheet ?? students.length;

        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Import Berhasil (UPSERT)',
          message:
            `File: ${importFileName}\n\n` +
            `• Total Data Excel: ${totalExcel}\n` +
            `• Data Valid Diproses: ${validCount}\n` +
            `• Data Baru (Insert): ${insertCount}\n` +
            `• Data Perubahan (Update): ${updateCount}\n` +
            `• Data Duplikat/Sama (Skipped): ${duplicateCount}\n` +
            `• Data Gagal: ${failCount}\n` +
            `• Total Akhir di Spreadsheet: ${totalInSpreadsheet}`,
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        setIsImporting(false);
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'Import Gagal!',
          message: res.message || 'Gagal menyimpan data import ke Google Spreadsheet.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err: any) {
      setIsImporting(false);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: err.message || 'Terjadi kesalahan saat mengunggah data ke server.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Data Siswa Sekolah</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manajemen data siswa dengan pencarian cepat dan Filter Bertingkat (Jurusan, Tingkat, Kelas, Gender, & Status).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Data */}
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Segarkan Data Siswa dari Spreadsheet"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          {/* Download Template Excel */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Unduh Template Excel Format Data Siswa"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download Template Excel</span>
          </button>

          {/* Import Excel Button (Admin Only) */}
          {isAdmin && (
            <label className={`px-3.5 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800/60 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Import Excel</span>
              <input type="file" accept=".xlsx, .xls, .csv" disabled={isImporting} onChange={handleFileChange} className="hidden" />
            </label>
          )}

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Ekspor Data Siswa ke Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Cetak Data / Simpan PDF"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print</span>
          </button>

          {/* Add Student Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* PANEL CASCADING & MULTI-FILTER */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Data Siswa Multi-Kriteria</span>
          </div>
          {(selectedMajor !== 'ALL' || selectedTingkat !== 'ALL' || selectedClass !== 'ALL' || selectedGender !== 'ALL' || selectedStatus !== 'ALL') && (
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" />
              Filter Aktif
            </span>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Filter Jurusan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              <span>1. Jurusan</span>
            </label>
            <select
              value={selectedMajor}
              onChange={e => setSelectedMajor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              <option value="ALL">Semua Jurusan</option>
              {allMajors.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 2. Filter Tingkat */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>2. Tingkat</span>
            </label>
            <select
              value={selectedTingkat}
              onChange={e => setSelectedTingkat(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              {tingkatOptions.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Filter Kelas */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-500" />
                <span>3. Kelas</span>
              </span>
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              <option value="ALL">Semua Kelas ({availableClasses.length})</option>
              {availableClasses.map(clsName => (
                <option key={clsName} value={clsName}>{clsName}</option>
              ))}
            </select>
          </div>

          {/* 4. Filter Jenis Kelamin */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-pink-500" />
              <span>4. Jenis Kelamin</span>
            </label>
            <select
              value={selectedGender}
              onChange={e => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              <option value="ALL">Semua Gender</option>
              <option value="L">Laki-Laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          {/* 5. Filter Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-teal-500" />
              <span>5. Status Siswa</span>
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Non-Aktif">Non-Aktif</option>
            </select>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Terapkan Filter</span>
            </button>

            <button
              onClick={handleResetFilter}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>Reset Filter</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Menampilkan <strong className="text-slate-700 dark:text-slate-200 font-extrabold">{totalRecords}</strong> dari <strong className="text-slate-700 dark:text-slate-200">{students.length}</strong> total siswa
          </div>
        </div>
      </div>

      {/* DATATABLES TOOLBAR: Search & Page Size */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari NIS, Nama Siswa, Jurusan, Kelas..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Entries Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Tampilkan:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:outline-none"
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
        </div>
      </div>

      {/* TABEL DATA SISWA */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xs flex items-center justify-center">
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-xl">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-xs font-bold">Memuat Data Siswa...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-4 text-center w-12">No</th>
                <th 
                  onClick={() => handleSort('nis')}
                  className="p-4 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>NIS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="p-4 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center">L/P</th>
                <th 
                  onClick={() => handleSort('majorName')}
                  className="p-4 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Jurusan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4">Tingkat</th>
                <th 
                  onClick={() => handleSort('className')}
                  className="p-4 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Kelas</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center">Status</th>
                <th 
                  onClick={() => handleSort('totalPelanggaran')}
                  className="p-4 text-center cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Poin Pelanggaran</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center print:hidden">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((s, index) => {
                  const levelInfo = getStudentLevelInfo(s.className, classes);
                  const majorName = getStudentMajorName(s, classes);
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400 text-[11px]">
                        {rowNumber}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {s.nis}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        {s.name}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`} title={s.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}>
                          {s.gender}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-200 font-bold">
                        {majorName}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">
                        {levelInfo.label}
                      </td>
                      <td className="p-4 text-slate-800 dark:text-slate-100 font-black">
                        {s.className}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'Aktif' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 font-black rounded-lg text-xs ${
                          s.exceedsThreshold
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        }`}>
                          {s.totalPelanggaran} Poin
                        </span>
                      </td>
                      <td className="p-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedStudentDetail(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Lihat Detail Siswa & Histori Poin"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteStudent(s)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* EMPTY STATE */
                <tr>
                  <td colSpan={10} className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                        Data siswa tidak ditemukan.
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tidak ada data siswa yang cocok dengan pencarian atau kombinasi filter yang Anda pilih.
                      </p>
                      <button
                        onClick={handleResetFilter}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filter Siswa</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalRecords > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium print:hidden">
            <div>
              Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> sampai <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, totalRecords)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-200">{totalRecords}</span> siswa
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold rounded-xl border border-blue-200 dark:border-blue-900">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all font-bold flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NIS Siswa *</label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={e => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="misal: 231001"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama Lengkap Siswa"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jurusan * {isFetchingMajors && <span className="text-blue-500 font-normal text-[10px] animate-pulse">(Memuat...)</span>}
                  </label>
                  <select
                    value={formData.majorName}
                    onChange={e => handleMajorChangeInForm(e.target.value)}
                    disabled={isFetchingMajors}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="">-- Pilih Jurusan --</option>
                    {allMajors.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kelas *</label>
                  <select
                    value={formData.className}
                    onChange={e => handleClassChangeInForm(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classesForSelectedMajor.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat *</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="X">Sepuluh (X)</option>
                    <option value="XI">Sebelas (XI)</option>
                    <option value="XII">Dua Belas (XII)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Siswa *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Siswa</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Detail Data Siswa</div>
                <h3 className="text-xl font-black">{selectedStudentDetail.name}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  NIS: {selectedStudentDetail.nis} • Gender: {selectedStudentDetail.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Kelas & Jurusan</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{selectedStudentDetail.className}</div>
                  <div className="text-[10px] text-slate-500">{getStudentMajorName(selectedStudentDetail, classes)} • {getStudentLevelInfo(selectedStudentDetail.className, classes).label}</div>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-100 dark:border-red-900/50">
                  <div className="text-[10px] text-red-600 uppercase font-bold">Total Poin Pelanggaran</div>
                  <div className="font-extrabold text-red-700 text-lg mt-0.5">{selectedStudentDetail.totalPelanggaran} Poin</div>
                </div>
              </div>

              {selectedStudentDetail.exceedsThreshold && (
                <div className="p-4 bg-red-600 text-white rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="font-bold">STATUS: MELEBIHI LIMIT POIN ( Limit: {settings.pointThreshold} Poin )</div>
                    <div className="text-[11px] text-red-100">
                      Siswa ini telah mengumpulkan poin pelanggaran melebihi batas toleransi sekolah.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white mb-3 text-sm">Histori Catatan Poin Pelanggaran</h4>
                {selectedStudentDetail.totalPelanggaran > 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      Total Poin Terakumulasi: <span className="text-red-600 font-black">{selectedStudentDetail.totalPelanggaran} Poin</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Status Kedisiplinan: <strong className="text-slate-700 dark:text-slate-200">{selectedStudentDetail.disciplineStatus || 'Aman'}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                    Belum ada riwayat pelanggaran untuk siswa ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL DATA SISWA */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Preview & Validasi Import Data Siswa</h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>File: <strong className="text-slate-200">{importFileName}</strong></span>
                    <span>•</span>
                    <span>{importParsedRows.length} baris dibaca</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Unduh Template Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template</span>
                </button>

                <button
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Summary Cards */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Baris</div>
                <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{importParsedRows.length}</div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                <div className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Data Valid</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {importParsedRows.filter(r => r.isValid).length}
                </div>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                <div className="text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-400 tracking-wider">Data Gagal</div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {importParsedRows.filter(r => !r.isValid && !r.isDuplicate).length}
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                <div className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider">Duplikat NIS</div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {importParsedRows.filter(r => r.isDuplicate).length}
                </div>
              </div>
            </div>

            {/* Modal Preview Filters & Table */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importPreviewFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Semua Baris ({importParsedRows.length})
                  </button>

                  <button
                    onClick={() => setImportPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importPreviewFilter === 'valid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    Hanya Valid ({importParsedRows.filter(r => r.isValid).length})
                  </button>

                  <button
                    onClick={() => setImportPreviewFilter('invalid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importPreviewFilter === 'invalid'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    Gagal / Duplikat ({importParsedRows.filter(r => !r.isValid).length})
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 italic hidden sm:block">
                  *Hanya data bertanda VALID yang akan disimpan ke database Google Spreadsheet.
                </div>
              </div>

              {/* Progress Bar during Import */}
              {isImporting && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Proses Impor Data Siswa ke Google Spreadsheet...
                    </span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 w-12 text-center">Baris</th>
                      <th className="p-3">NIS</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3 text-center">JK</th>
                      <th className="p-3">Jurusan</th>
                      <th className="p-3">Tingkat</th>
                      <th className="p-3">Kelas</th>
                      <th className="p-3">Status Validasi</th>
                      <th className="p-3">Catatan Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80 font-medium">
                    {importParsedRows
                      .filter(r => {
                        if (importPreviewFilter === 'valid') return r.isValid;
                        if (importPreviewFilter === 'invalid') return !r.isValid;
                        return true;
                      })
                      .map((row) => (
                        <tr
                          key={row.lineNo}
                          className={
                            row.isValid
                              ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/10'
                              : row.isDuplicate
                              ? 'bg-amber-50/50 hover:bg-amber-50/80 dark:bg-amber-950/20'
                              : 'bg-rose-50/50 hover:bg-rose-50/80 dark:bg-rose-950/20'
                          }
                        >
                          <td className="p-3 text-center font-mono text-slate-400">#{row.lineNo}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{row.data.nis || '-'}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{row.data.name || '-'}</td>
                          <td className="p-3 text-center">{row.data.gender === 'L' ? 'L' : 'P'}</td>
                          <td className="p-3">{row.data.majorName || '-'}</td>
                          <td className="p-3 font-semibold">{row.data.level || 'X'}</td>
                          <td className="p-3 font-bold">{row.data.className || '-'}</td>
                          <td className="p-3">
                            {row.isValid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                VALID
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                DUPLIKAT
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 inline-flex items-center gap-1">
                                <AlertOctagon className="w-3 h-3" />
                                GAGAL
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {row.errors.length > 0 ? (
                              <div className="space-y-1">
                                {row.errors.map((err, errIdx) => (
                                  <div key={errIdx} className="text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                    <span className="font-bold bg-rose-200/80 dark:bg-rose-900/80 px-1.5 py-0.5 rounded text-[10px]">
                                      Kolom: {err.column}
                                    </span>
                                    <span>{err.reason}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">Siap diimpor</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                {importParsedRows.filter(r => r.isValid).length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Tersedia {importParsedRows.filter(r => r.isValid).length} data valid untuk disimpan.
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    ✕ Tidak ada data valid yang dapat diimpor. Silakan perbaiki file Excel Anda.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importParsedRows.filter(r => r.isValid).length === 0 || isImporting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengimpor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan {importParsedRows.filter(r => r.isValid).length} Data Valid</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SweetAlert Notification Popup */}
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
