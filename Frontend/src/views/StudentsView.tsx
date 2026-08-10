import React, { useState, useMemo, useEffect } from 'react';
import { StudentPointSummary, UserRole, ClassItem } from '../types';
import { 
  getStudentPointSummaries, saveStudent, deleteStudent, importStudents, 
  getClasses, getMajors, getTransactions, logActivity, getSettings 
} from '../utils/storage';
import { 
  Users, Plus, Search, Filter, Download, Upload, Edit3, Trash2, 
  Eye, X, AlertTriangle, Phone, MapPin, AlertOctagon,
  RotateCcw, RefreshCw, Printer, ChevronLeft, ChevronRight, ArrowUpDown, 
  Layers, GraduationCap, School, Check, Loader2, FileSpreadsheet
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

export const StudentsView: React.FC<StudentsViewProps> = ({ role, userName }) => {
  const [students, setStudents] = useState<StudentPointSummary[]>(getStudentPointSummaries());
  const classes = getClasses();
  const rawMajors = getMajors();
  const settings = getSettings();
  const isAdmin = role === 'admin';

  // Cascading Filter States
  const [selectedMajor, setSelectedMajor] = useState('ALL');
  const [selectedTingkat, setSelectedTingkat] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // DataTables Control States
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<'nis' | 'name' | 'gender' | 'majorName' | 'className' | 'status' | 'totalPelanggaran'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // UI & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    gender: 'L' as 'L' | 'P',
    className: classes[0]?.name || 'X IPA 1',
    majorName: rawMajors[0]?.name || 'MIPA',
    address: '',
    parentPhone: '',
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

  // Default major list combined with master data
  const allMajors = useMemo(() => {
    const defaultMajorList = [
      'Teknik Pemesinan',
      'Teknik Kendaraan Ringan',
      'Teknik Sepeda Motor',
      'Teknik Komputer dan Jaringan',
      'MIPA',
      'IPS',
      'RPL',
      'TKJ'
    ];
    const set = new Set<string>(defaultMajorList);
    rawMajors.forEach(m => { if (m.name) set.add(m.name); });
    students.forEach(s => { if (s.majorName) set.add(s.majorName); });
    classes.forEach(c => { if (c.major) set.add(c.major); });
    return Array.from(set).sort();
  }, [rawMajors, students, classes]);

  // Fixed Tingkat choices
  const tingkatOptions = [
    { code: 'ALL', label: 'Semua Tingkat' },
    { code: 'X', label: 'Sepuluh (X)' },
    { code: 'XI', label: 'Sebelas (XI)' },
    { code: 'XII', label: 'Dua Belas (XII)' }
  ];

  // CASCADING FILTER: Available classes computed dynamically based on Jurusan & Tingkat
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();

    // Check master classes
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

    // Check existing student records
    (students || []).forEach(s => {
      if (!s) return;
      const sClassName = s.className || '';
      const sMajorName = s.majorName || '';
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

  // Automatic reset for Kelas if previously selected option is no longer valid in cascading list
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
      const sMajorName = student.majorName || '';

      const levelInfo = getStudentLevelInfo(sClassName, classes);

      const q = (searchQuery || '').toLowerCase();
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

      return matchesSearch && matchesMajor && matchesTingkat && matchesClass;
    }).sort((a, b) => {
      let valA: any = a ? a[sortField] : '';
      let valB: any = b ? b[sortField] : '';

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
  }, [students, searchQuery, selectedMajor, selectedTingkat, selectedClass, sortField, sortDirection, classes]);

  // Pagination calculation
  const totalRecords = filteredStudents.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  
  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIdx, startIdx + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Toggle Sorting
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Button Handlers
  const handleApplyFilter = () => {
    setCurrentPage(1);
    setIsFilterApplied(true);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 250);
  };

  const handleResetFilter = () => {
    setIsLoading(true);
    setSelectedMajor('ALL');
    setSelectedTingkat('ALL');
    setSelectedClass('ALL');
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterApplied(false);

    setTimeout(() => {
      setIsLoading(false);
      setAlertState({
        isOpen: true,
        type: 'info',
        title: 'Filter Direset',
        message: 'Seluruh filter (Jurusan, Tingkat, Kelas) telah dikembalikan ke opsi "Semua".',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }, 200);
  };

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setStudents(getStudentPointSummaries());
      setIsLoading(false);
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Data Diperbarui',
        message: 'Data siswa sekolah berhasil disegarkan dari database.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
    }, 300);
  };

  const handlePrint = () => {
    window.print();
  };

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      nis: '',
      name: '',
      gender: 'L',
      className: classes[0]?.name || 'X IPA 1',
      majorName: allMajors[0] || 'MIPA',
      address: '',
      parentPhone: '',
      status: 'Aktif'
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: StudentPointSummary) => {
    setEditingId(student.id);
    setFormData({
      nis: student.nis,
      name: student.name,
      gender: student.gender,
      className: student.className,
      majorName: student.majorName,
      address: student.address,
      parentPhone: student.parentPhone,
      status: student.status
    });
    setIsFormOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis.trim() || !formData.name.trim()) return;

    saveStudent({
      id: editingId || undefined,
      nis: formData.nis.trim(),
      name: formData.name.trim(),
      gender: formData.gender,
      className: formData.className,
      majorName: formData.majorName,
      address: formData.address.trim(),
      parentPhone: formData.parentPhone.trim(),
      status: formData.status
    });

    logActivity(userName, role, editingId ? 'EDIT_SISWA' : 'TAMBAH_SISWA', `Siswa: ${formData.name}`);
    setIsFormOpen(false);
    setStudents(getStudentPointSummaries());

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Berhasil Disimpan!',
      message: `Data siswa ${formData.name} berhasil disimpan.`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleDeleteStudent = (student: StudentPointSummary) => {
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Data Siswa?',
      message: `Apakah Anda yakin ingin menghapus siswa ${student.name} (NIS: ${student.nis})?`,
      showCancel: true,
      onConfirm: () => {
        deleteStudent(student.id);
        logActivity(userName, role, 'HAPUS_SISWA', `Menghapus siswa: ${student.name}`);
        setStudents(getStudentPointSummaries());
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Terhapus!',
          message: 'Data siswa telah berhasil dihapus.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const exportData = filteredStudents.map((s, idx) => {
      const levelInfo = getStudentLevelInfo(s.className, classes);
      return {
        No: idx + 1,
        NIS: s.nis,
        'Nama Siswa': s.name,
        'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        Jurusan: s.majorName,
        Tingkat: levelInfo.code,
        Kelas: s.className,
        'Tempat Lahir': s.placeOfBirth || '-',
        'Tanggal Lahir': s.dateOfBirth || '-',
        Alamat: s.address || '-',
        'Nama Orang Tua/Wali': s.parentName || '-',
        'Nomor HP Orang Tua': s.parentPhone || '-',
        Status: s.status,
        'Total Poin': s.totalPelanggaran,
        'Status Kedisiplinan': s.disciplineStatus
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 22 },
      { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 25 },
      { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa');
    XLSX.writeFile(workbook, `Data_Siswa_${dateStr}.xlsx`);
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        NIS: '231001',
        'Nama Siswa': 'Ahmad Fauzi',
        'Jenis Kelamin': 'Laki-laki',
        Jurusan: 'Teknik Pemesinan',
        Tingkat: 'X',
        Kelas: 'X TP 1',
        'Tempat Lahir': 'Wonosobo',
        'Tanggal Lahir': '2009-05-15',
        Alamat: 'Kalikajar',
        'Nama Orang Tua/Wali': 'Budi Santoso',
        'Nomor HP Orang Tua': '081234567890',
        Status: 'Aktif'
      },
      {
        NIS: '231002',
        'Nama Siswa': 'Siti Nurhaliza',
        'Jenis Kelamin': 'Perempuan',
        Jurusan: 'Teknik Komputer dan Jaringan',
        Tingkat: 'X',
        Kelas: 'X TKJ 1',
        'Tempat Lahir': 'Wonosobo',
        'Tanggal Lahir': '2009-08-20',
        Alamat: 'Kertek',
        'Nama Orang Tua/Wali': 'Rahmat',
        'Nomor HP Orang Tua': '082198765432',
        Status: 'Aktif'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 12 },
      { wch: 16 }, { wch: 14 }, { wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 12 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa');
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

        // Validate each row
        const existingNisSet = new Set(students.map(s => String(s.nis).trim()));
        const fileNisMap = new Set<string>();
        const parsedResults: any[] = [];

        rawData.forEach((row, index) => {
          const lineNo = index + 2; // Row number in Excel (Header = Row 1)
          const nis = String(row.NIS || row.nis || row['Nomor Induk'] || '').trim();
          const name = String(row['Nama Siswa'] || row.Nama || row.nama || row.name || '').trim();
          const genderRaw = String(row['Jenis Kelamin'] || row.JenisKelamin || row.gender || row.JK || 'Laki-laki').trim();
          const major = String(row.Jurusan || row.jurusan || row.majorName || '').trim();
          const levelRaw = String(row.Tingkat || row.tingkat || row.level || 'X').trim().toUpperCase();
          const className = String(row.Kelas || row.kelas || row.className || '').trim();
          const placeOfBirth = String(row['Tempat Lahir'] || row.tempat_lahir || '-').trim();
          const dateOfBirth = String(row['Tanggal Lahir'] || row.tanggal_lahir || '-').trim();
          const address = String(row.Alamat || row.alamat || row.address || '-').trim();
          const parentName = String(row['Nama Orang Tua/Wali'] || row['Nama Ortu'] || row.nama_ortu || '-').trim();
          const parentPhoneRaw = String(row['Nomor HP Orang Tua'] || row['No HP Orang Tua'] || row.hp_ortu || row.parentPhone || '').trim();
          const statusRaw = String(row.Status || row.status || 'Aktif').trim();

          // Ignore completely empty row
          if (!nis && !name) return;

          const rowErrors: Array<{ column: string; reason: string }> = [];
          let isDuplicate = false;

          // 1. NIS Validation
          if (!nis) {
            rowErrors.push({ column: 'NIS', reason: 'NIS wajib diisi.' });
          } else {
            if (existingNisSet.has(nis)) {
              isDuplicate = true;
              rowErrors.push({ column: 'NIS', reason: `NIS (${nis}) sudah terdaftar di database (Duplikat).` });
            }
            if (fileNisMap.has(nis)) {
              isDuplicate = true;
              rowErrors.push({ column: 'NIS', reason: `NIS (${nis}) terduplikasi dalam file Excel yang diunggah.` });
            } else {
              fileNisMap.add(nis);
            }
          }

          // 2. Nama Siswa Validation
          if (!name) {
            rowErrors.push({ column: 'Nama Siswa', reason: 'Nama Siswa wajib diisi.' });
          }

          // 3. Jenis Kelamin Validation
          const gLower = genderRaw.toLowerCase();
          let validGender: 'L' | 'P' = 'L';
          if (gLower.includes('laki') || gLower === 'l') {
            validGender = 'L';
          } else if (gLower.includes('perempuan') || gLower === 'p') {
            validGender = 'P';
          } else {
            rowErrors.push({ column: 'Jenis Kelamin', reason: 'Jenis Kelamin harus Laki-laki atau Perempuan.' });
          }

          // 4. Jurusan Validation
          if (allMajors.length > 0 && major) {
            const majorMatch = allMajors.some(m => m.toLowerCase() === major.toLowerCase());
            if (!majorMatch) {
              rowErrors.push({ column: 'Jurusan', reason: `Jurusan "${major}" tidak ditemukan di data master.` });
            }
          }

          // 5. Tingkat Validation
          if (levelRaw !== 'X' && levelRaw !== 'XI' && levelRaw !== 'XII') {
            rowErrors.push({ column: 'Tingkat', reason: 'Tingkat harus X, XI, atau XII.' });
          }

          // 6. Kelas Validation
          if (classes.length > 0 && className) {
            const classMatch = classes.some(c => c.name.toLowerCase() === className.toLowerCase());
            if (!classMatch) {
              rowErrors.push({ column: 'Kelas', reason: `Kelas "${className}" tidak ditemukan di data master.` });
            }
          }

          // 7. Nomor HP Validation
          const cleanPhone = parentPhoneRaw.replace(/[\s\-\+\(\)]/g, '');
          if (parentPhoneRaw && !/^\d+$/.test(cleanPhone)) {
            rowErrors.push({ column: 'Nomor HP Orang Tua', reason: 'Nomor HP hanya boleh berisi angka.' });
          }

          // 8. Status Validation
          const sLower = statusRaw.toLowerCase();
          if (sLower !== 'aktif' && sLower !== 'tidak aktif' && sLower !== 'non-aktif' && sLower !== 'nonaktif') {
            rowErrors.push({ column: 'Status', reason: 'Status harus "Aktif" atau "Tidak Aktif".' });
          }

          const isValid = rowErrors.length === 0;

          parsedResults.push({
            lineNo,
            data: {
              nis,
              name,
              gender: validGender,
              className: className || classes[0]?.name || 'X IPA 1',
              majorName: major || allMajors[0] || 'MIPA',
              placeOfBirth,
              dateOfBirth,
              address,
              parentName,
              parentPhone: cleanPhone || parentPhoneRaw,
              status: sLower === 'aktif' ? 'Aktif' : 'Tidak Aktif'
            },
            isValid,
            isDuplicate,
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

  // Confirm Import Valid Data
  const handleConfirmImport = () => {
    const validRows = importParsedRows.filter(r => r.isValid).map(r => r.data);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setImportProgress(20);

    setTimeout(() => {
      setImportProgress(60);
      setTimeout(() => {
        const count = importStudents(validRows);
        logActivity(userName, role, 'IMPORT_EXCEL_SISWA', `Berhasil mengimpor ${count} data siswa dari Excel (${importFileName}).`);
        setStudents(getStudentPointSummaries());

        setImportProgress(100);
        setIsImporting(false);
        setIsImportModalOpen(false);

        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Import Berhasil!',
          message: `Berhasil mengimpor ${count} data siswa yang valid ke dalam database sekolah.`,
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }, 300);
    }, 300);
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
            Manajemen data siswa dengan pencarian cepat dan Filter Bertingkat (Jurusan, Tingkat, & Kelas).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Data */}
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Segarkan Data Siswa"
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
            <label className="px-3.5 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800/60 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Import Excel</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
            </label>
          )}

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* Print / PDF Button */}
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

      {/* PANEL CASCADING FILTER (BERTINGKAT) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Data Bertingkat (Cascading Filter)</span>
          </div>
          {(selectedMajor !== 'ALL' || selectedTingkat !== 'ALL' || selectedClass !== 'ALL') && (
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" />
              Filter Aktif
            </span>
          )}
        </div>

        {/* Cascading Selects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Filter Jurusan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              <span>1. Jurusan</span>
            </label>
            <select
              value={selectedMajor}
              onChange={e => setSelectedMajor(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
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
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              {tingkatOptions.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 3. Filter Kelas (Cascading Dropdown) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-500" />
                <span>3. Kelas</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({availableClasses.length} Pilihan)
              </span>
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map(clsName => (
                <option key={clsName} value={clsName}>{clsName}</option>
              ))}
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

        {/* Show Entries Selector */}
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
        {/* Loading Overlay */}
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
                        <div>{s.name}</div>
                        {s.address && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">
                            {s.address}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`} title={s.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}>
                          {s.gender}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-200 font-bold">
                        {s.majorName}
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
                            title="Lihat Histori Poin"
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
                /* EMPTY STATE CONDITION */
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
                        Tidak ada data siswa yang cocok dengan kombinasi filter Jurusan, Tingkat, atau Kelas yang dipilih.
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

        {/* DATATABLES PAGINATION FOOTER */}
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
                    placeholder="misal: 20261009"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jurusan</label>
                  <select
                    value={formData.majorName}
                    onChange={e => setFormData({ ...formData, majorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    {allMajors.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
                  <select
                    value={formData.className}
                    onChange={e => setFormData({ ...formData, className: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  >
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor HP Orang Tua / Wali</label>
                <input
                  type="text"
                  value={formData.parentPhone}
                  onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="081234567890"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Tempat Tinggal</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat lengkap siswa"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
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
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL & TIMELINE MODAL */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Detail Kedisiplinan Siswa</div>
                <h3 className="text-xl font-black">{selectedStudentDetail.name}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">NIS: {selectedStudentDetail.nis}</div>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Kelas & Jurusan</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{selectedStudentDetail.className}</div>
                  <div className="text-[10px] text-slate-500">{selectedStudentDetail.majorName} • {getStudentLevelInfo(selectedStudentDetail.className, classes).label}</div>
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

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span className="font-bold">HP Orang Tua:</span>
                  <span className="font-mono">{selectedStudentDetail.parentPhone || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-bold">Alamat:</span>
                  <span>{selectedStudentDetail.address || '-'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white mb-3 text-sm">Histori Catatan Poin Pelanggaran</h4>
                {getTransactions().filter(t => t.studentId === selectedStudentDetail.id || t.studentNis === selectedStudentDetail.nis).length > 0 ? (
                  <div className="space-y-2">
                    {getTransactions()
                      .filter(t => t.studentId === selectedStudentDetail.id || t.studentNis === selectedStudentDetail.nis)
                      .map(trx => (
                        <div
                          key={trx.id}
                          className="p-3 rounded-2xl border flex items-start justify-between gap-3 bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-xl text-white mt-0.5 bg-red-600">
                              <AlertOctagon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100">{trx.itemName}</div>
                              <div className="text-[10px] text-slate-400">{trx.itemCategory} • Petugas: {trx.officerName}</div>
                              {trx.notes && <div className="text-[11px] text-slate-600 dark:text-slate-300 italic mt-1">"{trx.notes}"</div>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-mono text-slate-400">{trx.date}</div>
                            <div className="font-black text-xs text-red-600">
                              +{trx.points} Poin
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                    Belum ada riwayat transaksi poin untuk siswa ini.
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
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Unduh Template Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template</span>
                </button>

                <button
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
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
              {/* Tab Filters */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      importPreviewFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Semua Baris ({importParsedRows.length})
                  </button>

                  <button
                    onClick={() => setImportPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      importPreviewFilter === 'valid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    Hanya Valid ({importParsedRows.filter(r => r.isValid).length})
                  </button>

                  <button
                    onClick={() => setImportPreviewFilter('invalid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      importPreviewFilter === 'invalid'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    Gagal / Duplikat ({importParsedRows.filter(r => !r.isValid).length})
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 italic hidden sm:block">
                  *Hanya data bertanda VALID yang akan disimpan ke database.
                </div>
              </div>

              {/* Progress Bar during Import */}
              {isImporting && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Proses Impor Data Siswa...
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
                      <th className="p-3">JK</th>
                      <th className="p-3">Jurusan</th>
                      <th className="p-3">Kelas</th>
                      <th className="p-3">Status Validasi</th>
                      <th className="p-3">Penyebab Kesalahan / Catatan</th>
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
