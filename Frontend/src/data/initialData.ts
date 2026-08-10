import { User, Student, ClassItem, MajorItem, MasterViolation, Transaction, SystemSettings, ActivityLog } from '../types';

export const initialUsers: User[] = [
  {
    id: 'usr-1',
    email: 'admin@sekolah.sch.id',
    username: 'admin',
    nipNik: '19850315 201001 1 008',
    phone: '081234567890',
    passwordHash: 'admin123',
    name: 'Budi Santoso, S.Kom (Admin)',
    role: 'admin',
    status: 'Aktif',
    createdAt: '2026-01-10T08:00:00.000Z',
    lastLogin: '2026-07-29 08:30:15',
    lastLoginIp: '192.168.1.105',
    lastLoginBrowser: 'Chrome 126.0 (Windows 11)',
    lastLoginStatus: 'Sukses',
    createdBy: 'System Superadmin'
  },
  {
    id: 'usr-2',
    email: 'kesiswaan@sekolah.sch.id',
    username: 'kesiswaan',
    nipNik: '19900822 201502 2 004',
    phone: '085712345678',
    passwordHash: 'kesiswaan123',
    name: 'Siti Rahma, S.Pd (Tim Kesiswaan)',
    role: 'kesiswaan',
    status: 'Aktif',
    createdAt: '2026-01-12T09:30:00.000Z',
    lastLogin: '2026-07-28 14:15:00',
    lastLoginIp: '192.168.1.112',
    lastLoginBrowser: 'Edge 125.0 (Windows 11)',
    lastLoginStatus: 'Sukses',
    createdBy: 'Budi Santoso, S.Kom (Admin)'
  }
];

export const initialSettings: SystemSettings = {
  // Tab 1: Profil Sekolah
  schoolName: 'SMK NEGERI 1 SMART POINT',
  npsn: '20314589',
  schoolAddress: 'Jl. Pendidikan No. 45, Wonosobo',
  regency: 'Kab. Wonosobo',
  province: 'Jawa Tengah',
  schoolPhone: '(0286) 321456',
  schoolEmail: 'info@smkn1smartpoint.sch.id',
  schoolWebsite: 'https://smkn1smartpoint.sch.id',
  headmasterName: 'Drs. H. Ahmad Wijaya, M.Pd',
  headmasterNip: '19680512 199303 1 004',
  schoolLogoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
  faviconUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=32&auto=format&fit=crop&q=80',

  // Tab 2: Tahun Ajaran
  academicYear: '2026/2027',
  semester: 'Ganjil',

  // Tab 3: Pengaturan Poin
  pointThreshold: 100,
  autoCalculatePoints: true,
  autoDisciplineStatus: true,

  // Tab 4: Pengguna & Keamanan
  sessionTimeoutMinutes: 60,
  autoLogoutInactive: true,
  maxLoginAttempts: 5,
  forcePasswordChangeFirstLogin: false,
  enableAuditLog: true,

  // Tab 5: Tampilan Aplikasi
  appName: 'SMART POINT SISWA',
  loginLogoUrl: '',
  primaryColor: '#2563eb',
  sidebarColor: '#0f172a',
  navbarColor: '#ffffff',
  theme: 'Light',
  showLogoOnDashboard: true,

  // Tab 6: Backup & Restore
  backupHistory: [
    {
      id: 'bkp-1',
      date: '2026-07-28',
      time: '14:30:12',
      type: 'Otomatis',
      user: 'System',
      notes: 'Backup rutin mingguan database',
      size: '1.2 MB'
    },
    {
      id: 'bkp-2',
      date: '2026-07-20',
      time: '09:15:00',
      type: 'Manual',
      user: 'Budi Santoso (Admin)',
      notes: 'Backup sebelum pembaruan sistem v2.5',
      size: '1.1 MB'
    }
  ],

  // Tab 7: Tentang Aplikasi
  appVersion: 'v2.5.0',
  dbVersion: 'v2.1',
  gasVersion: 'v1.8',
  developerName: 'Google Apps Script & Web Dev Team',
  buildDate: '2026-07-29'
};

export const initialClasses: ClassItem[] = [
  { id: 'cls-1', code: 'X-MIPA-1', name: 'X IPA 1', level: 'X', major: 'MIPA', homeroomTeacher: 'Budi Santoso, S.Kom', status: 'Aktif', description: 'Kelas 10 Matematika dan IPA 1' },
  { id: 'cls-2', code: 'X-MIPA-2', name: 'X IPA 2', level: 'X', major: 'MIPA', homeroomTeacher: 'Siti Rahma, S.Pd', status: 'Aktif', description: 'Kelas 10 Matematika dan IPA 2' },
  { id: 'cls-3', code: 'XI-MIPA-1', name: 'XI IPA 1', level: 'XI', major: 'MIPA', homeroomTeacher: 'Drs. Ahmad Wijaya', status: 'Aktif', description: 'Kelas 11 Matematika dan IPA 1' },
  { id: 'cls-4', code: 'XI-IPS-1', name: 'XI IPS 1', level: 'XI', major: 'IPS', homeroomTeacher: 'Neneng Tri, M.Pd', status: 'Aktif', description: 'Kelas 11 Ilmu Pengetahuan Sosial 1' },
  { id: 'cls-5', code: 'XII-RPL-1', name: 'XII RPL 1', level: 'XII', major: 'RPL', homeroomTeacher: 'Eko Prasetyo, S.T', status: 'Aktif', description: 'Kelas 12 Rekayasa Perangkat Lunak 1' },
  { id: 'cls-6', code: 'XII-TKJ-1', name: 'XII TKJ 1', level: 'XII', major: 'TKJ', homeroomTeacher: 'Hendra Gunawan, S.Kom', status: 'Aktif', description: 'Kelas 12 Teknik Komputer Jaringan 1' }
];

export const initialMajors: MajorItem[] = [
  { id: 'mjr-1', name: 'MIPA', description: 'Matematika dan Ilmu Pengetahuan Alam' },
  { id: 'mjr-2', name: 'IPS', description: 'Ilmu Pengetahuan Sosial' },
  { id: 'mjr-3', name: 'RPL', description: 'Rekayasa Perangkat Lunak' },
  { id: 'mjr-4', name: 'TKJ', description: 'Teknik Komputer & Jaringan' }
];

export const initialMasterViolations: MasterViolation[] = [
  { id: 'vio-1', code: 'PLG001', category: 'Kedisiplinan Waktu', name: 'Terlambat Masuk Sekolah (< 15 menit)', points: 5, action: 'Teguran Lisan', status: 'Aktif' },
  { id: 'vio-2', code: 'PLG002', category: 'Kedisiplinan Waktu', name: 'Terlambat Masuk Sekolah (> 30 menit)', points: 10, action: 'Teguran Tertulis', status: 'Aktif' },
  { id: 'vio-3', code: 'PLG003', category: 'Kerapian & Seragam', name: 'Seragam Tidak Sesuai Ketentuan Hari', points: 10, action: 'Teguran Lisan', status: 'Aktif' },
  { id: 'vio-4', code: 'PLG004', category: 'Kerapian & Seragam', name: 'Rambut Panjang / Tidak Rapi (Putra)', points: 10, action: 'Pemotongan Rambut', status: 'Aktif' },
  { id: 'vio-5', code: 'PLG005', category: 'Kedisiplinan Belajar', name: 'Meninggalkan Kelas Tanpa Izin (Bolos Jam Pelajaran)', points: 20, action: 'Surat Peringatan I', status: 'Aktif' },
  { id: 'vio-6', code: 'PLG006', category: 'Sikap & Perilaku', name: 'Merokok di Lingkungan Sekolah', points: 50, action: 'Pemanggilan Orang Tua', status: 'Aktif' },
  { id: 'vio-7', code: 'PLG007', category: 'Sikap & Perilaku', name: 'Membawa / Menggunakan HP Saat KBM Tanpa Izin', points: 15, action: 'Penyitaan HP (1 Minggu)', status: 'Aktif' },
  { id: 'vio-8', code: 'PLG008', category: 'Pelanggaran Berat', name: 'Berkelahi / Tawuran', points: 80, action: 'Skorsing & SP II', status: 'Aktif' },
  { id: 'vio-9', code: 'PLG009', category: 'Pelanggaran Berat', name: 'Membawa Senjata Tajam / Obat Terlarang', points: 100, action: 'Skorsing & SP III / Dikembalikan ke Ortu', status: 'Aktif' }
];

export const initialStudents: Student[] = [
  {
    id: 'std-1',
    nis: '20261001',
    name: 'Andi Pratama',
    gender: 'L',
    className: 'X IPA 1',
    majorName: 'MIPA',
    address: 'Jl. Merdeka No. 12, Jakarta',
    parentPhone: '081234567890',
    status: 'Aktif',
    createdAt: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'std-2',
    nis: '20261002',
    name: 'Siti Nurhaliza',
    gender: 'P',
    className: 'X IPA 1',
    majorName: 'MIPA',
    address: 'Jl. Mawar No. 5, Jakarta',
    parentPhone: '081298765432',
    status: 'Aktif',
    createdAt: '2026-01-15T08:10:00.000Z'
  },
  {
    id: 'std-3',
    nis: '20261003',
    name: 'Rizky Febrian',
    gender: 'L',
    className: 'XI IPS 1',
    majorName: 'IPS',
    address: 'Jl. Melati No. 88, Jakarta',
    parentPhone: '081311223344',
    status: 'Aktif',
    createdAt: '2026-01-16T09:00:00.000Z'
  },
  {
    id: 'std-4',
    nis: '20261004',
    name: 'Dewi Lestari',
    gender: 'P',
    className: 'XII RPL 1',
    majorName: 'RPL',
    address: 'Jl. Anggrek No. 3, Jakarta',
    parentPhone: '081555667788',
    status: 'Aktif',
    createdAt: '2026-01-17T10:00:00.000Z'
  },
  {
    id: 'std-5',
    nis: '20261005',
    name: 'Muhammad Fikri',
    gender: 'L',
    className: 'XII TKJ 1',
    majorName: 'TKJ',
    address: 'Jl. Gatot Subroto No. 44, Jakarta',
    parentPhone: '081788990011',
    status: 'Aktif',
    createdAt: '2026-01-18T11:00:00.000Z'
  },
  {
    id: 'std-6',
    nis: '20261006',
    name: 'Bagus Setiawan',
    gender: 'L',
    className: 'XI IPS 1',
    majorName: 'IPS',
    address: 'Jl. Sudirman No. 99, Jakarta',
    parentPhone: '081900112233',
    status: 'Aktif',
    createdAt: '2026-01-19T08:30:00.000Z'
  },
  {
    id: 'std-7',
    nis: '20261007',
    name: 'Anisa Rahmawati',
    gender: 'P',
    className: 'X IPA 2',
    majorName: 'MIPA',
    address: 'Jl. Cempaka No. 21, Jakarta',
    parentPhone: '082122334455',
    status: 'Aktif',
    createdAt: '2026-01-20T09:15:00.000Z'
  },
  {
    id: 'std-8',
    nis: '20261008',
    name: 'Doni Kurniawan',
    gender: 'L',
    className: 'XII RPL 1',
    majorName: 'RPL',
    address: 'Jl. Pemuda No. 7, Jakarta',
    parentPhone: '082233445566',
    status: 'Aktif',
    createdAt: '2026-01-21T10:20:00.000Z'
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: 'trx-1',
    type: 'pelanggaran',
    date: '2026-07-20',
    studentId: 'std-1',
    studentNis: '20261001',
    studentName: 'Andi Pratama',
    className: 'X IPA 1',
    majorName: 'MIPA',
    itemCategory: 'Kedisiplinan Waktu',
    itemName: 'Terlambat Masuk Sekolah (< 15 menit)',
    points: 5,
    officerName: 'Siti Rahma, S.Pd',
    notes: 'Terlambat karena kendala angkutan umum',
    createdAt: '2026-07-20T07:20:00.000Z'
  },
  {
    id: 'trx-2',
    type: 'pelanggaran',
    date: '2026-07-22',
    studentId: 'std-3',
    studentNis: '20261003',
    studentName: 'Rizky Febrian',
    className: 'XI IPS 1',
    majorName: 'IPS',
    itemCategory: 'Sikap & Perilaku',
    itemName: 'Merokok di Lingkungan Sekolah',
    points: 50,
    officerName: 'Siti Rahma, S.Pd',
    notes: 'Kerap tertangkap di belakang kantin',
    createdAt: '2026-07-22T09:30:00.000Z'
  },
  {
    id: 'trx-3',
    type: 'pelanggaran',
    date: '2026-07-25',
    studentId: 'std-3',
    studentNis: '20261003',
    studentName: 'Rizky Febrian',
    className: 'XI IPS 1',
    majorName: 'IPS',
    itemCategory: 'Kedisiplinan Belajar',
    itemName: 'Meninggalkan Kelas Tanpa Izin (Bolos Jam Pelajaran)',
    points: 20,
    officerName: 'Budi Santoso, S.Kom',
    notes: 'Bolos jam ke-5 dan ke-6',
    createdAt: '2026-07-25T11:00:00.000Z'
  },
  {
    id: 'trx-4',
    type: 'pelanggaran',
    date: '2026-07-26',
    studentId: 'std-3',
    studentNis: '20261003',
    studentName: 'Rizky Febrian',
    className: 'XI IPS 1',
    majorName: 'IPS',
    itemCategory: 'Kerapian & Seragam',
    itemName: 'Seragam Tidak Sesuai Ketentuan Hari',
    points: 10,
    officerName: 'Siti Rahma, S.Pd',
    notes: 'Tidak memakai atribut lengkap hari Senin',
    createdAt: '2026-07-26T07:15:00.000Z'
  },
  {
    id: 'trx-7',
    type: 'pelanggaran',
    date: '2026-07-29',
    studentId: 'std-6',
    studentNis: '20261006',
    studentName: 'Bagus Setiawan',
    className: 'XI IPS 1',
    majorName: 'IPS',
    itemCategory: 'Sikap & Perilaku',
    itemName: 'Membawa / Menggunakan HP Saat KBM Tanpa Izin',
    points: 15,
    officerName: 'Siti Rahma, S.Pd',
    notes: 'Main game online di kelas saat pelajaran',
    createdAt: '2026-07-29T10:00:00.000Z'
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-29T10:00:00.000Z',
    userName: 'Siti Rahma, S.Pd',
    userRole: 'kesiswaan',
    action: 'TAMBAH_PELANGGARAN',
    details: 'Mencatat pelanggaran Membawa HP untuk siswa Bagus Setiawan (15 Poin)'
  }
];
