import { 
  User, Student, ClassItem, MajorItem, MasterViolation, 
  Transaction, SystemSettings, ActivityLog, StudentPointSummary,
  DisciplineStatus, DisciplineStatusHistory, DisciplineRuleInfo,
  PromotionHistoryItem, PromotionPreviewItem, UserRole,
  MaintenanceSettings, MaintenanceHistoryItem
} from '../types';
import { 
  initialUsers, initialSettings, initialClasses, initialMajors, 
  initialMasterViolations, initialStudents, 
  initialTransactions, initialActivityLogs 
} from '../data/initialData';

const KEYS = {
  USERS: 'sps_users',
  SETTINGS: 'sps_settings',
  CLASSES: 'sps_classes',
  MAJORS: 'sps_majors',
  VIOLATIONS: 'sps_violations',
  STUDENTS: 'sps_students',
  TRANSACTIONS: 'sps_transactions',
  LOGS: 'sps_activity_logs',
  SESSION: 'sps_session_user',
  STATUS_HISTORY: 'sps_discipline_status_history',
  SPREADSHEET_CONFIG: 'sps_spreadsheet_config',
  DRIVE_CONFIG: 'sps_drive_config',
  BACKUP_HISTORY: 'sps_backup_history',
  PROMOTION_HISTORY: 'sps_promotion_history',
  MAINTENANCE_SETTINGS: 'sps_maintenance_settings',
  MAINTENANCE_HISTORY: 'sps_maintenance_history'
};

// Helper function to read from localStorage with initial default fallback
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

// Helper function to write to localStorage
function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

const defaultMaintenanceSettings: MaintenanceSettings = {
  status: 'Nonaktif',
  title: 'Aplikasi Sedang Dalam Pemeliharaan',
  message: 'Maaf, aplikasi sedang dilakukan pemeliharaan dan pembaruan sistem. Silakan coba kembali beberapa saat lagi.',
  startTime: new Date().toISOString().slice(0, 16),
  endTime: '',
  showCountdown: true,
  allowAdminAccess: true,
  allowedIp: '',
  internalNote: 'Pemeliharaan sistem & pembaruan database rutin.',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'System Admin'
};

// System initialization
export function initializeStorage() {
  if (!localStorage.getItem(KEYS.USERS)) setItem(KEYS.USERS, initialUsers);
  if (!localStorage.getItem(KEYS.SETTINGS)) setItem(KEYS.SETTINGS, initialSettings);
  if (!localStorage.getItem(KEYS.CLASSES)) setItem(KEYS.CLASSES, initialClasses);
  if (!localStorage.getItem(KEYS.MAJORS)) setItem(KEYS.MAJORS, initialMajors);
  if (!localStorage.getItem(KEYS.VIOLATIONS)) setItem(KEYS.VIOLATIONS, initialMasterViolations);
  if (!localStorage.getItem(KEYS.STUDENTS)) setItem(KEYS.STUDENTS, initialStudents);
  if (!localStorage.getItem(KEYS.TRANSACTIONS)) setItem(KEYS.TRANSACTIONS, initialTransactions);
  if (!localStorage.getItem(KEYS.LOGS)) setItem(KEYS.LOGS, initialActivityLogs);
  if (!localStorage.getItem(KEYS.MAINTENANCE_SETTINGS)) setItem(KEYS.MAINTENANCE_SETTINGS, defaultMaintenanceSettings);
  if (!localStorage.getItem(KEYS.MAINTENANCE_HISTORY)) setItem(KEYS.MAINTENANCE_HISTORY, []);
}

// Users Management
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  // Simulated SHA-256 style hash representation for demo client-side
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${plainText.substring(0, 3)}`;
}

export function getUsers(): User[] {
  return getItem<User[]>(KEYS.USERS, initialUsers);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function saveUser(user: Omit<User, 'id' | 'createdAt'> & { id?: string }): User {
  const users = getUsers();
  let updatedUser: User;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (user.id) {
    const existing = users.find(u => u.id === user.id);
    updatedUser = { 
      ...existing!, 
      ...user, 
      updatedAt: nowStr 
    };
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) users[idx] = updatedUser;
  } else {
    updatedUser = {
      ...user,
      id: `usr-${Date.now()}`,
      createdAt: nowStr,
      updatedAt: nowStr
    };
    users.push(updatedUser);
  }
  setItem(KEYS.USERS, users);
  return updatedUser;
}

export function resetUserPassword(id: string, newPlainPassword: string): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx].passwordHash = newPlainPassword;
    users[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setItem(KEYS.USERS, users);
    return true;
  }
  return false;
}

export function changeUserStatus(id: string, status: 'Aktif' | 'Nonaktif' | 'active' | 'inactive' | 'Dihapus'): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx].status = status;
    users[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setItem(KEYS.USERS, users);
    return true;
  }
  return false;
}

export function softDeleteUser(id: string, adminName: string): boolean {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx].status = 'Dihapus';
    users[idx].updatedBy = adminName;
    users[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setItem(KEYS.USERS, users);
    return true;
  }
  return false;
}

export function deleteUser(id: string): void {
  const users = getUsers().filter(u => u.id !== id);
  setItem(KEYS.USERS, users);
}

// Session Management
export function getSessionUser(): User | null {
  return getItem<User | null>(KEYS.SESSION, null);
}

export function setSessionUser(user: User | null): void {
  setItem(KEYS.SESSION, user);
}

// Settings Management
export function getSettings(): SystemSettings {
  const saved = getItem<SystemSettings>(KEYS.SETTINGS, initialSettings);
  return { ...initialSettings, ...saved };
}

export function saveSettings(settings: SystemSettings): void {
  setItem(KEYS.SETTINGS, settings);
}

// Master Classes
export function getClasses(): ClassItem[] {
  return getItem<ClassItem[]>(KEYS.CLASSES, initialClasses);
}

export function saveClass(item: Omit<ClassItem, 'id'> & { id?: string }): ClassItem {
  const classes = getClasses();
  let newItem: ClassItem;
  if (item.id) {
    newItem = { ...item, id: item.id };
    const idx = classes.findIndex(c => c.id === item.id);
    if (idx !== -1) classes[idx] = newItem;
  } else {
    newItem = { ...item, id: `cls-${Date.now()}` };
    classes.push(newItem);
  }
  setItem(KEYS.CLASSES, classes);
  return newItem;
}

export function deleteClass(id: string): void {
  setItem(KEYS.CLASSES, getClasses().filter(c => c.id !== id));
}

export function importClassesBatch(newClasses: Array<Omit<ClassItem, 'id'>>, userName: string, userRole: any): number {
  const currentClasses = getClasses();
  let addedCount = 0;

  newClasses.forEach((item, index) => {
    const cleanCode = (item.code || '').trim().toUpperCase();
    const existsIdx = currentClasses.findIndex(c => (c.code || '').trim().toUpperCase() === cleanCode);
    if (existsIdx !== -1) {
      currentClasses[existsIdx] = {
        ...currentClasses[existsIdx],
        ...item,
        code: item.code || currentClasses[existsIdx].code
      };
      addedCount++;
    } else {
      currentClasses.push({
        ...item,
        id: `cls-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`
      });
      addedCount++;
    }
  });

  setItem(KEYS.CLASSES, currentClasses);
  logActivity(userName, userRole, 'IMPORT_DATA_KELAS', `Import Data Kelas (${addedCount} Data)`);
  return addedCount;
}

// Master Majors
export function getMajors(): MajorItem[] {
  return getItem<MajorItem[]>(KEYS.MAJORS, initialMajors);
}

export function saveMajor(item: Omit<MajorItem, 'id'> & { id?: string }): MajorItem {
  const majors = getMajors();
  let newItem: MajorItem;
  if (item.id) {
    newItem = { ...item, id: item.id };
    const idx = majors.findIndex(m => m.id === item.id);
    if (idx !== -1) majors[idx] = newItem;
  } else {
    newItem = { ...item, id: `mjr-${Date.now()}` };
    majors.push(newItem);
  }
  setItem(KEYS.MAJORS, majors);
  return newItem;
}

export function deleteMajor(id: string): void {
  setItem(KEYS.MAJORS, getMajors().filter(m => m.id !== id));
}

// Master Violations
export function getMasterViolations(): MasterViolation[] {
  return getItem<MasterViolation[]>(KEYS.VIOLATIONS, initialMasterViolations);
}

export function saveMasterViolation(item: Omit<MasterViolation, 'id'> & { id?: string }): MasterViolation {
  const list = getMasterViolations();
  let newItem: MasterViolation;
  if (item.id) {
    newItem = { ...item, id: item.id };
    const idx = list.findIndex(v => v.id === item.id);
    if (idx !== -1) list[idx] = newItem;
  } else {
    newItem = { ...item, id: `vio-${Date.now()}` };
    list.push(newItem);
  }
  setItem(KEYS.VIOLATIONS, list);
  return newItem;
}

export function saveMasterViolationsBatch(
  newOrUpdatedItems: MasterViolation[],
  onDuplicateOption: 'skip' | 'update' | 'cancel'
): { inserted: number; updated: number; skipped: number } {
  const currentList = getMasterViolations();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const currentMapByCode = new Map<string, MasterViolation>();
  currentList.forEach(item => {
    if (item.code) currentMapByCode.set(item.code.trim().toUpperCase(), item);
  });

  const newList = [...currentList];

  for (const item of newOrUpdatedItems) {
    const itemCodeUpper = item.code ? item.code.trim().toUpperCase() : '';
    const existing = itemCodeUpper ? currentMapByCode.get(itemCodeUpper) : null;

    if (existing) {
      if (onDuplicateOption === 'skip') {
        skipped++;
      } else if (onDuplicateOption === 'update') {
        const idx = newList.findIndex(v => v.id === existing.id);
        if (idx !== -1) {
          newList[idx] = {
            ...existing,
            category: item.category,
            name: item.name,
            points: item.points,
            action: item.action || existing.action,
            status: item.status
          };
          updated++;
        }
      }
    } else {
      const newItem: MasterViolation = {
        ...item,
        id: item.id || `vio-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      };
      newList.push(newItem);
      if (newItem.code) currentMapByCode.set(newItem.code.trim().toUpperCase(), newItem);
      inserted++;
    }
  }

  setItem(KEYS.VIOLATIONS, newList);
  return { inserted, updated, skipped };
}

export function deleteMasterViolation(id: string): void {
  setItem(KEYS.VIOLATIONS, getMasterViolations().filter(v => v.id !== id));
}

// Students
export function getStudents(): Student[] {
  return getItem<Student[]>(KEYS.STUDENTS, initialStudents);
}

export function saveStudent(student: Omit<Student, 'id' | 'createdAt'> & { id?: string }): Student {
  const students = getStudents();
  let newStudent: Student;
  if (student.id) {
    newStudent = { ...students.find(s => s.id === student.id)!, ...student };
    const idx = students.findIndex(s => s.id === student.id);
    if (idx !== -1) students[idx] = newStudent;
  } else {
    newStudent = {
      ...student,
      id: `std-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    students.push(newStudent);
  }
  setItem(KEYS.STUDENTS, students);
  return newStudent;
}

export function deleteStudent(id: string): void {
  setItem(KEYS.STUDENTS, getStudents().filter(s => s.id !== id));
  // Also clean transactions or keep them marked as historical
}

export function importStudents(newStudents: Array<Omit<Student, 'id' | 'createdAt'>>): number {
  const students = getStudents();
  let addedCount = 0;
  newStudents.forEach(st => {
    // Check if NIS already exists
    const exists = students.some(s => s.nis === st.nis);
    if (!exists) {
      students.push({
        ...st,
        id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString()
      });
      addedCount++;
    }
  });
  setItem(KEYS.STUDENTS, students);
  return addedCount;
}

// Transactions
export function getTransactions(): Transaction[] {
  return getItem<Transaction[]>(KEYS.TRANSACTIONS, initialTransactions);
}

export function saveTransaction(trx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }): Transaction {
  const transactions = getTransactions();
  let newTrx: Transaction;
  if (trx.id) {
    newTrx = { ...transactions.find(t => t.id === trx.id)!, ...trx };
    const idx = transactions.findIndex(t => t.id === trx.id);
    if (idx !== -1) transactions[idx] = newTrx;
  } else {
    newTrx = {
      ...trx,
      id: `trx-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    transactions.unshift(newTrx); // newest first
  }
  setItem(KEYS.TRANSACTIONS, transactions);
  return newTrx;
}

export function deleteTransaction(id: string): void {
  setItem(KEYS.TRANSACTIONS, getTransactions().filter(t => t.id !== id));
}

// Activity Logs
export function getActivityLogs(): ActivityLog[] {
  return getItem<ActivityLog[]>(KEYS.LOGS, initialActivityLogs);
}

export function logActivity(
  userName: string, 
  userRoleOrAction: any, 
  actionOrDetails?: string, 
  detailsArg?: string, 
  userEmail?: string, 
  moduleName?: string
) {
  const logs = getActivityLogs();
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
  logs.unshift(newLog); // newest first
  setItem(KEYS.LOGS, logs.slice(0, 100)); // keep last 100 logs
}

// Discipline Status History Management
export function getDisciplineStatusHistory(): DisciplineStatusHistory[] {
  return getItem<DisciplineStatusHistory[]>(KEYS.STATUS_HISTORY, []);
}

export function updateStudentDisciplineStatus(
  studentId: string, 
  newStatus: DisciplineStatus, 
  userName: string, 
  userRole: any
): { success: boolean; student?: Student; message?: string } {
  const students = getStudents();
  const index = students.findIndex(s => s.id === studentId || s.nis === studentId);
  if (index === -1) {
    return { success: false, message: 'Data siswa tidak ditemukan' };
  }

  const student = students[index];
  const oldStatus = student.disciplineStatus || 'Baik';

  if (oldStatus === newStatus) {
    return { success: true, student, message: 'Status kedisiplinan tidak berubah' };
  }

  const formattedDate = new Date().toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const updatedStudent: Student = {
    ...student,
    disciplineStatus: newStatus,
    statusUpdatedBy: userName,
    statusUpdatedRole: userRole,
    statusUpdatedAt: formattedDate
  };

  students[index] = updatedStudent;
  setItem(KEYS.STUDENTS, students);

  // Add History
  const histories = getDisciplineStatusHistory();
  const newHistory: DisciplineStatusHistory = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    studentId: student.id,
    studentNis: student.nis,
    studentName: student.name,
    oldStatus: oldStatus,
    newStatus: newStatus,
    updatedBy: userName,
    updatedRole: userRole,
    updatedAt: formattedDate
  };
  histories.unshift(newHistory);
  setItem(KEYS.STATUS_HISTORY, histories);

  // Log Activity
  logActivity(
    userName,
    userRole,
    'Mengubah Status Kedisiplinan',
    `${student.name} (NIS ${student.nis}) : ${oldStatus} → ${newStatus}`,
    undefined,
    'Laporan Poin'
  );

  return { success: true, student: updatedStudent };
}

export function getDISCIPLINE_RULES(): DisciplineRuleInfo[] {
  return [
    getDisciplineRuleByPoints(10),
    getDisciplineRuleByPoints(35),
    getDisciplineRuleByPoints(55),
    getDisciplineRuleByPoints(75),
    getDisciplineRuleByPoints(95),
    getDisciplineRuleByPoints(100)
  ];
}

export function getDisciplineRuleByPoints(points: number): DisciplineRuleInfo {
  const p = Math.max(0, Number(points) || 0);

  if (p <= 19) {
    return {
      status: 'Baik',
      warningLevel: 'Peringatan Lisan Pertama',
      followUp: 'Terdokumentasi.',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    };
  } else if (p <= 29) {
    return {
      status: 'Perlu Pembinaan',
      warningLevel: 'Peringatan Lisan Kedua',
      followUp: 'Terdokumentasi.',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    };
  } else if (p <= 39) {
    return {
      status: 'Perlu Pembinaan',
      warningLevel: 'Peringatan Tertulis Pertama',
      followUp: 'Orang tua dan wali kelas diberi tembusan. Orang tua dipanggil ke sekolah atau dilakukan kunjungan rumah.',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    };
  } else if (p <= 49) {
    return {
      status: 'Pembinaan Intensif',
      warningLevel: 'Peringatan Tertulis Kedua',
      followUp: 'Orang tua, wali kelas, dan Ketua Program Keahlian diberi tembusan. Orang tua dipanggil ke sekolah atau dilakukan kunjungan rumah.',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800'
    };
  } else if (p <= 59) {
    return {
      status: 'Pembinaan Intensif',
      warningLevel: 'Peringatan Tertulis Ketiga',
      followUp: 'Orang tua, wali kelas, Ketua Program Keahlian, dan Wakil Kepala Sekolah Bidang Kesiswaan diberi tembusan. Orang tua dipanggil ke sekolah atau dilakukan kunjungan rumah.',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800'
    };
  } else if (p <= 69) {
    return {
      status: 'Pengawasan Khusus',
      warningLevel: 'Peringatan Keras Tertulis Pertama',
      followUp: 'Orang tua, wali kelas, Ketua Program Keahlian, dan Wakil Kepala Sekolah Bidang Kesiswaan diberi tembusan. Orang tua dipanggil ke sekolah atau dilakukan kunjungan rumah.',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800'
    };
  } else if (p <= 79) {
    return {
      status: 'Pengawasan Khusus',
      warningLevel: 'Peringatan Keras Tertulis Kedua',
      followUp: 'Orang tua, wali kelas, Ketua Program Keahlian, Wakil Kepala Sekolah Bidang Kesiswaan, dan Kepala Sekolah diberi tembusan. Orang tua dipanggil ke sekolah atau dilakukan kunjungan rumah.',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800'
    };
  } else if (p <= 99) {
    return {
      status: 'Sangat Berat',
      warningLevel: 'Peringatan Keras Tertulis Ketiga',
      followUp: 'Orang tua, wali kelas, Ketua Program Keahlian, Wakil Kepala Sekolah Bidang Kesiswaan, dan Kepala Sekolah diberi tembusan. Orang tua dipanggil ke sekolah atau dilakukan kunjungan rumah.',
      badgeClass: 'bg-rose-900 text-white dark:bg-rose-950 dark:text-rose-100 border-rose-800'
    };
  } else {
    return {
      status: 'Dikembalikan kepada Orang Tua',
      warningLevel: 'Dikembalikan kepada Orang Tua',
      followUp: 'Orang tua/wali menerima dan menandatangani surat pengembalian siswa sesuai ketentuan sekolah.',
      badgeClass: 'bg-slate-900 text-white dark:bg-black dark:text-slate-100 border-slate-800'
    };
  }
}

// Calculated Student Summaries & Statistics
export function getStudentPointSummaries(): StudentPointSummary[] {
  const students = getStudents();
  const transactions = getTransactions();
  const settings = getSettings();

  return students.map(student => {
    const studentTrx = transactions.filter(t => t.studentId === student.id || t.studentNis === student.nis);
    
    const totalPelanggaran = studentTrx
      .filter(t => t.type === 'pelanggaran')
      .reduce((sum, t) => sum + t.points, 0);

    // Net Points = Total Pelanggaran
    const netPoints = totalPelanggaran;
    const exceedsThreshold = netPoints >= settings.pointThreshold;

    // Automated status determination from point rule
    const ruleInfo = getDisciplineRuleByPoints(totalPelanggaran);

    return {
      ...student,
      disciplineStatus: ruleInfo.status as DisciplineStatus,
      warningLevel: ruleInfo.warningLevel,
      followUpAction: ruleInfo.followUp,
      totalPelanggaran,
      netPoints,
      exceedsThreshold
    };
  });
}

// Reset all student points (admin function)
export function resetAllPoints(): void {
  // Clearing transactions resets points back to 0
  setItem(KEYS.TRANSACTIONS, []);
}

// System Backup & Restore
export function getFullBackupData() {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    users: getUsers(),
    settings: getSettings(),
    classes: getClasses(),
    majors: getMajors(),
    masterViolations: getMasterViolations(),
    students: getStudents(),
    transactions: getTransactions(),
    activityLogs: getActivityLogs()
  };
}

export function restoreFullBackupData(data: any): boolean {
  if (!data || !data.students || !data.transactions) return false;
  if (data.users) setItem(KEYS.USERS, data.users);
  if (data.settings) setItem(KEYS.SETTINGS, data.settings);
  if (data.classes) setItem(KEYS.CLASSES, data.classes);
  if (data.majors) setItem(KEYS.MAJORS, data.majors);
  if (data.masterViolations) setItem(KEYS.VIOLATIONS, data.masterViolations);
  if (data.students) setItem(KEYS.STUDENTS, data.students);
  if (data.transactions) setItem(KEYS.TRANSACTIONS, data.transactions);
  if (data.activityLogs) setItem(KEYS.LOGS, data.activityLogs);
  return true;
}

// Interfaces & Helpers for Backup, Spreadsheet & Drive Connection Module
export interface SpreadsheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  status: 'Terhubung' | 'Tidak Terhubung' | 'Perlu Konfigurasi';
  connectedAt: string;
  sheetCount: number;
}

export interface DriveFolderConfig {
  folderId: string;
  folderName: string;
  folderUrl: string;
  status: 'Terhubung' | 'Tidak Terhubung' | 'Perlu Konfigurasi';
  connectedAt: string;
}

export interface BackupRecord {
  id: string;
  date: string;
  time: string;
  filename: string;
  type: string;
  size: string;
  user: string;
  status: 'Berhasil' | 'Gagal' | 'Proses';
  downloadUrl?: string;
  driveFolder?: string;
}

const defaultSpreadsheetConfig: SpreadsheetConfig = {
  spreadsheetId: '1A2b3C4d5E6f7G8h9I0j_SMART_POINT_SISWA_DB',
  spreadsheetName: 'DB_SMART_POINT_SISWA_2026',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1A2b3C4d5E6f7G8h9I0j_SMART_POINT_SISWA_DB/edit',
  status: 'Terhubung',
  connectedAt: '2026-01-15 08:30:00',
  sheetCount: 8
};

const defaultDriveFolderConfig: DriveFolderConfig = {
  folderId: '1F9e8D7c6B5a4M3n2O1p_BACKUP_FOLDER',
  folderName: 'SMART_POINT_SISWA_BACKUPS',
  folderUrl: 'https://drive.google.com/drive/folders/1F9e8D7c6B5a4M3n2O1p_BACKUP_FOLDER',
  status: 'Terhubung',
  connectedAt: '2026-01-15 08:35:00'
};

const initialBackupRecords: BackupRecord[] = [
  {
    id: 'bak-101',
    date: '2026-07-28',
    time: '14:30:00',
    filename: 'SMART_POINT_BACKUP_20260728_143000.xlsx',
    type: 'Seluruh Database',
    size: '2.4 MB',
    user: 'Budi Santoso, S.Kom (Admin)',
    status: 'Berhasil'
  },
  {
    id: 'bak-102',
    date: '2026-07-20',
    time: '09:15:00',
    filename: 'SMART_POINT_BACKUP_20260720_091500.xlsx',
    type: 'Data Siswa & Transaksi',
    size: '1.8 MB',
    user: 'Budi Santoso, S.Kom (Admin)',
    status: 'Berhasil'
  },
  {
    id: 'bak-103',
    date: '2026-07-10',
    time: '16:45:00',
    filename: 'SMART_POINT_BACKUP_20260710_164500.xlsx',
    type: 'Seluruh Database',
    size: '2.1 MB',
    user: 'Budi Santoso, S.Kom (Admin)',
    status: 'Berhasil'
  }
];

export function getSpreadsheetConfig(): SpreadsheetConfig {
  return getItem<SpreadsheetConfig>(KEYS.SPREADSHEET_CONFIG, defaultSpreadsheetConfig);
}

export function saveSpreadsheetConfig(config: SpreadsheetConfig): void {
  setItem(KEYS.SPREADSHEET_CONFIG, config);
}

export function getDriveFolderConfig(): DriveFolderConfig {
  return getItem<DriveFolderConfig>(KEYS.DRIVE_CONFIG, defaultDriveFolderConfig);
}

export function saveDriveFolderConfig(config: DriveFolderConfig): void {
  setItem(KEYS.DRIVE_CONFIG, config);
}

export function getBackupHistoryList(): BackupRecord[] {
  return getItem<BackupRecord[]>(KEYS.BACKUP_HISTORY, initialBackupRecords);
}

export function addBackupHistoryRecord(record: Omit<BackupRecord, 'id'>): BackupRecord {
  const list = getBackupHistoryList();
  const newRecord: BackupRecord = {
    ...record,
    id: 'bak-' + Date.now()
  };
  const updated = [newRecord, ...list];
  setItem(KEYS.BACKUP_HISTORY, updated);
  return newRecord;
}

export function deleteBackupHistoryRecord(id: string): boolean {
  const list = getBackupHistoryList();
  const updated = list.filter(item => item.id !== id);
  setItem(KEYS.BACKUP_HISTORY, updated);
  return true;
}

export function resetModuleData(resetKeys: {
  transactions?: boolean;
  reports?: boolean;
  activityLogs?: boolean;
  usersExceptAdmin?: boolean;
  students?: boolean;
  violationsMaster?: boolean;
  allData?: boolean;
}, actorName: string, actorRole: string): void {
  if (resetKeys.allData) {
    setItem(KEYS.TRANSACTIONS, []);
    setItem(KEYS.STUDENTS, []);
    setItem(KEYS.VIOLATIONS, initialMasterViolations);
    setItem(KEYS.CLASSES, initialClasses);
    setItem(KEYS.MAJORS, initialMajors);
    
    // Retain Superadmin account
    const users = getUsers();
    const superAdmin = users.filter(u => u.role === 'admin' || u.username === 'admin');
    setItem(KEYS.USERS, superAdmin.length > 0 ? superAdmin : initialUsers);

    logActivity(
      actorName,
      'RESET_ALL_DATA',
      'Mereset seluruh data aplikasi (transaksi, siswa, user, master) dengan mempertahankan struktur & superadmin'
    );
    return;
  }

  if (resetKeys.transactions || resetKeys.reports) {
    setItem(KEYS.TRANSACTIONS, []);
  }

  if (resetKeys.students) {
    setItem(KEYS.STUDENTS, []);
  }

  if (resetKeys.violationsMaster) {
    setItem(KEYS.VIOLATIONS, initialMasterViolations);
  }

  if (resetKeys.usersExceptAdmin) {
    const users = getUsers();
    const adminOnly = users.filter(u => u.role === 'admin' || u.username === 'admin');
    setItem(KEYS.USERS, adminOnly.length > 0 ? adminOnly : initialUsers);
  }

  if (resetKeys.activityLogs) {
    setItem(KEYS.LOGS, []);
  }

  logActivity(
    actorName,
    'RESET_DATA_PARSIAL',
    `Mereset data tertentu: ${Object.keys(resetKeys).filter(k => (resetKeys as any)[k]).join(', ')}`
  );
}

/* ==========================================================================
   Kenaikan Kelas (Class Promotion) Helpers
   ========================================================================== */

export function getPromotionHistory(): PromotionHistoryItem[] {
  return getItem<PromotionHistoryItem[]>(KEYS.PROMOTION_HISTORY, []);
}

export function savePromotionHistory(items: PromotionHistoryItem[]): void {
  setItem(KEYS.PROMOTION_HISTORY, items);
}

export function parseLevelFromClass(className: string): string {
  if (!className) return 'X';
  const trimmed = className.trim().toUpperCase();
  if (trimmed.startsWith('XII') || trimmed.includes('XII')) return 'XII';
  if (trimmed.startsWith('XI') || trimmed.includes('XI')) return 'XI';
  if (trimmed.startsWith('X') || trimmed.includes('X')) return 'X';
  if (trimmed.startsWith('12')) return 'XII';
  if (trimmed.startsWith('11')) return 'XI';
  if (trimmed.startsWith('10')) return 'X';
  return 'X';
}

export function getNextLevel(currentLevel: string): { nextLevel: string; isGraduating: boolean } {
  if (currentLevel === 'X') return { nextLevel: 'XI', isGraduating: false };
  if (currentLevel === 'XI') return { nextLevel: 'XII', isGraduating: false };
  if (currentLevel === 'XII') return { nextLevel: 'Lulus', isGraduating: true };
  return { nextLevel: 'XI', isGraduating: false };
}

export function getNextAcademicYear(currentYear: string): string {
  if (!currentYear || !currentYear.includes('/')) return '2027/2028';
  const parts = currentYear.split('/');
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);
  if (!isNaN(start) && !isNaN(end)) {
    return `${start + 1}/${end + 1}`;
  }
  return '2027/2028';
}

export function getPromotionPreview(oldYear: string, newYear: string): PromotionPreviewItem[] {
  const students = getStudents();
  const classes = getClasses();

  return students.map((student) => {
    // Check if student is incomplete
    if (!student.className || !student.name || !student.nis) {
      return {
        id: `prev-${student.id}`,
        studentId: student.id,
        nis: student.nis || '-',
        name: student.name || 'Data Tidak Lengkap',
        majorName: student.majorName || '-',
        oldAcademicYear: oldYear,
        newAcademicYear: newYear,
        oldLevel: 'X',
        newLevel: 'XI',
        oldClassName: student.className || '-',
        newClassName: '-',
        status: 'Data Tidak Lengkap',
        statusNote: 'NAMA, NIS, atau KELAS siswa belum diisi secara lengkap.'
      };
    }

    // Check if already Alumni / Graduated
    if (student.status === 'Non-Aktif' || (student as any).academicStatus === 'Lulus') {
      return {
        id: `prev-${student.id}`,
        studentId: student.id,
        nis: student.nis,
        name: student.name,
        majorName: student.majorName,
        oldAcademicYear: oldYear,
        newAcademicYear: newYear,
        oldLevel: 'Lulus',
        newLevel: 'Lulus',
        oldClassName: student.className,
        newClassName: student.className,
        status: 'Sudah Alumni',
        statusNote: 'Siswa telah berstatus Alumni / Lulus pada periode sebelumnya.'
      };
    }

    const currentLevel = (student as any).level || parseLevelFromClass(student.className);

    // Level XII -> Graduation
    if (currentLevel === 'XII') {
      return {
        id: `prev-${student.id}`,
        studentId: student.id,
        nis: student.nis,
        name: student.name,
        majorName: student.majorName,
        oldAcademicYear: oldYear,
        newAcademicYear: newYear,
        oldLevel: 'XII',
        newLevel: 'Lulus',
        oldClassName: student.className,
        newClassName: `${student.className} (ALUMNI)`,
        status: 'Siap Lulus',
        statusNote: 'Siswa kelas XII siap diluluskan dan diubah statusnya menjadi Alumni.'
      };
    }

    // Level X or XI -> Promotion
    const { nextLevel } = getNextLevel(currentLevel);
    
    // Construct new class name by replacing level prefix
    let newClassName = student.className;
    if (currentLevel === 'X') {
      newClassName = student.className.replace(/^X\b/i, 'XI').replace(/^10\b/i, '11');
    } else if (currentLevel === 'XI') {
      newClassName = student.className.replace(/^XI\b/i, 'XII').replace(/^11\b/i, '12');
    }

    // Verify if target class exists in active master classes
    const classExists = classes.some(
      c => c.name.trim().toLowerCase() === newClassName.trim().toLowerCase() && c.status !== 'Nonaktif'
    );

    if (!classExists) {
      return {
        id: `prev-${student.id}`,
        studentId: student.id,
        nis: student.nis,
        name: student.name,
        majorName: student.majorName,
        oldAcademicYear: oldYear,
        newAcademicYear: newYear,
        oldLevel: currentLevel,
        newLevel: nextLevel,
        oldClassName: student.className,
        newClassName,
        status: 'Kelas Tujuan Tidak Ditemukan',
        statusNote: `Kelas "${newClassName}" belum terdaftar pada Master Data Kelas.`
      };
    }

    return {
      id: `prev-${student.id}`,
      studentId: student.id,
      nis: student.nis,
      name: student.name,
      majorName: student.majorName,
      oldAcademicYear: oldYear,
      newAcademicYear: newYear,
      oldLevel: currentLevel,
      newLevel: nextLevel,
      oldClassName: student.className,
      newClassName,
      status: 'Siap Diproses',
      statusNote: `Siap naik ke kelas ${newClassName}`
    };
  });
}

export function executeClassPromotion(
  previewItems: PromotionPreviewItem[],
  oldYear: string,
  newYear: string,
  processedBy: string
) {
  const students = getStudents();
  const history = getPromotionHistory();
  const batchId = `promo-${Date.now()}`;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  let totalProcessed = 0;
  let totalPromoted = 0;
  let totalGraduated = 0;
  const newHistoryRecords: PromotionHistoryItem[] = [];

  const updatedStudents = students.map((student) => {
    const item = previewItems.find(p => p.studentId === student.id);
    if (!item) return student;

    if (item.status === 'Siap Diproses') {
      totalProcessed++;
      totalPromoted++;
      
      const historyItem: PromotionHistoryItem = {
        id: `ph-${Date.now()}-${student.id}`,
        batchId,
        nis: student.nis,
        studentName: student.name,
        oldAcademicYear: oldYear,
        newAcademicYear: newYear,
        oldLevel: item.oldLevel,
        newLevel: item.newLevel,
        oldClassName: item.oldClassName,
        newClassName: item.newClassName,
        processedBy,
        date: dateStr,
        time: timeStr,
        timestamp: now.toISOString(),
        status: 'Naik Kelas'
      };
      newHistoryRecords.push(historyItem);

      return {
        ...student,
        className: item.newClassName,
        academicYear: newYear,
        level: item.newLevel,
        status: 'Aktif' as const
      };
    }

    if (item.status === 'Siap Lulus') {
      totalProcessed++;
      totalGraduated++;

      const historyItem: PromotionHistoryItem = {
        id: `ph-${Date.now()}-${student.id}`,
        batchId,
        nis: student.nis,
        studentName: student.name,
        oldAcademicYear: oldYear,
        newAcademicYear: newYear,
        oldLevel: 'XII',
        newLevel: 'Lulus',
        oldClassName: item.oldClassName,
        newClassName: item.oldClassName,
        processedBy,
        date: dateStr,
        time: timeStr,
        timestamp: now.toISOString(),
        status: 'Lulus'
      };
      newHistoryRecords.push(historyItem);

      return {
        ...student,
        academicYear: newYear,
        status: 'Non-Aktif' as const,
        academicStatus: 'Lulus',
        graduationDate: dateStr,
        level: 'Lulus'
      };
    }

    return student;
  });

  // Save updated students
  setItem(KEYS.STUDENTS, updatedStudents);

  // Save promotion history
  savePromotionHistory([...newHistoryRecords, ...history]);

  // Update Settings Academic Year
  const currentSettings = getSettings();
  saveSettings({ ...currentSettings, academicYear: newYear });

  // Log Activity
  logActivity(
    processedBy,
    'admin',
    'PROSES_KENAIKAN_KELAS',
    `Memproses Kenaikan Kelas Tahun Ajaran ${oldYear} -> ${newYear}. Total: ${totalProcessed} siswa (${totalPromoted} naik kelas, ${totalGraduated} lulus/alumni).`
  );

  return {
    success: true,
    batchId,
    totalProcessed,
    totalPromoted,
    totalGraduated
  };
}

export function rollbackLastPromotion(userName: string, userRole: UserRole) {
  const history = getPromotionHistory();
  // Find latest active batchId (not rolled back)
  const activeBatches = history.filter(h => h.status !== 'Rollback');
  if (activeBatches.length === 0) {
    return {
      success: false,
      message: 'Tidak ditemukan riwayat proses kenaikan kelas yang dapat dibatalkan.'
    };
  }

  const latestBatchId = activeBatches[0].batchId;
  const itemsToRollback = history.filter(h => h.batchId === latestBatchId && h.status !== 'Rollback');

  if (itemsToRollback.length === 0) {
    return {
      success: false,
      message: 'Proses kenaikan kelas terakhir sudah pernah dibatalkan.'
    };
  }

  const oldYear = itemsToRollback[0].oldAcademicYear;

  const students = getStudents();
  const restoredStudents = students.map((student) => {
    const item = itemsToRollback.find(h => h.nis === student.nis);
    if (!item) return student;

    return {
      ...student,
      className: item.oldClassName,
      academicYear: oldYear,
      level: item.oldLevel,
      status: 'Aktif' as const,
      academicStatus: 'Aktif',
      graduationDate: undefined
    };
  });

  // Save restored students
  setItem(KEYS.STUDENTS, restoredStudents);

  // Update history items status to 'Rollback'
  const updatedHistory = history.map((h) => {
    if (h.batchId === latestBatchId) {
      return { ...h, status: 'Rollback' as const };
    }
    return h;
  });
  savePromotionHistory(updatedHistory);

  // Revert academic year in settings
  const settings = getSettings();
  saveSettings({ ...settings, academicYear: oldYear });

  // Log activity
  logActivity(
    userName,
    userRole,
    'ROLLBACK_KENAIKAN_KELAS',
    `Membatalkan (Rollback) proses kenaikan kelas batch ${latestBatchId}. Mengembalikan ${itemsToRollback.length} siswa ke Tahun Ajaran ${oldYear}.`
  );

  return {
    success: true,
    message: `Berhasil mengembalikan ${itemsToRollback.length} data siswa ke Tahun Ajaran ${oldYear}.`,
    restoredCount: itemsToRollback.length,
    oldYear
  };
}

// ==================== MAINTENANCE MODE MODULE ====================

export function getMaintenanceSettings(): MaintenanceSettings {
  return getItem<MaintenanceSettings>(KEYS.MAINTENANCE_SETTINGS, defaultMaintenanceSettings);
}

export function saveMaintenanceSettings(
  settings: MaintenanceSettings,
  updatedBy: string = 'Admin'
): MaintenanceSettings {
  const updated: MaintenanceSettings = {
    ...settings,
    lastUpdated: new Date().toISOString(),
    updatedBy
  };
  setItem(KEYS.MAINTENANCE_SETTINGS, updated);
  return updated;
}

export function getMaintenanceHistory(): MaintenanceHistoryItem[] {
  return getItem<MaintenanceHistoryItem[]>(KEYS.MAINTENANCE_HISTORY, []);
}

export function saveMaintenanceHistory(history: MaintenanceHistoryItem[]): void {
  setItem(KEYS.MAINTENANCE_HISTORY, history);
}

export function isMaintenanceActive(): boolean {
  const m = getMaintenanceSettings();
  return m.status === 'Aktif';
}

export function enableMaintenanceMode(
  settingsPartial: Partial<MaintenanceSettings>,
  userName: string = 'Admin',
  role: UserRole = 'admin'
): MaintenanceSettings {
  const current = getMaintenanceSettings();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const updated: MaintenanceSettings = {
    ...current,
    ...settingsPartial,
    status: 'Aktif',
    lastUpdated: now.toISOString(),
    updatedBy: userName
  };

  setItem(KEYS.MAINTENANCE_SETTINGS, updated);

  const history = getMaintenanceHistory();
  const newHistoryRecord: MaintenanceHistoryItem = {
    id: 'maint-' + now.getTime(),
    date: dateStr,
    time: timeStr,
    activatedBy: `${userName} (${role})`,
    status: 'Aktif',
    title: updated.title,
    message: updated.message,
    startTime: updated.startTime,
    endTime: updated.endTime || '-',
    duration: updated.endTime ? 'Sesuai Jadwal' : 'Sampai Dinonaktifkan',
    timestamp: now.toISOString()
  };

  saveMaintenanceHistory([newHistoryRecord, ...history]);

  logActivity(
    userName,
    role,
    'MENGAKTIFKAN_MAINTENANCE_MODE',
    `Aktivasi Maintenance Mode. Judul: "${updated.title}". Jadwal: ${updated.startTime} - ${updated.endTime || 'Selesai Manual'}`
  );

  return updated;
}

export function disableMaintenanceMode(
  userName: string = 'Admin',
  role: UserRole = 'admin'
): MaintenanceSettings {
  const current = getMaintenanceSettings();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const updated: MaintenanceSettings = {
    ...current,
    status: 'Nonaktif',
    lastUpdated: now.toISOString(),
    updatedBy: userName
  };

  setItem(KEYS.MAINTENANCE_SETTINGS, updated);

  const history = getMaintenanceHistory();
  const newHistoryRecord: MaintenanceHistoryItem = {
    id: 'maint-' + now.getTime(),
    date: dateStr,
    time: timeStr,
    activatedBy: `${userName} (${role})`,
    status: 'Nonaktif',
    title: updated.title,
    message: 'Sistem Kembali Normal (Maintenance Deactivated)',
    startTime: updated.startTime,
    endTime: now.toISOString().slice(0, 16),
    duration: 'Selesai',
    timestamp: now.toISOString()
  };

  saveMaintenanceHistory([newHistoryRecord, ...history]);

  logActivity(
    userName,
    role,
    'MENONAKTIFKAN_MAINTENANCE_MODE',
    `Deaktivasi Maintenance Mode. Sistem kembali dapat diakses publik secara normal.`
  );

  return updated;
}

export function checkMaintenanceBeforeRequest(userRole?: UserRole): { allowed: boolean; reason?: string } {
  const m = getMaintenanceSettings();
  if (m.status !== 'Aktif') {
    return { allowed: true };
  }

  if (userRole === 'admin' && m.allowAdminAccess) {
    return { allowed: true, reason: 'Akses diizinkan untuk Administrator.' };
  }

  return { 
    allowed: false, 
    reason: m.message || 'Sistem sedang dalam pemeliharaan rutin. Akses pengguna dibatasi sementara.' 
  };
}


