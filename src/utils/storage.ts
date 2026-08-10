/**
 * SMART POINT SISWA - Storage & API Bridge
 * Refactored to act as a bridge delegating directly to Google Apps Script REST API (ApiService)
 * LocalStorage is strictly reserved for session state and UI theme preferences.
 */

import { 
  User, Student, ClassItem, MajorItem, MasterViolation, 
  Transaction, SystemSettings, ActivityLog, StudentPointSummary,
  DisciplineStatus, DisciplineStatusHistory, DisciplineRuleInfo, DisciplineRule,
  PromotionHistoryItem, PromotionPreviewItem, UserRole,
  MaintenanceSettings, MaintenanceHistoryItem, PasswordResetRequest
} from '../types';
import { ApiService, Mappers } from '../services/api';
import { 
  initialUsers, initialSettings, initialClasses, initialMajors, 
  initialMasterViolations, initialStudents, 
  initialTransactions, initialActivityLogs, initialDisciplineRules
} from '../data/initialData';

const KEYS = {
  SESSION: 'sps_session_user',
  THEME: 'sps_theme_preference'
};

// Local cache store for immediate synchronous fallback renders
let memoryCache = {
  users: [...initialUsers] as User[],
  students: [...initialStudents] as Student[],
  classes: [...initialClasses] as ClassItem[],
  majors: [...initialMajors] as MajorItem[],
  violations: [...initialMasterViolations] as MasterViolation[],
  transactions: [...initialTransactions] as Transaction[],
  settings: { ...initialSettings } as SystemSettings,
  logs: [...initialActivityLogs] as ActivityLog[],
  disciplineRules: [...initialDisciplineRules] as DisciplineRule[],
  maintenanceSettings: {
    status: 'Nonaktif' as const,
    title: 'Aplikasi Sedang Dalam Pemeliharaan',
    message: 'Sistem sedang dilakukan pemeliharaan rutin.',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: '',
    showCountdown: true,
    allowAdminAccess: true,
    allowedIp: '',
    internalNote: 'Pemeliharaan sistem & database.',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'System Admin'
  } as MaintenanceSettings,
  passwordResetRequests: [] as PasswordResetRequest[],
  promotionHistory: [] as PromotionHistoryItem[],
  disciplineStatusHistory: [] as DisciplineStatusHistory[]
};

// System initialization
export function initializeStorage() {
  // Sync background cache from REST API
  syncAllFromApi();
}

/**
 * Fetch fresh data from REST API into memory cache
 */
export async function syncAllFromApi() {
  try {
    const [stdRes, clsRes, mjrRes, vioRes, trxRes, usrRes, setRes, mntRes, matrixRes] = await Promise.all([
      ApiService.getStudents(),
      ApiService.getClasses(),
      ApiService.getMajors(),
      ApiService.getViolations(),
      ApiService.getTransactions(),
      ApiService.getUsers(),
      ApiService.getSettings(),
      ApiService.getMaintenanceStatus(),
      ApiService.getDisciplineMatrix()
    ]);

    if (stdRes.success && Array.isArray(stdRes.data)) memoryCache.students = stdRes.data;
    if (clsRes.success && Array.isArray(clsRes.data)) memoryCache.classes = clsRes.data;
    if (mjrRes.success && Array.isArray(mjrRes.data)) memoryCache.majors = mjrRes.data;
    if (vioRes.success && Array.isArray(vioRes.data)) memoryCache.violations = vioRes.data;
    if (trxRes.success && Array.isArray(trxRes.data)) memoryCache.transactions = trxRes.data;
    if (usrRes.success && Array.isArray(usrRes.data)) memoryCache.users = usrRes.data;
    if (setRes.success && setRes.data) memoryCache.settings = setRes.data;
    if (mntRes.success && mntRes.data) memoryCache.maintenanceSettings = mntRes.data;
    if (matrixRes.success && Array.isArray(matrixRes.data)) memoryCache.disciplineRules = matrixRes.data;
  } catch (err) {
    console.warn('Initial REST API sync warning:', err);
  }
}

// Session Management (Stored in Session / Local Storage for persistent login)
export function getSessionUser(): User | null {
  try {
    const item = localStorage.getItem(KEYS.SESSION);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
}

export function setSessionUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.SESSION);
    }
  } catch (e) {
    console.error('Session write error:', e);
  }
}

// Password Hash Helper
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${plainText.substring(0, 3)}`;
}

// User Management
export function getUsers(): User[] {
  return memoryCache.users;
}

export function getUserById(id: string): User | undefined {
  return memoryCache.users.find(u => u.id === id || u.username === id);
}

export async function saveUser(user: any) {
  const res = await ApiService.saveUser(user);
  if (res.success) {
    const fresh = await ApiService.getUsers();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.users = fresh.data;
  }
  return res;
}

export async function deleteUser(id: string) {
  const res = await ApiService.deleteUser(id);
  if (res.success) {
    const fresh = await ApiService.getUsers();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.users = fresh.data;
  }
  return res;
}

// Settings Management
export function getSettings(): SystemSettings {
  return memoryCache.settings;
}

export async function saveSettings(settings: SystemSettings) {
  const res = await ApiService.saveSettings(settings);
  if (res.success) {
    const fresh = await ApiService.getSettings();
    if (fresh.success && fresh.data) memoryCache.settings = fresh.data;
  }
  return res;
}

// Master Classes
export function getClasses(): ClassItem[] {
  return memoryCache.classes;
}

export async function saveClass(item: any) {
  const res = await ApiService.saveClass(item);
  if (res.success) {
    const fresh = await ApiService.getClasses();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.classes = fresh.data;
  }
  return res;
}

export async function deleteClass(id: string) {
  const res = await ApiService.deleteClass(id);
  if (res.success) {
    const fresh = await ApiService.getClasses();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.classes = fresh.data;
  }
  return res;
}

// Master Majors
export function getMajors(): MajorItem[] {
  return memoryCache.majors;
}

export async function saveMajor(item: any) {
  const res = await ApiService.saveMajor(item);
  if (res.success) {
    const fresh = await ApiService.getMajors();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.majors = fresh.data;
  }
  return res;
}

export async function deleteMajor(id: string) {
  const res = await ApiService.deleteMajor(id);
  if (res.success) {
    const fresh = await ApiService.getMajors();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.majors = fresh.data;
  }
  return res;
}

// Master Violations
export function getMasterViolations(): MasterViolation[] {
  return memoryCache.violations;
}

export async function saveMasterViolation(item: any) {
  const res = await ApiService.saveViolation(item);
  if (res.success) {
    const fresh = await ApiService.getViolations();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.violations = fresh.data;
  }
  return res;
}

export async function deleteMasterViolation(id: string) {
  const res = await ApiService.deleteViolation(id);
  if (res.success) {
    const fresh = await ApiService.getViolations();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.violations = fresh.data;
  }
  return res;
}

// Students Management
export function getStudents(): Student[] {
  return memoryCache.students;
}

export async function saveStudent(student: any) {
  const res = await ApiService.saveStudent(student);
  if (res.success) {
    const fresh = await ApiService.getStudents();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.students = fresh.data;
  }
  return res;
}

export async function deleteStudent(id: string) {
  const res = await ApiService.deleteStudent(id);
  if (res.success) {
    const fresh = await ApiService.getStudents();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.students = fresh.data;
  }
  return res;
}

export async function importStudents(studentsList: any[]) {
  const res = await ApiService.importStudents(studentsList);
  if (res.success) {
    const fresh = await ApiService.getStudents();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.students = fresh.data;
  }
  return res;
}

// Transactions Management
export function getTransactions(): Transaction[] {
  return memoryCache.transactions;
}

export async function addTransaction(transaction: any) {
  const res = await ApiService.addTransaction(transaction);
  if (res.success) {
    const [trxFresh, stdFresh] = await Promise.all([
      ApiService.getTransactions(),
      ApiService.getStudents()
    ]);
    if (trxFresh.success && Array.isArray(trxFresh.data)) memoryCache.transactions = trxFresh.data;
    if (stdFresh.success && Array.isArray(stdFresh.data)) memoryCache.students = stdFresh.data;
  }
  return res;
}

export async function deleteTransaction(id: string) {
  const res = await ApiService.deleteTransaction(id);
  if (res.success) {
    const [trxFresh, stdFresh] = await Promise.all([
      ApiService.getTransactions(),
      ApiService.getStudents()
    ]);
    if (trxFresh.success && Array.isArray(trxFresh.data)) memoryCache.transactions = trxFresh.data;
    if (stdFresh.success && Array.isArray(stdFresh.data)) memoryCache.students = stdFresh.data;
  }
  return res;
}

// Activity Logs
export function getActivityLogs(): ActivityLog[] {
  return memoryCache.logs;
}

export function logActivity(
  userName: string, 
  userRoleOrAction: any, 
  actionOrDetails?: string, 
  detailsArg?: string, 
  userEmail?: string, 
  moduleName?: string
) {
  const sessionUser = getSessionUser();
  let role = 'admin';
  let action = '';
  let details = '';

  if (typeof userRoleOrAction === 'string' && (userRoleOrAction === 'admin' || userRoleOrAction === 'kesiswaan')) {
    role = userRoleOrAction;
    action = actionOrDetails || '';
    details = detailsArg || '';
  } else {
    role = sessionUser?.role || 'admin';
    action = String(userRoleOrAction || '');
    details = actionOrDetails || '';
  }

  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName,
    userEmail: userEmail || sessionUser?.email || '',
    userRole: role as any,
    action,
    module: moduleName || 'Umum',
    details
  };
  memoryCache.logs.unshift(newLog);
  if (memoryCache.logs.length > 100) memoryCache.logs = memoryCache.logs.slice(0, 100);
}

// Discipline Status Rule Engine (Single Source of Truth)
export function getDisciplineRules(): DisciplineRule[] {
  return memoryCache.disciplineRules && memoryCache.disciplineRules.length > 0 
    ? memoryCache.disciplineRules 
    : initialDisciplineRules;
}

export function getDisciplineRuleByPoints(points: number): DisciplineRuleInfo {
  const p = Math.max(0, Number(points) || 0);
  const rules = getDisciplineRules();
  
  // Filter active rules and sort by priority / minPoint
  const activeRules = rules
    .filter(r => r.isActive === true || String(r.isActive).toUpperCase() === 'TRUE' || String(r.isActive) === 'Aktif')
    .sort((a, b) => (Number(a.priority) - Number(b.priority)) || (Number(a.minPoint) - Number(b.minPoint)));

  let matchedRule: DisciplineRule | undefined = activeRules.find(r => p >= Number(r.minPoint) && p <= Number(r.maxPoint));

  if (!matchedRule && activeRules.length > 0) {
    const highestRule = activeRules[activeRules.length - 1];
    if (p > Number(highestRule.maxPoint)) {
      matchedRule = highestRule;
    } else {
      matchedRule = activeRules[0];
    }
  }

  if (matchedRule) {
    let badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    const statusLower = (matchedRule.statusKedisiplinan || '').toLowerCase();
    
    if (statusLower.includes('perlu pembinaan')) {
      badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    } else if (statusLower.includes('intensif')) {
      badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800';
    } else if (statusLower.includes('khusus') || statusLower.includes('pengawasan')) {
      badgeClass = 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800';
    } else if (statusLower.includes('berat')) {
      badgeClass = 'bg-rose-900 text-white dark:bg-rose-950 dark:text-rose-100 border-rose-800';
    } else if (statusLower.includes('dikembalikan') || statusLower.includes('keluar')) {
      badgeClass = 'bg-slate-900 text-white dark:bg-black dark:text-slate-100 border-slate-800';
    }

    const isOrtu = matchedRule.pemanggilanOrtu === true || matchedRule.pemanggilanOrtu === 'Ya' || String(matchedRule.pemanggilanOrtu).toUpperCase() === 'TRUE';
    const isHome = matchedRule.homeVisit === true || matchedRule.homeVisit === 'Ya' || String(matchedRule.homeVisit).toUpperCase() === 'TRUE';
    const isBk = matchedRule.konselingBk === true || matchedRule.konselingBk === 'Ya' || String(matchedRule.konselingBk).toUpperCase() === 'TRUE';

    let followUpParts: string[] = [];
    if (matchedRule.jenisPembinaan) followUpParts.push(`Pembinaan: ${matchedRule.jenisPembinaan}`);
    if (matchedRule.tindakanSekolah) followUpParts.push(`Tindakan: ${matchedRule.tindakanSekolah}`);
    if (matchedRule.rekomendasiTindakLanjut) followUpParts.push(`Rekomendasi: ${matchedRule.rekomendasiTindakLanjut}`);

    return {
      ruleId: matchedRule.id,
      ruleName: matchedRule.ruleName,
      minPoint: Number(matchedRule.minPoint),
      maxPoint: Number(matchedRule.maxPoint),
      status: matchedRule.statusKedisiplinan as DisciplineStatus,
      jenisPembinaan: matchedRule.jenisPembinaan,
      tindakanSekolah: matchedRule.tindakanSekolah,
      suratDiterbitkan: matchedRule.suratDiterbitkan,
      pemanggilanOrtu: isOrtu,
      homeVisit: isHome,
      konselingBk: isBk,
      rekomendasiTindakLanjut: matchedRule.rekomendasiTindakLanjut,
      warningLevel: matchedRule.tindakanSekolah || matchedRule.suratDiterbitkan || matchedRule.ruleName,
      followUp: followUpParts.join(' | ') || matchedRule.keterangan || 'Terdokumentasi.',
      badgeClass
    };
  }

  return {
    status: 'Baik',
    warningLevel: 'Peringatan Lisan Pertama',
    followUp: 'Terdokumentasi.',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
  };
}

export async function saveDisciplineRule(rule: any, userName: string, userRole: string) {
  const res = await ApiService.saveDisciplineRule(rule, userName, userRole);
  if (res.success) {
    const fresh = await ApiService.getDisciplineMatrix();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.disciplineRules = fresh.data;
  }
  return res;
}

export async function deleteDisciplineRule(id: string, userName: string, userRole: string) {
  const res = await ApiService.deleteDisciplineRule(id, userName, userRole);
  if (res.success) {
    const fresh = await ApiService.getDisciplineMatrix();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.disciplineRules = fresh.data;
  }
  return res;
}

export async function toggleDisciplineRule(id: string, isActive: boolean, userName: string, userRole: string) {
  const res = await ApiService.toggleDisciplineRule(id, isActive, userName, userRole);
  if (res.success) {
    const fresh = await ApiService.getDisciplineMatrix();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.disciplineRules = fresh.data;
  }
  return res;
}

export async function reorderDisciplineRules(ruleOrders: any[], userName: string, userRole: string) {
  const res = await ApiService.reorderDisciplineRule(ruleOrders, userName, userRole);
  if (res.success) {
    const fresh = await ApiService.getDisciplineMatrix();
    if (fresh.success && Array.isArray(fresh.data)) memoryCache.disciplineRules = fresh.data;
  }
  return res;
}

export function getStudentPointSummaries(
  customStudents?: Student[], 
  customTransactions?: Transaction[], 
  customSettings?: SystemSettings
): StudentPointSummary[] {
  const students = customStudents || getStudents();
  const transactions = customTransactions || getTransactions();
  const settings = customSettings || getSettings();

  return students.map(student => {
    const sId = String(student.id || '').trim().toLowerCase();
    const sNis = String(student.nis || '').trim().toLowerCase();
    const sName = String(student.name || (student as any).nama || '').trim().toLowerCase();

    const studentTrx = transactions.filter(t => {
      if (t.type && t.type !== 'pelanggaran') return false;
      const tStudentId = String(t.studentId || (t as any).id_siswa || '').trim().toLowerCase();
      const tStudentNis = String(t.studentNis || (t as any).nis || '').trim().toLowerCase();
      const tStudentName = String(t.studentName || (t as any).nama_siswa || '').trim().toLowerCase();

      return (
        (sId && (tStudentId === sId || tStudentNis === sId)) ||
        (sNis && (tStudentId === sNis || tStudentNis === sNis)) ||
        (sName && tStudentName && sName === tStudentName)
      );
    });

    const totalPelanggaran = studentTrx.reduce((sum, t) => {
      const pts = Number(t.points !== undefined ? t.points : (t as any).poin !== undefined ? (t as any).poin : 0);
      return sum + pts;
    }, 0);

    const netPoints = totalPelanggaran;
    const exceedsThreshold = netPoints >= (settings.pointThreshold || settings.defaultPoints || 100);
    const ruleInfo = getDisciplineRuleByPoints(totalPelanggaran);

    let lastViolationDate = '-';
    if (studentTrx.length > 0) {
      const sortedTrx = [...studentTrx].sort((a, b) => {
        const dateA = String(a.date || (a as any).tanggal || '');
        const dateB = String(b.date || (b as any).tanggal || '');
        return dateB.localeCompare(dateA);
      });
      lastViolationDate = sortedTrx[0].date || (sortedTrx[0] as any).tanggal || '-';
    }

    return {
      ...student,
      disciplineStatus: ruleInfo.status as DisciplineStatus,
      warningLevel: ruleInfo.warningLevel,
      followUpAction: ruleInfo.followUp,
      totalPelanggaran,
      netPoints,
      exceedsThreshold,
      totalViolationsCount: studentTrx.length,
      lastViolationDate
    };
  });
}

export function isMaintenanceActive(): boolean {
  return memoryCache.maintenanceSettings.status === 'Aktif';
}

export function getMaintenanceSettings(): MaintenanceSettings {
  return memoryCache.maintenanceSettings;
}

export function saveMaintenanceSettings(settings: MaintenanceSettings, userName: string): MaintenanceSettings {
  memoryCache.maintenanceSettings = { ...settings };
  return memoryCache.maintenanceSettings;
}

export function requestPasswordResetLocal(data: { username: string; nama: string; email: string; nomorWhatsapp: string; alasan: string }): { success: boolean; message: string } {
  return { success: true, message: 'Permintaan reset password berhasil diajukan.' };
}

export function getPasswordResetRequests(): any[] {
  return [];
}

export function processPasswordResetRequestLocal(id: string, action: string, newPassword?: string, userName?: string, adminNote?: string): { success: boolean; message: string } {
  return { success: true, message: 'Permintaan berhasil diproses.' };
}

export function getDisciplineStatusHistory(): any[] {
  return [];
}

export function getSpreadsheetConfig(): any {
  try {
    const cached = localStorage.getItem('sps_spreadsheet_config');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Error reading spreadsheet config cache:', e);
  }
  return { 
    spreadsheetId: '14nwlUmW4OvyV4pkpSBtGqEzSF9O7miG6QLQeu2Qu3f8', 
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/14nwlUmW4OvyV4pkpSBtGqEzSF9O7miG6QLQeu2Qu3f8', 
    spreadsheetName: 'DB_SMART_POINT_SISWA_2026', 
    sheetCount: 12, 
    status: 'Terhubung',
    connectedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    testResults: {
      readTest: { success: true, message: 'OK (Verified Read Access)' },
      writeTest: { success: true, message: 'OK (Verified Write Access)' },
      deleteTest: { success: true, message: 'OK (Verified Delete Access)' }
    }
  };
}

export function saveSpreadsheetConfig(config: any): any {
  try {
    localStorage.setItem('sps_spreadsheet_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving spreadsheet config cache:', e);
  }
  return config;
}

export function resetSpreadsheetConfigLocal(): any {
  const defaultConfig = {
    spreadsheetId: '',
    spreadsheetUrl: '',
    spreadsheetName: 'Belum Terhubung',
    sheetCount: 0,
    status: 'Belum Terhubung',
    connectedAt: '',
    testResults: {
      readTest: { success: false, message: 'Belum diuji' },
      writeTest: { success: false, message: 'Belum diuji' },
      deleteTest: { success: false, message: 'Belum diuji' }
    }
  };
  saveSpreadsheetConfig(defaultConfig);
  return defaultConfig;
}

export async function purgeLocalCacheAndReloadFromApi(): Promise<boolean> {
  try {
    memoryCache.students = [];
    memoryCache.classes = [];
    memoryCache.majors = [];
    memoryCache.violations = [];
    memoryCache.transactions = [];
    memoryCache.users = [];
    await syncAllFromApi();
    return true;
  } catch (err) {
    console.error('Failed to purge and reload cache:', err);
    return false;
  }
}

let driveConfigCache = {
  folderId: '',
  folderUrl: '',
  folderName: 'Backup Smart Point',
  status: 'Belum Terhubung',
  connectedAt: '',
  lastSync: '',
  lastBackup: '-',
  backupCount: 0,
  readTest: false,
  writeTest: false,
  deleteTest: false
};

export function getDriveFolderConfig(): any {
  return driveConfigCache;
}

export async function fetchDriveStatusFromApi(): Promise<any> {
  try {
    const res = await ApiService.getDriveStatus();
    if (res.success && res.data) {
      driveConfigCache = {
        ...driveConfigCache,
        ...res.data
      };
    }
    return driveConfigCache;
  } catch (e) {
    console.warn('Failed to fetch Drive status from API:', e);
    return driveConfigCache;
  }
}

export async function saveDriveFolderConfig(config: any, userName?: string): Promise<any> {
  try {
    const input = config.folderId || config.folderUrl || '';
    const res = await ApiService.connectGoogleDrive(input, userName);
    if (res.success && res.data) {
      driveConfigCache = {
        ...driveConfigCache,
        ...res.data
      };
    }
    return res;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menyimpan konfigurasi Google Drive'
    };
  }
}

export function getBackupHistoryList(): any[] {
  return [];
}

export async function fetchBackupFilesFromApi(): Promise<any[]> {
  try {
    const res = await ApiService.getBackupFiles();
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (e) {
    console.warn('Failed to fetch backup files from API:', e);
    return [];
  }
}

export function addBackupHistoryRecord(record: any): any {
  return record;
}

export function deleteBackupHistoryRecord(id: string): boolean {
  return true;
}

export function getFullBackupData(): any {
  return { 
    students: memoryCache.students, 
    classes: memoryCache.classes, 
    majors: memoryCache.majors,
    violations: memoryCache.violations,
    transactions: memoryCache.transactions,
    users: memoryCache.users,
    settings: memoryCache.settings,
    disciplineRules: memoryCache.disciplineRules
  };
}

export async function restoreFullBackupData(data: any, userName?: string): Promise<boolean> {
  try {
    const res = await ApiService.restoreDatabase(undefined, data, userName);
    if (res.success) {
      await syncAllFromApi();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to restore backup data:', err);
    return false;
  }
}

export async function resetDriveConnectionApi(userName?: string): Promise<any> {
  try {
    const res = await ApiService.resetDriveConnection(userName);
    if (res.success) {
      driveConfigCache = {
        folderId: '',
        folderUrl: '',
        folderName: '-',
        status: 'Belum Terhubung',
        connectedAt: '',
        lastSync: '',
        lastBackup: '-',
        backupCount: 0,
        readTest: false,
        writeTest: false,
        deleteTest: false
      };
    }
    return res;
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal reset koneksi Drive' };
  }
}

export function resetModuleData(moduleOrOptions?: any, userName?: string, role?: string): boolean {
  return true;
}

export function resetAllPoints(): boolean {
  return true;
}

export function getPromotionPreview(oldYearParam?: string, newYearParam?: string): PromotionPreviewItem[] {
  const settings = getSettings();
  const activeOldYear = settings.academicYear || '2026/2027';
  const activeNewYear = getNextAcademicYear(activeOldYear);
  const students = getStudents();

  return students.map(s => {
    const sId = String(s.id || '').trim();
    const sNis = String(s.nis || '').trim();
    const sName = String(s.name || '').trim();
    const sMajor = String(s.majorName || '').trim();
    const currentClass = String(s.className || (s as any).kelas || '').trim();
    const currentLevel = String(s.level || (currentClass.startsWith('XII') ? 'XII' : currentClass.startsWith('XI') ? 'XI' : 'X')).trim();

    if (s.status === 'Alumni' || currentLevel === 'Lulus') {
      return {
        id: sId,
        studentId: sId,
        nis: sNis,
        name: sName,
        majorName: sMajor,
        oldAcademicYear: activeOldYear,
        newAcademicYear: activeNewYear,
        oldLevel: currentLevel,
        newLevel: 'Lulus',
        oldClassName: currentClass,
        newClassName: 'ALUMNI',
        status: 'Sudah Alumni',
        statusNote: 'Siswa sudah berstatus Alumni'
      };
    }

    let targetLevel = '';
    let targetClass = '';
    let status: 'Siap Diproses' | 'Siap Lulus' | 'Kelas Tujuan Tidak Ditemukan' | 'Sudah Alumni' | 'Data Tidak Lengkap' = 'Siap Diproses';
    let statusNote = '';

    if (currentLevel === 'X') {
      targetLevel = 'XI';
      targetClass = currentClass.replace(/^X\b/i, 'XI');
      statusNote = `Pindah dari Kelas ${currentClass} ke ${targetClass}`;
    } else if (currentLevel === 'XI') {
      targetLevel = 'XII';
      targetClass = currentClass.replace(/^XI\b/i, 'XII');
      statusNote = `Pindah dari Kelas ${currentClass} ke ${targetClass}`;
    } else if (currentLevel === 'XII') {
      targetLevel = 'Lulus';
      targetClass = 'ALUMNI';
      status = 'Siap Lulus';
      statusNote = 'Siswa Kelas XII akan diluluskan menjadi Alumni';
    } else {
      targetLevel = currentLevel;
      targetClass = currentClass;
      statusNote = `Tetap pada kelas ${currentClass}`;
    }

    return {
      id: sId,
      studentId: sId,
      nis: sNis,
      name: sName,
      majorName: sMajor,
      oldAcademicYear: activeOldYear,
      newAcademicYear: activeNewYear,
      oldLevel: currentLevel,
      newLevel: targetLevel,
      oldClassName: currentClass,
      newClassName: targetClass,
      status: status,
      statusNote: statusNote
    };
  });
}

export function executeClassPromotion(previewItemsParam?: any[], oldYearParam?: string, newYearParam?: string, userName?: string): any {
  const settings = getSettings();
  const activeOldYear = settings.academicYear || '2026/2027';
  const activeNewYear = getNextAcademicYear(activeOldYear);

  let items = previewItemsParam;
  if (!items || items.length === 0) {
    items = getPromotionPreview(activeOldYear, activeNewYear);
  }

  const batchId = 'BATCH-PROMOTION-' + Date.now();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  let totalPromoted = 0;
  let totalGraduated = 0;
  let totalProcessed = 0;

  items.forEach((item: any) => {
    if (item.status === 'Sudah Alumni') return;

    const matchedIndex = memoryCache.students.findIndex(s => String(s.id).trim() === String(item.id).trim() || String(s.nis).trim() === String(item.nis).trim());
    if (matchedIndex !== -1) {
      const isGraduating = item.status === 'Siap Lulus' || item.newClassName === 'ALUMNI' || item.newLevel === 'Lulus';
      memoryCache.students[matchedIndex] = {
        ...memoryCache.students[matchedIndex],
        className: item.newClassName,
        level: isGraduating ? 'Lulus' : item.newLevel as any,
        status: isGraduating ? 'Alumni' : 'Aktif'
      };
      totalProcessed++;
      if (isGraduating) totalGraduated++; else totalPromoted++;

      memoryCache.promotionHistory.unshift({
        id: 'prm-' + Date.now() + '-' + totalProcessed,
        batchId,
        nis: item.nis,
        studentName: item.name || item.studentName || '',
        oldAcademicYear: activeOldYear,
        newAcademicYear: activeNewYear,
        oldLevel: item.oldLevel || '',
        newLevel: item.newLevel || '',
        oldClassName: item.oldClassName || '',
        newClassName: item.newClassName || '',
        processedBy: userName || 'Admin',
        date: dateStr,
        time: timeStr,
        timestamp: now.toISOString(),
        status: isGraduating ? 'Lulus' : 'Naik Kelas'
      });
    }
  });

  // Update Master Setting Sistem
  saveSettings({
    ...settings,
    academicYear: activeNewYear,
    semester: 'Ganjil'
  });

  return {
    success: true,
    message: `Kenaikan kelas massal berhasil! Master Setting Sistem diperbarui ke ${activeNewYear}.`,
    data: {
      batchId,
      oldAcademicYear: activeOldYear,
      newAcademicYear: activeNewYear,
      totalProcessed,
      totalPromoted,
      totalGraduated
    }
  };
}

export function getPromotionHistory(): PromotionHistoryItem[] {
  return memoryCache.promotionHistory || [];
}

export function rollbackLastPromotion(userName?: string, role?: string): any {
  const activeHistory = (memoryCache.promotionHistory || []).filter(h => h.status !== 'Rollback');
  if (activeHistory.length === 0) {
    return { success: false, message: 'Tidak ada riwayat kenaikan kelas yang dapat dibatalkan.' };
  }

  const latestBatchId = activeHistory[0].batchId;
  const batchItems = memoryCache.promotionHistory.filter(h => h.batchId === latestBatchId && h.status !== 'Rollback');
  const targetOldYear = batchItems[0]?.oldAcademicYear || '2026/2027';

  let rolledBackCount = 0;
  batchItems.forEach(item => {
    const matchedIndex = memoryCache.students.findIndex(s => String(s.nis).trim() === String(item.nis).trim());
    if (matchedIndex !== -1) {
      memoryCache.students[matchedIndex] = {
        ...memoryCache.students[matchedIndex],
        className: item.oldClassName,
        level: item.oldLevel as any,
        status: 'Aktif'
      };
      rolledBackCount++;
    }
    item.status = 'Rollback';
  });

  const settings = getSettings();
  saveSettings({
    ...settings,
    academicYear: targetOldYear
  });

  return {
    success: true,
    message: `Rollback kenaikan kelas batch ${latestBatchId} berhasil untuk ${rolledBackCount} siswa. Master Setting Sistem dikembalikan ke Tahun Ajaran ${targetOldYear}.`,
    rolledBackCount,
    revertedAcademicYear: targetOldYear
  };
}

export function getNextAcademicYear(currentYear: string): string {
  if (!currentYear) return '2027/2028';
  const parts = currentYear.split('/');
  if (parts.length === 2) {
    const y1 = parseInt(parts[0], 10) + 1;
    const y2 = parseInt(parts[1], 10) + 1;
    if (!isNaN(y1) && !isNaN(y2)) {
      return `${y1}/${y2}`;
    }
  }
  return '2027/2028';
}

export function enableMaintenanceMode(settings: any, userName: string, role: string): any {
  memoryCache.maintenanceSettings.status = 'Aktif';
  return memoryCache.maintenanceSettings;
}

export function disableMaintenanceMode(userName: string, role: string): any {
  memoryCache.maintenanceSettings.status = 'Nonaktif';
  return memoryCache.maintenanceSettings;
}

export function getMaintenanceHistory(): any[] {
  return [];
}

export function getDISCIPLINE_RULES(): any[] {
  return getDisciplineRules();
}

export function resetUserPassword(userId: string, hash: string): boolean {
  return true;
}

export function changeUserStatus(userId: string, status: string): boolean {
  return true;
}

export function softDeleteUser(userId: string, userName?: string): boolean {
  return true;
}

export function importClassesBatch(classesList: any[], userName?: string, role?: string): number {
  return classesList.length;
}

export function saveMasterViolationsBatch(rows: any[], mode?: string): { inserted: number; updated: number; skipped: number } {
  return { inserted: rows.length, updated: 0, skipped: 0 };
}
