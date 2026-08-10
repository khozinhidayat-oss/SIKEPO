export type UserRole = 'admin' | 'kesiswaan';

export type DisciplineStatus = 
  | 'Baik' 
  | 'Perlu Pembinaan' 
  | 'Pembinaan Intensif' 
  | 'Pengawasan Khusus' 
  | 'Sangat Berat' 
  | 'Dikembalikan kepada Orang Tua';

export interface DisciplineRule {
  id: string;
  ruleName: string;
  minPoint: number;
  maxPoint: number;
  statusKedisiplinan: string;
  jenisPembinaan: string;
  tindakanSekolah: string;
  suratDiterbitkan: string;
  pemanggilanOrtu: boolean | string;
  homeVisit: boolean | string;
  konselingBk: boolean | string;
  rekomendasiTindakLanjut: string;
  priority: number;
  isActive: boolean;
  keterangan?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface DisciplineRuleInfo {
  ruleId?: string;
  ruleName?: string;
  minPoint?: number;
  maxPoint?: number;
  status: DisciplineStatus | string;
  jenisPembinaan?: string;
  tindakanSekolah?: string;
  suratDiterbitkan?: string;
  pemanggilanOrtu?: boolean;
  homeVisit?: boolean;
  konselingBk?: boolean;
  rekomendasiTindakLanjut?: string;
  warningLevel: string;
  followUp: string;
  badgeClass: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // Stored safely
  name: string;
  nipNik?: string;
  username?: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'Aktif' | 'Nonaktif' | 'Dihapus';
  createdAt: string;
  lastLogin?: string;
  lastLoginIp?: string;
  lastLoginBrowser?: string;
  lastLoginStatus?: string;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  gender: 'L' | 'P';
  className: string;
  majorName: string;
  major?: string;
  level?: string;
  status: 'Aktif' | 'Non-Aktif' | 'Nonaktif' | 'Alumni' | 'Lulus';
  address?: string;
  phone?: string;
  parentPhone?: string;
  disciplineStatus?: DisciplineStatus;
  statusUpdatedBy?: string;
  statusUpdatedRole?: UserRole | string;
  statusUpdatedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DisciplineStatusHistory {
  id: string;
  studentId: string;
  studentNis: string;
  studentName: string;
  oldStatus: DisciplineStatus | string;
  newStatus: DisciplineStatus;
  updatedBy: string;
  updatedRole: UserRole | string;
  updatedAt: string;
}

export interface ClassItem {
  id: string;
  code: string;
  name: string;
  level: string;
  major: string;
  homeroomTeacher: string;
  status: 'Aktif' | 'Nonaktif';
  description?: string;
}

export interface MajorItem {
  id: string;
  code?: string;
  name: string;
  description: string;
  kaprog?: string;
  isActive?: boolean;
}

export interface MasterViolation {
  id: string;
  code?: string;
  category: string;
  name: string;
  points: number;
  action?: string;
  status: 'Aktif' | 'Non-Aktif' | 'Nonaktif';
}

export interface Transaction {
  id: string;
  type: 'pelanggaran';
  date: string;
  time?: string;
  studentId: string;
  studentNis: string;
  studentName: string;
  className: string;
  majorName: string;
  level?: string;
  itemCategory: string;
  itemName: string;
  itemId?: string;
  points: number;
  officerName: string;
  officerEmail?: string;
  officerRole?: UserRole;
  officerUserId?: string;
  notes: string;
  createdAt: string;
}

export interface BackupHistoryItem {
  id: string;
  date: string;
  time: string;
  type: string;
  user: string;
  notes: string;
  size: string;
}

export interface SystemSettings {
  // Tab 1: Profil Sekolah
  schoolName: string;
  npsn: string;
  schoolAddress: string;
  regency: string;
  province: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolWebsite: string;
  headmasterName: string;
  headmasterNip: string;
  schoolLogoUrl: string;
  faviconUrl: string;

  // Tab 2: Tahun Ajaran
  academicYear: string;   // e.g. 2026/2027
  semester: 'Ganjil' | 'Genap';

  // Tab 3: Pengaturan Poin
  pointThreshold: number; // Limit point e.g. 100
  defaultPoints?: number;
  autoCalculatePoints: boolean;
  autoDisciplineStatus: boolean;

  // Tab 4: Pengguna & Keamanan
  sessionTimeoutMinutes: number;
  autoLogoutInactive: boolean;
  maxLoginAttempts: number;
  forcePasswordChangeFirstLogin: boolean;
  enableAuditLog: boolean;

  // Tab 5: Tampilan Aplikasi
  appName: string;
  loginLogoUrl: string;
  primaryColor: string;
  sidebarColor: string;
  navbarColor: string;
  theme: 'Light' | 'Dark' | 'System';
  showLogoOnDashboard: boolean;

  // Tab 6: Backup & Restore History
  backupHistory?: BackupHistoryItem[];

  // Tab 7: Tentang Aplikasi
  appVersion: string;
  dbVersion: string;
  gasVersion: string;
  developerName: string;
  buildDate: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userEmail?: string;
  userRole: UserRole;
  action: string;
  module?: string;
  details: string;
}

export interface StudentPointSummary extends Student {
  totalPelanggaran: number;
  netPoints: number;
  exceedsThreshold: boolean;
  disciplineStatus: DisciplineStatus;
  warningLevel: string;
  followUpAction: string;
}

export interface PromotionHistoryItem {
  id: string;
  batchId: string;
  nis: string;
  studentName: string;
  oldAcademicYear: string;
  newAcademicYear: string;
  oldLevel: string;
  newLevel: string;
  oldClassName: string;
  newClassName: string;
  processedBy: string;
  date: string;
  time: string;
  timestamp: string;
  status: 'Naik Kelas' | 'Lulus' | 'Rollback';
}

export interface PromotionPreviewItem {
  id: string;
  studentId: string;
  nis: string;
  name: string;
  majorName: string;
  oldAcademicYear: string;
  newAcademicYear: string;
  oldLevel: string;
  newLevel: string;
  oldClassName: string;
  newClassName: string;
  status: 'Siap Diproses' | 'Siap Lulus' | 'Kelas Tujuan Tidak Ditemukan' | 'Sudah Alumni' | 'Data Tidak Lengkap';
  statusNote?: string;
}

export interface MaintenanceSettings {
  status: 'Aktif' | 'Nonaktif';
  title: string;
  message: string;
  startTime: string;
  endTime?: string;
  showCountdown: boolean;
  allowAdminAccess: boolean;
  allowedIp?: string;
  internalNote?: string;
  lastUpdated?: string;
  updatedBy?: string;
}

export interface MaintenanceHistoryItem {
  id: string;
  date: string;
  time: string;
  activatedBy: string;
  status: 'Aktif' | 'Nonaktif';
  title: string;
  message: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  timestamp: string;
}

export interface PasswordResetRequest {
  id: string;
  tanggal: string;
  username: string;
  nama: string;
  email: string;
  nomorWhatsapp: string;
  alasan: string;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  diprosesOleh?: string;
  tanggalProses?: string;
  catatanAdmin?: string;
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetName: string;
  sheetCount: number;
  status: 'Terhubung' | 'Tidak Terhubung';
  connectedAt?: string;
}

export interface DriveFolderConfig {
  folderId: string;
  folderUrl: string;
  folderName: string;
  status: 'Terhubung' | 'Tidak Terhubung';
  connectedAt?: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  date: string;
  time: string;
  scope: string;
  size: string;
  createdByName: string;
  downloadUrl?: string;
  driveFileId?: string;
  status: 'Sukses' | 'Gagal';
  mode: 'manual' | 'otomatis';
}
