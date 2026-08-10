import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserRole, DisciplineStatus, StudentPointSummary, Transaction 
} from '../types';
import { 
  getStudentPointSummaries, getTransactions, getClasses, getMajors, getSettings, 
  getDisciplineRuleByPoints, getDisciplineStatusHistory 
} from '../utils/storage';
import { getStudentLevelInfo } from './StudentsView';
import { 
  FileSpreadsheet, Printer, Download, Search, Filter, RefreshCw, 
  History, Eye, X, ArrowUpDown, ChevronLeft, ChevronRight, 
  Layers, School, GraduationCap, ShieldAlert, AlertTriangle, CheckCircle2, FileText, UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
  role: UserRole;
  userName: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ role, userName }) => {
  const [students, setStudents] = useState<StudentPointSummary[]>(getStudentPointSummaries());
  const transactions = getTransactions();
  const classes = getClasses();
  const majors = getMajors();
  const settings = getSettings();

  // Filter States
  const [reportType, setReportType] = useState<'all' | 'student' | 'class' | 'major'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('ALL');
  const [selectedTingkat, setSelectedTingkat] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Datatables Pagination & Sorting
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<'nis' | 'name' | 'className' | 'totalPelanggaran' | 'disciplineStatus'>('totalPelanggaran');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<StudentPointSummary | null>(null);

  // Refresh function
  const refreshData = () => {
    setStudents(getStudentPointSummaries());
  };

  // Compute available classes for cascading filter
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();

    classes.forEach(c => {
      const cLevel = getStudentLevelInfo(c.name, classes).code;
      const cMajor = c.major || c.name;

      const matchMajor = selectedMajor === 'ALL' || cMajor.toLowerCase().includes(selectedMajor.toLowerCase());
      const matchTingkat = selectedTingkat === 'ALL' || cLevel === selectedTingkat;

      if (matchMajor && matchTingkat) {
        classSet.add(c.name);
      }
    });

    students.forEach(s => {
      const sLevel = getStudentLevelInfo(s.className, classes).code;
      const matchMajor = selectedMajor === 'ALL' || (s.majorName && s.majorName.toLowerCase().includes(selectedMajor.toLowerCase()));
      const matchTingkat = selectedTingkat === 'ALL' || sLevel === selectedTingkat;

      if (matchMajor && matchTingkat && s.className) {
        classSet.add(s.className);
      }
    });

    return Array.from(classSet).sort();
  }, [classes, students, selectedMajor, selectedTingkat]);

  // Reset class filter if invalid
  useEffect(() => {
    if (selectedClass !== 'ALL' && !availableClasses.includes(selectedClass)) {
      setSelectedClass('ALL');
    }
  }, [selectedMajor, selectedTingkat, availableClasses, selectedClass]);

  // Filtered Students Calculation
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (reportType === 'student' && selectedStudentId && s.id !== selectedStudentId) {
        return false;
      }

      const levelInfo = getStudentLevelInfo(s.className, classes);

      const matchesSearch = 
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMajor = 
        selectedMajor === 'ALL' || 
        s.majorName.toLowerCase() === selectedMajor.toLowerCase();

      const matchesTingkat = 
        selectedTingkat === 'ALL' || 
        levelInfo.code === selectedTingkat;

      const matchesClass = 
        selectedClass === 'ALL' || 
        s.className.toLowerCase() === selectedClass.toLowerCase();

      const matchesStatus = 
        selectedStatusFilter === 'ALL' || 
        s.disciplineStatus === selectedStatusFilter;

      return matchesSearch && matchesMajor && matchesTingkat && matchesClass && matchesStatus;
    }).sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (typeof valA === 'string' || typeof valB === 'string') {
        const strA = String(valA);
        const strB = String(valB);
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
      return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [
    students, reportType, selectedStudentId, searchQuery, selectedMajor, 
    selectedTingkat, selectedClass, selectedStatusFilter, sortField, sortDirection, classes
  ]);

  // Datatables Pagination Calculation
  const totalRecords = filteredStudents.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIdx, startIdx + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Sorting Handler
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s, idx) => {
      const levelInfo = getStudentLevelInfo(s.className, classes);
      return {
        No: idx + 1,
        NIS: s.nis,
        NamaSiswa: s.name,
        JenisKelamin: s.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
        Jurusan: s.majorName,
        Tingkat: levelInfo.label,
        Kelas: s.className,
        TotalPoinPelanggaran: s.totalPelanggaran,
        StatusKedisiplinan: s.disciplineStatus,
        JenisPeringatan: s.warningLevel,
        KeteranganTindakLanjut: s.followUpAction
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Poin Otomatis');
    XLSX.writeFile(workbook, `Laporan_Status_Kedisiplinan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper Badge Colors for Automated Statuses
  const getDisciplineStatusBadgeClass = (status: DisciplineStatus | string) => {
    switch (status) {
      case 'Baik':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Perlu Pembinaan':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Pembinaan Intensif':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      case 'Pengawasan Khusus':
        return 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800';
      case 'Sangat Berat':
        return 'bg-rose-900 text-white dark:bg-rose-950 dark:text-rose-100 border-rose-800';
      case 'Dikembalikan kepada Orang Tua':
        return 'bg-slate-900 text-white dark:bg-black dark:text-slate-100 border-slate-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    }
  };

  // Student specific violation transactions for detail modal
  const studentViolations = useMemo(() => {
    if (!selectedDetailStudent) return [];
    return transactions.filter(
      t => (t.studentId === selectedDetailStudent.id || t.studentNis === selectedDetailStudent.nis) && t.type === 'pelanggaran'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedDetailStudent, transactions]);

  const latestUpdatedDate = useMemo(() => {
    if (studentViolations.length === 0) return '-';
    return studentViolations[0].date + (studentViolations[0].time ? ` ${studentViolations[0].time}` : '');
  }, [studentViolations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <span>Laporan Poin & Status Kedisiplinan Otomatis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Penetapan <strong>Status Kedisiplinan</strong>, <strong>Jenis Peringatan</strong>, dan <strong>Tindak Lanjut</strong> secara otomatis berdasarkan total poin pelanggaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Data */}
          <button
            onClick={refreshData}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          {/* Print PDF */}
          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Laporan Kedisiplinan:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Semua Data' },
              { id: 'student', label: 'Per Siswa' },
              { id: 'class', label: 'Per Kelas' },
              { id: 'major', label: 'Per Jurusan' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setReportType(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  reportType === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Status Kedisiplinan Filter */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
              <span>Status Kedisiplinan:</span>
            </label>
            <select
              value={selectedStatusFilter}
              onChange={e => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="Baik">Baik (0–19 Poin)</option>
              <option value="Perlu Pembinaan">Perlu Pembinaan (20–39 Poin)</option>
              <option value="Pembinaan Intensif">Pembinaan Intensif (40–59 Poin)</option>
              <option value="Pengawasan Khusus">Pengawasan Khusus (60–79 Poin)</option>
              <option value="Sangat Berat">Sangat Berat (80–99 Poin)</option>
              <option value="Dikembalikan kepada Orang Tua">Dikembalikan kpd Ortunya (≥100 Poin)</option>
            </select>
          </div>

          {/* Jurusan Filter */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              <span>Jurusan:</span>
            </label>
            <select
              value={selectedMajor}
              onChange={e => {
                setSelectedMajor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
            >
              <option value="ALL">Semua Jurusan</option>
              {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>

          {/* Tingkat Filter */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tingkat:</span>
            </label>
            <select
              value={selectedTingkat}
              onChange={e => {
                setSelectedTingkat(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="X">Sepuluh (X)</option>
              <option value="XI">Sebelas (XI)</option>
              <option value="XII">Dua Belas (XII)</option>
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-purple-500" />
              <span>Kelas:</span>
            </label>
            <select
              value={selectedClass}
              onChange={e => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Cari Nama / NIS:</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari NIS / Nama..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DATATABLES TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4 print:hidden">
        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <span className="font-bold text-slate-800 dark:text-white">{filteredStudents.length}</span> dari {students.length} total siswa
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Tampilkan per halaman:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
        </div>
      </div>

      {/* MAIN TABLE PREVIEW */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-4 text-center w-12">No</th>
                <th onClick={() => handleSort('nis')} className="p-4 cursor-pointer hover:text-blue-600 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>NIS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-blue-600 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4">Kelas & Jurusan</th>
                <th onClick={() => handleSort('totalPelanggaran')} className="p-4 text-center cursor-pointer hover:text-blue-600 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>Total Poin</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('disciplineStatus')} className="p-4 text-center cursor-pointer hover:text-blue-600 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span>Status Kedisiplinan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4">Jenis Peringatan</th>
                <th className="p-4 max-w-xs">Keterangan / Tindak Lanjut</th>
                <th className="p-4 text-center print:hidden">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((s, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400 text-[11px]">{rowNumber}</td>
                      <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">{s.nis}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{s.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <span className="font-black text-slate-800 dark:text-slate-100">{s.className}</span>
                        <div className="text-[10px] text-slate-400">{s.majorName}</div>
                      </td>
                      
                      {/* Total Poin */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 font-black rounded-lg text-xs ${
                          s.totalPelanggaran >= 100
                            ? 'bg-slate-900 text-white dark:bg-black dark:text-slate-100 shadow-md'
                            : s.totalPelanggaran >= 60
                            ? 'bg-red-600 text-white shadow-xs'
                            : s.totalPelanggaran >= 20
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {s.totalPelanggaran} Poin
                        </span>
                      </td>

                      {/* Status Kedisiplinan Automated Badge */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1.5 text-xs font-black rounded-xl border ${getDisciplineStatusBadgeClass(s.disciplineStatus)}`}>
                          {s.disciplineStatus}
                        </span>
                      </td>

                      {/* Jenis Peringatan */}
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-200 text-xs">
                        {s.warningLevel}
                      </td>

                      {/* Keterangan / Tindak Lanjut */}
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed max-w-xs">
                        {s.followUpAction}
                      </td>

                      {/* Detail Action */}
                      <td className="p-4 text-center print:hidden">
                        <button
                          onClick={() => setSelectedDetailStudent(s)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-[11px] font-bold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          title="Lihat Detail Siswa & Riwayat"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter laporan.
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
              Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> sampai <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, totalRecords)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-200">{totalRecords}</span> data
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold rounded-xl border border-blue-200 dark:border-blue-900">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STUDENT DETAIL MODAL */}
      {selectedDetailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Detail Laporan Kedisiplinan Siswa</span>
              </div>
              <button
                onClick={() => setSelectedDetailStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Profile Header */}
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Identitas Siswa</div>
                  <div className="text-base font-extrabold text-slate-800 dark:text-white mt-1">{selectedDetailStudent.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">NIS: {selectedDetailStudent.nis} • {selectedDetailStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-bold mt-1">Kelas: {selectedDetailStudent.className} ({selectedDetailStudent.majorName})</div>
                </div>

                <div className="flex flex-col justify-center items-start md:items-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Total Poin Pelanggaran</div>
                  <div className="text-3xl font-black text-red-600 mt-0.5">{selectedDetailStudent.totalPelanggaran} <span className="text-xs font-normal text-slate-500">Poin</span></div>
                  <div className="text-[11px] text-slate-400 mt-1">Update Terakhir: <strong className="text-slate-600 dark:text-slate-300 font-mono">{latestUpdatedDate}</strong></div>
                </div>
              </div>

              {/* Status Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400 uppercase text-[10px] font-bold mb-1">Status Kedisiplinan</div>
                  <span className={`inline-block px-3 py-1.5 text-xs font-black rounded-xl border ${getDisciplineStatusBadgeClass(selectedDetailStudent.disciplineStatus)}`}>
                    {selectedDetailStudent.disciplineStatus}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 md:col-span-2">
                  <div className="text-slate-400 uppercase text-[10px] font-bold mb-1">Jenis Peringatan</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{selectedDetailStudent.warningLevel}</div>
                </div>
              </div>

              {/* Tindak Lanjut Card */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
                <div className="font-bold text-amber-900 dark:text-amber-300 text-xs mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Keterangan / Tindak Lanjut Sekolah:</span>
                </div>
                <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
                  {selectedDetailStudent.followUpAction}
                </div>
              </div>

              {/* Riwayat Pelanggaran Table */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-xs mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Riwayat Catatan Pelanggaran Siswa ({studentViolations.length} Transaksi)</span>
                </h4>

                {studentViolations.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Pelanggaran</th>
                          <th className="p-2.5 text-center">Poin</th>
                          <th className="p-2.5">Petugas</th>
                          <th className="p-2.5">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {studentViolations.map(v => (
                          <tr key={v.id}>
                            <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{v.date} {v.time}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{v.itemName}</td>
                            <td className="p-2.5 text-center font-black text-red-600">+{v.points}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">{v.officerName}</td>
                            <td className="p-2.5 text-slate-500 italic">{v.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                    Siswa ini belum memiliki catatan transaksi pelanggaran.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / OFFICIAL PDF REPORT MODAL */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="font-bold text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Pratinjau Cetak Laporan Status Kedisiplinan Otomatis Siswa</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cetak Sekarang (Print)
                </button>
                <button
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Print Content Area */}
            <div className="p-8 overflow-y-auto font-serif space-y-6 bg-white text-slate-900">
              {/* Kop Surat Header */}
              <div className="text-center border-b-4 border-double border-slate-800 pb-4">
                <h1 className="text-xl font-bold uppercase tracking-wide">{settings.schoolName}</h1>
                <p className="text-xs font-sans mt-0.5">{settings.schoolAddress}</p>
                <p className="text-[11px] font-sans italic mt-0.5">Website / Email Resmi Sekolah • Telp. Kantor Kesiswaan</p>
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-base font-bold uppercase underline tracking-wider">
                  LAPORAN REKAPITULASI STATUS KEDISIPLINAN SISWA
                </h2>
                <p className="text-xs font-sans mt-1">
                  Tahun Ajaran {settings.academicYear} — Semester {settings.semester}
                </p>
              </div>

              {/* Summary Table */}
              <table className="w-full text-left text-xs font-sans border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300 text-center">No</th>
                    <th className="p-2 border border-slate-300">NIS</th>
                    <th className="p-2 border border-slate-300">Nama Siswa</th>
                    <th className="p-2 border border-slate-300">Kelas / Jurusan</th>
                    <th className="p-2 border border-slate-300 text-center">Total Poin</th>
                    <th className="p-2 border border-slate-300 text-center">Status Kedisiplinan</th>
                    <th className="p-2 border border-slate-300">Jenis Peringatan</th>
                    <th className="p-2 border border-slate-300 max-w-xs">Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold">{s.nis}</td>
                      <td className="p-2 border border-slate-300 font-bold">{s.name}</td>
                      <td className="p-2 border border-slate-300">{s.className} ({s.majorName})</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-red-600">{s.totalPelanggaran} Poin</td>
                      <td className="p-2 border border-slate-300 text-center font-bold">
                        {s.disciplineStatus}
                      </td>
                      <td className="p-2 border border-slate-300 font-bold">{s.warningLevel}</td>
                      <td className="p-2 border border-slate-300 text-[10px] leading-tight">{s.followUpAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signature Block */}
              <div className="pt-12 font-sans text-xs flex justify-between items-end">
                <div className="text-center">
                  <div>Mengetahui,</div>
                  <div className="font-bold mt-1">Kepala Sekolah</div>
                  <div className="mt-16 font-bold underline">{settings.headmasterName}</div>
                  <div className="text-[10px] text-slate-500">NIP. {settings.headmasterNip}</div>
                </div>

                <div className="text-center">
                  <div>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="font-bold mt-1">Ketua Tim Kesiswaan</div>
                  <div className="mt-16 font-bold underline">Siti Rahma, S.Pd</div>
                  <div className="text-[10px] text-slate-500">NIP. 19820415 200801 2 018</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
