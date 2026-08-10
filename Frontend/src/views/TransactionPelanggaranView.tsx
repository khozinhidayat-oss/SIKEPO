import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UserRole, Transaction, Student, ClassItem, MasterViolation, User } from '../types';
import { 
  getStudents, getMasterViolations, saveTransaction, deleteTransaction, 
  logActivity, getStudentPointSummaries, getTransactions, getClasses, 
  getMajors, getSettings, getSessionUser 
} from '../utils/storage';
import { 
  AlertOctagon, Save, Search, Filter, RotateCcw, X, Edit3, Trash2, 
  FileSpreadsheet, Printer, Download, CheckCircle, AlertTriangle, 
  ChevronLeft, ChevronRight, ArrowUpDown, Clock, Calendar, UserCheck, 
  GraduationCap, Info, FileText, Plus, RefreshCw, Layers, Sparkles,
  User as UserIcon, Shield, Mail, CheckCircle2
} from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface TransactionPelanggaranViewProps {
  role: UserRole;
  userName: string;
  currentUser?: User | null;
  onSuccessNavigate?: () => void;
}

export const TransactionPelanggaranView: React.FC<TransactionPelanggaranViewProps> = ({
  role,
  userName,
  currentUser,
  onSuccessNavigate
}) => {
  const sessionUser = currentUser || getSessionUser();
  const activeUser = sessionUser || {
    id: 'usr-guest',
    name: userName || 'Petugas',
    role: role || 'kesiswaan',
    email: 'petugas@sekolah.sch.id',
    status: 'active' as const
  };

  const isAdmin = activeUser.role === 'admin';
  const settings = getSettings();
  const classesList = getClasses();
  const majorsList = getMajors();
  const allStudents = getStudentPointSummaries();
  const masterViolations = getMasterViolations().filter(v => v.status === 'Aktif');

  // FORM CASCADING DROPDOWN STATE
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // FORM TRANSACTION DETAILS
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [selectedViolationId, setSelectedViolationId] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>(userName);
  const [notes, setNotes] = useState<string>('');

  // HISTORY TABLE STATE
  const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>(() => 
    getTransactions().filter(t => t.type === 'pelanggaran')
  );
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilterMajor, setHistoryFilterMajor] = useState<string>('all');
  const [historyFilterLevel, setHistoryFilterLevel] = useState<string>('all');
  const [historyFilterClass, setHistoryFilterClass] = useState<string>('all');
  const [historyFilterDate, setHistoryFilterDate] = useState<string>('');
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // EDIT MODAL STATE
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [editViolationId, setEditViolationId] = useState<string>('');
  const [editOfficerName, setEditOfficerName] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // SWEETALERT MODAL STATE
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
    setHistoryTransactions(getTransactions().filter(t => t.type === 'pelanggaran'));
  };

  // --- CASCADING DROPDOWNS LOGIC ---

  // 1. Available Jurusan Options
  const availableMajors = useMemo(() => {
    const setM = new Set<string>();
    majorsList.forEach(m => setM.add(m.name));
    classesList.forEach(c => { if (c.major) setM.add(c.major); });
    allStudents.forEach(s => { if (s.majorName) setM.add(s.majorName); });
    return Array.from(setM).sort();
  }, [majorsList, classesList, allStudents]);

  // 2. Available Tingkat Options based on selected Major
  const availableLevels = useMemo(() => {
    if (!selectedMajor) return ['X', 'XI', 'XII'];
    const setL = new Set<string>();
    classesList
      .filter(c => c.major === selectedMajor)
      .forEach(c => { if (c.level) setL.add(c.level); });
    
    if (setL.size === 0) return ['X', 'XI', 'XII'];
    return Array.from(setL).sort();
  }, [selectedMajor, classesList]);

  // 3. Available Kelas Options based on selected Major & Tingkat
  const availableClasses = useMemo(() => {
    if (!selectedMajor || !selectedLevel) return [];
    
    // Filter from classes master list
    const filteredCls = classesList.filter(c => 
      c.major === selectedMajor && c.level === selectedLevel && c.status === 'Aktif'
    );

    if (filteredCls.length > 0) {
      return filteredCls.map(c => c.name);
    }

    // Fallback filter from students list
    const setClsNames = new Set<string>();
    allStudents
      .filter(s => s.majorName === selectedMajor && s.status === 'Aktif')
      .forEach(s => {
        if (s.className.startsWith(selectedLevel)) {
          setClsNames.add(s.className);
        }
      });
    return Array.from(setClsNames).sort();
  }, [selectedMajor, selectedLevel, classesList, allStudents]);

  // 4. Available Students based on Selected Class (Active students only)
  const availableStudents = useMemo(() => {
    if (!selectedClass) return [];
    return allStudents.filter(s => 
      s.className === selectedClass && 
      s.status === 'Aktif' &&
      (!studentSearchQuery || 
        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
        s.nis.includes(studentSearchQuery))
    );
  }, [selectedClass, allStudents, studentSearchQuery]);

  // Currently Selected Objects
  const selectedStudent = useMemo(() => {
    return allStudents.find(s => s.id === selectedStudentId);
  }, [allStudents, selectedStudentId]);

  const selectedViolation = useMemo(() => {
    return masterViolations.find(v => v.id === selectedViolationId);
  }, [masterViolations, selectedViolationId]);

  // Handle Cascading Changes
  const handleMajorChange = (m: string) => {
    setSelectedMajor(m);
    setSelectedLevel('');
    setSelectedClass('');
    setSelectedStudentId('');
    setStudentSearchQuery('');
  };

  const handleLevelChange = (l: string) => {
    setSelectedLevel(l);
    setSelectedClass('');
    setSelectedStudentId('');
    setStudentSearchQuery('');
  };

  const handleClassChange = (c: string) => {
    setSelectedClass(c);
    setSelectedStudentId('');
    setStudentSearchQuery('');
  };

  const handleResetForm = () => {
    setSelectedMajor('');
    setSelectedLevel('');
    setSelectedClass('');
    setSelectedStudentId('');
    setStudentSearchQuery('');
    setSelectedViolationId('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  // FORM SUBMISSION & VALIDATION
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!selectedMajor) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Silakan pilih Jurusan terlebih dahulu.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!selectedLevel) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Silakan pilih Tingkat terlebih dahulu.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!selectedClass) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Silakan pilih Kelas terlebih dahulu.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!selectedStudent) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Silakan pilih Nama Siswa terlanggar.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (selectedStudent.status !== 'Aktif') {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Siswa Nonaktif',
        message: `Siswa ${selectedStudent.name} berstatus Nonaktif dan tidak dapat diberi poin pelanggaran.`,
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!selectedViolation) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Validasi Gagal',
        message: 'Silakan pilih Jenis Pelanggaran.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!selectedViolation.points || selectedViolation.points <= 0) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Point Tidak Valid',
        message: 'Point pelanggaran harus bernilai lebih dari 0.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // DUPLICATE TRANSACTION CHECK
    const isDuplicate = historyTransactions.some(t => 
      t.studentNis === selectedStudent.nis &&
      t.date === date &&
      (t.time || '') === time &&
      t.itemName === selectedViolation.name
    );

    if (isDuplicate) {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'Peringatan Data Ganda',
        message: `Data pelanggaran "${selectedViolation.name}" untuk siswa ${selectedStudent.name} pada tanggal ${date} jam ${time} sudah tersimpan sebelumnya!`,
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Save transaction
    saveTransaction({
      type: 'pelanggaran',
      date,
      time,
      studentId: selectedStudent.id,
      studentNis: selectedStudent.nis,
      studentName: selectedStudent.name,
      className: selectedStudent.className,
      majorName: selectedStudent.majorName,
      level: selectedLevel,
      itemCategory: selectedViolation.category,
      itemName: selectedViolation.name,
      itemId: selectedViolation.id,
      points: selectedViolation.points,
      officerName: activeUser.name,
      officerEmail: activeUser.email || 'petugas@sekolah.sch.id',
      officerRole: activeUser.role,
      officerUserId: activeUser.id,
      notes: notes.trim()
    });

    logActivity(
      activeUser.name,
      activeUser.role,
      'CATAT_PELANGGARAN',
      `Siswa: ${selectedStudent.name} (${selectedStudent.className}) - ${selectedViolation.name} (+${selectedViolation.points} Poin)`,
      activeUser.email,
      'Input Pelanggaran'
    );

    const newNetPoints = selectedStudent.netPoints + selectedViolation.points;

    refreshData();

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Pelanggaran Disimpan!',
      message: `Poin pelanggaran (+${selectedViolation.points}) berhasil dicatat untuk ${selectedStudent.name}.\n\nTotal poin bersih siswa sekarang: ${newNetPoints} Poin.`,
      onConfirm: () => {
        setAlertState(prev => ({ ...prev, isOpen: false }));
        handleResetForm();
        if (onSuccessNavigate) {
          // Stay on view or navigate
        }
      }
    });
  };

  // EDIT TRANSACTION HANDLERS
  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setEditDate(trx.date);
    setEditTime(trx.time || '08:00');
    
    // Find matching violation by name
    const matchedV = masterViolations.find(v => v.name === trx.itemName);
    setEditViolationId(matchedV ? matchedV.id : masterViolations[0]?.id || '');
    setEditOfficerName(trx.officerName);
    setEditNotes(trx.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrx) return;

    const matchedViolation = masterViolations.find(v => v.id === editViolationId);
    if (!matchedViolation) return;

    saveTransaction({
      id: editingTrx.id,
      type: 'pelanggaran',
      date: editDate,
      time: editTime,
      studentId: editingTrx.studentId,
      studentNis: editingTrx.studentNis,
      studentName: editingTrx.studentName,
      className: editingTrx.className,
      majorName: editingTrx.majorName,
      level: editingTrx.level || 'X',
      itemCategory: matchedViolation.category,
      itemName: matchedViolation.name,
      itemId: matchedViolation.id,
      points: matchedViolation.points,
      officerName: editOfficerName.trim() || userName,
      notes: editNotes.trim()
    });

    logActivity(
      userName,
      role,
      'EDIT_PELANGGARAN',
      `Edit Transaksi #${editingTrx.id} - Siswa: ${editingTrx.studentName}`
    );

    setEditingTrx(null);
    refreshData();

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Berhasil Diperbarui',
      message: 'Data transaksi pelanggaran berhasil diperbarui.',
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // DELETE TRANSACTION HANDLER
  const handleDeleteTrx = (trx: Transaction) => {
    if (!isAdmin) return; // Only admin can delete

    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Transaksi Pelanggaran?',
      message: `Apakah Anda yakin ingin menghapus data pelanggaran "${trx.itemName}" atas nama ${trx.studentName}? Point siswa akan otomatis dikurangi kembali.`,
      showCancel: true,
      onConfirm: () => {
        deleteTransaction(trx.id);
        logActivity(
          userName,
          role,
          'HAPUS_PELANGGARAN',
          `Hapus Transaksi: ${trx.studentName} - ${trx.itemName} (-${trx.points} Poin)`
        );
        refreshData();
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Terhapus!',
          message: 'Data transaksi pelanggaran berhasil dihapus.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
      }
    });
  };

  // HISTORY FILTERING & SORTING
  const filteredHistory = useMemo(() => {
    return historyTransactions.filter(item => {
      // Search query
      const query = historySearch.toLowerCase().trim();
      const matchSearch = !query ||
        item.studentName.toLowerCase().includes(query) ||
        item.studentNis.includes(query) ||
        item.itemName.toLowerCase().includes(query) ||
        item.className.toLowerCase().includes(query) ||
        item.officerName.toLowerCase().includes(query);

      // Filters
      const matchMajor = historyFilterMajor === 'all' || item.majorName === historyFilterMajor;
      const matchLevel = historyFilterLevel === 'all' || (item.level || '') === historyFilterLevel || item.className.startsWith(historyFilterLevel);
      const matchClass = historyFilterClass === 'all' || item.className === historyFilterClass;
      const matchDate = !historyFilterDate || item.date === historyFilterDate;

      return matchSearch && matchMajor && matchLevel && matchClass && matchDate;
    }).sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [historyTransactions, historySearch, historyFilterMajor, historyFilterLevel, historyFilterClass, historyFilterDate, sortField, sortDirection]);

  // Pagination for History
  const totalPages = Math.ceil(filteredHistory.length / (itemsPerPage || 1)) || 1;
  const paginatedHistory = useMemo(() => {
    if (itemsPerPage === 0) return filteredHistory;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // EXPORT EXCEL FUNCTION
  const handleExportExcel = () => {
    if (filteredHistory.length === 0) {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'Tidak Ada Data',
        message: 'Tidak ada data transaksi pelanggaran yang sesuai dengan filter untuk diekspor.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const exportData = filteredHistory.map((item, index) => ({
      'No': index + 1,
      'Tanggal': item.date,
      'Jam': item.time || '-',
      'NIS': item.studentNis,
      'Nama Siswa': item.studentName,
      'Jurusan': item.majorName || '-',
      'Tingkat': item.level || '-',
      'Kelas': item.className,
      'Kategori': item.itemCategory,
      'Pelanggaran': item.itemName,
      'Point': item.points,
      'Nama Petugas': item.officerName,
      'Role Petugas': item.officerRole === 'admin' ? 'Admin' : 'Tim Kesiswaan',
      'Email Petugas': item.officerEmail || '-',
      'Waktu Input': item.createdAt || '-',
      'Keterangan': item.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },  // No
      { wch: 12 }, // Tanggal
      { wch: 10 }, // Jam
      { wch: 14 }, // NIS
      { wch: 24 }, // Nama Siswa
      { wch: 12 }, // Jurusan
      { wch: 10 }, // Tingkat
      { wch: 14 }, // Kelas
      { wch: 18 }, // Kategori
      { wch: 32 }, // Pelanggaran
      { wch: 10 }, // Point
      { wch: 20 }, // Petugas
      { wch: 28 }  // Keterangan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Pelanggaran');

    const fileName = `Riwayat_Pelanggaran_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    logActivity(
      userName,
      role,
      'EXPORT_PELANGGARAN_EXCEL',
      `Export Riwayat Pelanggaran (${filteredHistory.length} Data)`
    );

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Export Berhasil!',
      message: `File ${fileName} (${filteredHistory.length} data) berhasil diunduh.`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // PRINT / EXPORT PDF REPORT FUNCTION
  const handlePrintReport = () => {
    if (filteredHistory.length === 0) {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'Tidak Ada Data',
        message: 'Tidak ada data transaksi pelanggaran untuk dicetak.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Pop-up Ditolak',
        message: 'Izinkan pop-up browser untuk mencetak laporan.',
        onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const rowsHtml = filteredHistory.map((item, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="text-align: center;">${item.date} ${item.time ? `<br><small style="color:#666;">${item.time}</small>` : ''}</td>
        <td style="font-family: monospace; text-align: center;">${item.studentNis}</td>
        <td><strong>${item.studentName}</strong></td>
        <td>${item.className} (${item.majorName})</td>
        <td><strong>${item.itemCategory}</strong><br>${item.itemName}</td>
        <td style="text-align: center; font-weight: bold; color: #dc2626;">+${item.points}</td>
        <td>${item.officerName}</td>
        <td>${item.notes || '-'}</td>
      </tr>
    `).join('');

    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const totalPointsSum = filteredHistory.reduce((s, i) => s + i.points, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Transaksi Pelanggaran Siswa - ${settings.schoolName}</title>
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1e293b; margin: 20px; }
          .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 16pt; margin: 0; text-transform: uppercase; color: #0f172a; }
          .header h2 { font-size: 13pt; margin: 4px 0 0 0; color: #334155; }
          .header p { font-size: 9pt; margin: 4px 0 0 0; color: #64748b; }
          .meta { display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 10px; }
          th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 6px; text-transform: uppercase; font-size: 8.5pt; }
          td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .summary { margin-top: 15px; font-size: 10pt; font-weight: bold; text-align: right; }
          .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10pt; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 220px; }
          .sign-space { height: 60px; }
          @media print {
            body { margin: 0; }
            @page { size: A4 landscape; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings.schoolName}</h1>
          <h2>LAPORAN TRANSAKSI PELANGGARAN SISWA</h2>
          <p>${settings.schoolAddress || 'Sistem Informasi Kedisiplinan & Poin Kesiswaan'}</p>
        </div>

        <div class="meta">
          <div><strong>Tanggal Cetak:</strong> ${todayStr}</div>
          <div><strong>Dicetak Oleh:</strong> ${userName} (${role.toUpperCase()})</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th style="width: 80px;">Tanggal</th>
              <th style="width: 80px;">NIS</th>
              <th style="width: 140px;">Nama Siswa</th>
              <th style="width: 100px;">Kelas</th>
              <th>Pelanggaran & Kategori</th>
              <th style="width: 50px;">Point</th>
              <th style="width: 110px;">Petugas</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary">
          Total Kasus Pelanggaran: ${filteredHistory.length} | Total Akumulasi Poin: +${totalPointsSum} Poin
        </div>

        <div class="footer-sign">
          <div class="sign-box">
            <p>Mengetahui,<br>Kepala Sekolah</p>
            <div class="sign-space"></div>
            <p><strong><u>${settings.headmasterName || 'NAMA KEPALA SEKOLAH'}</u></strong><br>NIP. ${settings.headmasterNip || '-'}</p>
          </div>
          <div class="sign-box">
            <p>Petugas Kesiswaan,</p>
            <div class="sign-space"></div>
            <p><strong><u>${userName}</u></strong><br>Petugas Pelapor</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER TITLE CARD */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 shadow-xs shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Input Pelanggaran Siswa</span>
              <span className="text-xs px-2.5 py-0.5 bg-red-50 text-red-600 dark:bg-red-950/80 dark:text-red-300 font-bold rounded-full border border-red-200/50">
                Cascading Dropdown Mode
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Urutan input bertingkat: Jurusan → Tingkat → Kelas → Nama Siswa → Jenis Pelanggaran.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* FORM INPUT CONTAINER WITH CASCADING DROPDOWNS */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-sm tracking-wide">Form Pencatatan Pelanggaran Tata Tertib</h3>
          </div>
          <span className="text-[11px] bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full font-semibold">
            Petugas: {officerName}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          {/* STEP 1: DATE & TIME & READONLY OFFICER INFO */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                  <span>Tanggal Kejadian *</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-500" />
                  <span>Jam Kejadian *</span>
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* AUTOMATIC READONLY OFFICER DISPLAY */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Petugas Pelapor (Otomatis Dari Sesi Login) *</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" /> Readonly / Terkunci
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Nama Petugas</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{activeUser.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Role</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    {activeUser.role === 'admin' ? 'Admin' : 'Tim Kesiswaan'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Email Petugas</div>
                  <div className="font-mono text-slate-600 dark:text-slate-300 truncate">
                    {activeUser.email || 'petugas@sekolah.sch.id'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: CASCADING DROPDOWNS FOR STUDENT SELECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Filter Hirarki Siswa (Cascading Selection)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. JURUSAN */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Pilih Jurusan *
                </label>
                <select
                  value={selectedMajor}
                  onChange={e => handleMajorChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white cursor-pointer focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Pilih Jurusan --</option>
                  {availableMajors.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 2. TINGKAT */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  2. Pilih Tingkat *
                </label>
                <select
                  disabled={!selectedMajor}
                  value={selectedLevel}
                  onChange={e => handleLevelChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white cursor-pointer disabled:opacity-50 focus:ring-2 focus:ring-red-500"
                >
                  <option value="">
                    {!selectedMajor ? '-- Pilih Jurusan Dulu --' : '-- Pilih Tingkat --'}
                  </option>
                  {availableLevels.map(lvl => (
                    <option key={lvl} value={lvl}>Tingkat {lvl}</option>
                  ))}
                </select>
              </div>

              {/* 3. KELAS */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  3. Pilih Kelas *
                </label>
                <select
                  disabled={!selectedLevel}
                  value={selectedClass}
                  onChange={e => handleClassChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white cursor-pointer disabled:opacity-50 focus:ring-2 focus:ring-red-500"
                >
                  <option value="">
                    {!selectedLevel ? '-- Pilih Tingkat Dulu --' : '-- Pilih Kelas --'}
                  </option>
                  {availableClasses.map(clsName => (
                    <option key={clsName} value={clsName}>{clsName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. NAMA SISWA SEARCHABLE DROPDOWN */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                4. Pilih Nama Siswa Terlanggar (Status Aktif) *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search query filter input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    disabled={!selectedClass}
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    placeholder={selectedClass ? "Cari NIS / Nama Siswa..." : "Pilih Kelas Dulu..."}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Main Student Select */}
                <div className="sm:col-span-2">
                  <select
                    disabled={!selectedClass}
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white cursor-pointer disabled:opacity-50 focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">
                      {!selectedClass 
                        ? '-- Pilih Kelas Terlebih Dahulu --' 
                        : availableStudents.length === 0 
                          ? '-- Tidak Ada Siswa Aktif di Kelas Ini --' 
                          : `-- Pilih Siswa (${availableStudents.length} Siswa Aktif) --`}
                    </option>
                    {availableStudents.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.nis} - {st.name} [{st.className} {st.majorName}] (Poin Bersih: {st.netPoints})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* AUTO-FILLED STUDENT BADGE & DETAILS */}
          {selectedStudent && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md font-mono font-bold text-[10px]">
                    NIS: {selectedStudent.nis}
                  </span>
                  <span className="font-extrabold text-blue-950 dark:text-blue-100 text-sm">
                    {selectedStudent.name}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full font-bold text-[10px]">
                    Status: {selectedStudent.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span><strong>Jurusan:</strong> {selectedStudent.majorName}</span>
                  <span><strong>Tingkat:</strong> {selectedLevel || 'X'}</span>
                  <span><strong>Kelas:</strong> {selectedStudent.className}</span>
                  <span><strong>Gender:</strong> {selectedStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto shrink-0 bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-blue-900 shadow-xs">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Poin Pelanggaran Saat Ini</div>
                  <div className="text-sm font-black text-red-600">{selectedStudent.totalPelanggaran} Poin</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VIOLATION SELECTION */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              <span>Detail Pelanggaran Tata Tertib</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Jenis Pelanggaran Dropdown */}
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Jenis Pelanggaran *
                </label>
                <select
                  required
                  value={selectedViolationId}
                  onChange={e => setSelectedViolationId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white cursor-pointer focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {masterViolations.map(v => (
                    <option key={v.id} value={v.id}>
                      [{v.category}] {v.name} (+{v.points} Poin)
                    </option>
                  ))}
                </select>
              </div>

              {/* Point Readonly Badge */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Poin Pelanggaran (Auto)
                </label>
                <div className="p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl font-extrabold text-red-700 dark:text-red-300 flex items-center justify-between">
                  <span>{selectedViolation ? selectedViolation.category : 'Kategori'}</span>
                  <span className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs shadow-xs">
                    {selectedViolation ? `+${selectedViolation.points} Poin` : '0 Poin'}
                  </span>
                </div>
              </div>
            </div>

            {/* Keterangan / Kronologi Notes */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan Tambahan / Kronologi Kejadian (Opsional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Catatkan lokasi kejadian, nama saksi, atau kronologi singkat..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* FORM ACTION BUTTONS: SIMPAN, RESET, BATAL */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Form</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-7 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pelanggaran</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIWAYAT PELANGGARAN SISWA (DATATABLES HISTORY SECTION) */}
      <div className="space-y-4">
        {/* Table Top Card & Action Buttons */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              <span>Riwayat Transaksi Pelanggaran Siswa</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar seluruh catatan kasus pelanggaran tata tertib yang telah terarsip di database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              title="Export Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              title="Cetak Laporan / PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan / PDF</span>
            </button>
          </div>
        </div>

        {/* DATATABLES FILTERS & SEARCH */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={e => { setHistorySearch(e.target.value); setCurrentPage(1); }}
                placeholder="Cari NIS, Nama, Pelanggaran, Petugas..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Filter Jurusan */}
            <div>
              <select
                value={historyFilterMajor}
                onChange={e => { setHistoryFilterMajor(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              >
                <option value="all">Semua Jurusan</option>
                {availableMajors.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filter Tingkat */}
            <div>
              <select
                value={historyFilterLevel}
                onChange={e => { setHistoryFilterLevel(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              >
                <option value="all">Semua Tingkat</option>
                <option value="X">Tingkat X</option>
                <option value="XI">Tingkat XI</option>
                <option value="XII">Tingkat XII</option>
              </select>
            </div>

            {/* Filter Kelas */}
            <div>
              <select
                value={historyFilterClass}
                onChange={e => { setHistoryFilterClass(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              >
                <option value="all">Semua Kelas</option>
                {classesList.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Tanggal */}
            <div>
              <input
                type="date"
                value={historyFilterDate}
                onChange={e => { setHistoryFilterDate(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>
          </div>

          {/* Rows Per Page & Counter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500">
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
              Total Ditemukan: <span className="font-bold text-red-600 dark:text-red-400">{filteredHistory.length}</span> transaksi
            </div>
          </div>
        </div>

        {/* HISTORY TABLE DATA */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="p-3 w-10 text-center">No</th>
                  <th 
                    onClick={() => handleSort('date')}
                    className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tanggal & Jam</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('studentNis')}
                    className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>NIS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('studentName')}
                    className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama Siswa</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('className')}
                    className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Kelas / Jurusan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3">Jenis Pelanggaran</th>
                  <th 
                    onClick={() => handleSort('points')}
                    className="p-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Point</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3">Petugas</th>
                  <th className="p-3">Keterangan</th>
                  <th className="p-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((trx, idx) => {
                    const rowNum = itemsPerPage === 0 ? idx + 1 : (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{rowNum}</td>
                        <td className="p-3 font-semibold whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200">{trx.date}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{trx.time || '08:00'}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">{trx.studentNis}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{trx.studentName}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          <div className="font-bold">{trx.className}</div>
                          <div className="text-[10px] text-slate-400">{trx.majorName}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-md font-bold text-[10px] block w-fit mb-0.5">
                            {trx.itemCategory}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{trx.itemName}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-1 bg-red-600 text-white rounded-full font-black text-[11px] shadow-xs">
                            +{trx.points}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{trx.officerName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold uppercase text-[9px]">
                              {trx.officerRole === 'admin' ? 'Admin' : 'Tim Kesiswaan'}
                            </span>
                            {trx.officerEmail && <span className="truncate max-w-[120px]">{trx.officerEmail}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{trx.notes || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(trx)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Transaksi Pelanggaran"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteTrx(trx)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Transaksi"
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
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-8 h-8 text-slate-300" />
                        <div className="font-bold text-slate-600 dark:text-slate-300">Belum ada riwayat transaksi pelanggaran</div>
                        <div className="text-xs">Silakan input pelanggaran siswa melalui form di atas.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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
      </div>

      {/* EDIT TRANSACTION MODAL */}
      {editingTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>Edit Transaksi Pelanggaran Siswa</span>
              </h3>
              <button onClick={() => setEditingTrx(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{editingTrx.studentName}</div>
                  <div className="text-[11px] text-slate-500">NIS: {editingTrx.studentNis} • Kelas: {editingTrx.className}</div>
                </div>
                <span className="px-2.5 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-full font-bold text-[10px]">
                  Pelanggaran
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jam *</label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Pelanggaran *</label>
                <select
                  required
                  value={editViolationId}
                  onChange={e => setEditViolationId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                >
                  {masterViolations.map(v => (
                    <option key={v.id} value={v.id}>
                      [{v.category}] {v.name} (+{v.points} Poin)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Petugas Pelapor *</label>
                <input
                  type="text"
                  required
                  value={editOfficerName}
                  onChange={e => setEditOfficerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Kronologi</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTrx(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SWEETALERT MODAL */}
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
