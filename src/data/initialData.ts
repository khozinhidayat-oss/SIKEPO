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

export const initialMajors: MajorItem[] = [];

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

export const initialDisciplineRules = [
  {
    id: 'rule-1',
    ruleName: 'Kategori Aman & Terbina (Poin 0 - 19)',
    minPoint: 0,
    maxPoint: 19,
    statusKedisiplinan: 'Baik',
    jenisPembinaan: 'Pembinaan Rutin / Pencegahan',
    tindakanSekolah: 'Teguran Lisan 1',
    suratDiterbitkan: 'Tidak Ada',
    pemanggilanOrtu: 'Tidak',
    homeVisit: 'Tidak',
    konselingBk: 'Tidak',
    rekomendasiTindakLanjut: 'Pertahankan Perilaku Baik',
    priority: 1,
    isActive: true,
    keterangan: 'Siswa dalam kondisi terdisiplin dan belum ada penanganan khusus.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-2',
    ruleName: 'Peringatan Lisan & Bimbingan BK (Poin 20 - 29)',
    minPoint: 20,
    maxPoint: 29,
    statusKedisiplinan: 'Perlu Pembinaan',
    jenisPembinaan: 'Pembinaan Wali Kelas & Guru BK',
    tindakanSekolah: 'Teguran Lisan 2 & Bimbingan BK',
    suratDiterbitkan: 'Surat Peringatan Lisan',
    pemanggilanOrtu: 'Tidak',
    homeVisit: 'Tidak',
    konselingBk: 'Ya',
    rekomendasiTindakLanjut: 'Konseling Motivasi & Pendampingan Karakter',
    priority: 2,
    isActive: true,
    keterangan: 'Siswa mulai memerlukan perhatian dan bimbingan wali kelas & BK.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-3',
    ruleName: 'Surat Peringatan 1 / SP1 (Poin 30 - 39)',
    minPoint: 30,
    maxPoint: 39,
    statusKedisiplinan: 'Perlu Pembinaan',
    jenisPembinaan: 'Pembinaan Wali Kelas, BK & Kesiswaan',
    tindakanSekolah: 'Peringatan Tertulis 1 (SP1)',
    suratDiterbitkan: 'Surat Peringatan 1 (SP1)',
    pemanggilanOrtu: 'Ya',
    homeVisit: 'Tidak',
    konselingBk: 'Ya',
    rekomendasiTindakLanjut: 'Pemanggilan Orang Tua / Wali Siswa ke Sekolah',
    priority: 3,
    isActive: true,
    keterangan: 'Penerbitan Surat Peringatan 1 dan pemanggilan orang tua.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-4',
    ruleName: 'Surat Peringatan 2 / SP2 (Poin 40 - 49)',
    minPoint: 40,
    maxPoint: 49,
    statusKedisiplinan: 'Pembinaan Intensif',
    jenisPembinaan: 'Pembinaan Intensif Kesiswaan & Kaprog',
    tindakanSekolah: 'Peringatan Tertulis 2 (SP2)',
    suratDiterbitkan: 'Surat Peringatan 2 (SP2)',
    pemanggilanOrtu: 'Ya',
    homeVisit: 'Tidak',
    konselingBk: 'Ya',
    rekomendasiTindakLanjut: 'Pemanggilan Ortu & Perjanjian Tertulis 1',
    priority: 4,
    isActive: true,
    keterangan: 'Penanganan intensif oleh kesiswaan dan kaprog.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-5',
    ruleName: 'Surat Peringatan 3 / SP3 (Poin 50 - 59)',
    minPoint: 50,
    maxPoint: 59,
    statusKedisiplinan: 'Pembinaan Intensif',
    jenisPembinaan: 'Pembinaan Khusus Tim Kedisiplinan & BK',
    tindakanSekolah: 'Peringatan Tertulis 3 (SP3)',
    suratDiterbitkan: 'Surat Peringatan 3 (SP3)',
    pemanggilanOrtu: 'Ya',
    homeVisit: 'Ya',
    konselingBk: 'Ya',
    rekomendasiTindakLanjut: 'Home Visit & Peringatan Terakhir',
    priority: 5,
    isActive: true,
    keterangan: 'Home visit dan peringatan keras sebelum skorsing.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-6',
    ruleName: 'Skorsing Ringan & Pengawasan Khusus (Poin 60 - 79)',
    minPoint: 60,
    maxPoint: 79,
    statusKedisiplinan: 'Pengawasan Khusus',
    jenisPembinaan: 'Pengawasan Khusus Kepala Sekolah & Kesiswaan',
    tindakanSekolah: 'Skorsing Sementara (1-3 Hari)',
    suratDiterbitkan: 'Surat Skorsing / Peringatan Keras',
    pemanggilanOrtu: 'Ya',
    homeVisit: 'Ya',
    konselingBk: 'Ya',
    rekomendasiTindakLanjut: 'Skorsing Sementara & Evaluasi Perilaku Ketat',
    priority: 6,
    isActive: true,
    keterangan: 'Siswa menjalani skorsing sementara dan pengawasan ketat.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-7',
    ruleName: 'Skorsing Berat & Konferensi Kasus (Poin 80 - 99)',
    minPoint: 80,
    maxPoint: 99,
    statusKedisiplinan: 'Sangat Berat',
    jenisPembinaan: 'Konferensi Kasus & Evaluasi Pleno',
    tindakanSekolah: 'Skorsing Berat (1 Minggu) & Konferensi Kasus',
    suratDiterbitkan: 'Surat Skorsing Berat',
    pemanggilanOrtu: 'Ya',
    homeVisit: 'Ya',
    konselingBk: 'Ya',
    rekomendasiTindakLanjut: 'Konferensi Kasus Bersama Komite & Kepala Sekolah',
    priority: 7,
    isActive: true,
    keterangan: 'Konferensi kasus tingkat sekolah sebelum penindakan akhir.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  },
  {
    id: 'rule-8',
    ruleName: 'Dikembalikan kepada Orang Tua (Poin 100+)',
    minPoint: 100,
    maxPoint: 999,
    statusKedisiplinan: 'Dikembalikan kepada Orang Tua',
    jenisPembinaan: 'Pengembalian Hak Pendidikan',
    tindakanSekolah: 'Pengembalian Siswa Kepada Orang Tua / Wali',
    suratDiterbitkan: 'Surat Keputusan Pengembalian Siswa',
    pemanggilanOrtu: 'Ya',
    homeVisit: 'Tidak',
    konselingBk: 'Tidak',
    rekomendasiTindakLanjut: 'Pemberhentian / Dikembalikan Kepada Orang Tua',
    priority: 8,
    isActive: true,
    keterangan: 'Batas poin maksimal sekolah tercapai, siswa dikembalikan.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    createdBy: 'System',
    updatedBy: 'System'
  }
];
