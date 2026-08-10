export type UserRole = 'admin' | 'kesiswaan';

export type DisciplineStatus = 
  | 'Baik' 
  | 'Perlu Pembinaan' 
  | 'Pembinaan Intensif' 
  | 'Pengawasan Khusus' 
  | 'Sangat Berat' 
  | 'Dikembalikan kepada Orang Tua';

export interface DisciplineRuleInfo {
  status: DisciplineStatus;
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
  address: string;
  parentPhone: string;
  status: 'Aktif' | 'Non-Aktif';
  disciplineStatus?: DisciplineStatus;
  statusUpdatedBy?: string;
  statusUpdatedRole?: UserRole | string;
  statusUpdatedAt?: string;
  createdAt: string;
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
  name: string;
  description: string;
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
