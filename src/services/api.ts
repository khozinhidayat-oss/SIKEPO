/**
 * SMART POINT SISWA - Unified REST API Client
 * Primary communication layer between Vercel Frontend and Google Apps Script Web App REST API Backend
 */

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycby0tuY3WuU1UBgQS618WKf8AsQRpcvHzbfjPqJbh5qAtXNnIOvFlA1TP_ry2WjSWoFZzQ/exec';

function getApiUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_GAS_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !envUrl.includes('YOUR_DEPLOYMENT_ID')) {
    return envUrl.trim();
  }
  return DEFAULT_GAS_URL;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Universal callApi wrapper with timeout (20s) & retry logic
 */
export async function callApi<T = any>(action: string, payload: Record<string, any> = {}, maxRetries = 1): Promise<ApiResponse<T>> {
  const url = getApiUrl();
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Recomended for Google Apps Script Web App CORS
        },
        body: JSON.stringify({
          action,
          ...payload
        }),
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let json: ApiResponse<T>;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Respon server bukan format JSON valid: ${text.substring(0, 100)}...`);
      }

      return {
        success: json.success !== false,
        message: json.message || (json.success ? 'Berhasil' : 'Gagal memproses permintaan'),
        data: json.data !== undefined ? json.data : (json as any)
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      const isAbort = error.name === 'AbortError';
      const errorMessage = isAbort 
        ? 'Koneksi ke Google Apps Script timeout (lebih dari 20 detik).'
        : (error.message || 'Gagal terhubung ke Google Apps Script REST API');

      console.warn(`[API Attempt ${attempt}/${maxRetries + 1}] Action [${action}] error:`, errorMessage);

      if (attempt > maxRetries) {
        return {
          success: false,
          message: errorMessage,
          error: String(error)
        };
      }
      // Wait 1s before retrying
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  return {
    success: false,
    message: 'Gagal terhubung ke Google Apps Script'
  };
}

// Data Mappers (Frontend <-> Backend)
export const Mappers = {
  // Student
  studentToBackend: (s: any) => ({
    id: s.id || undefined,
    nis: String(s.nis || '').trim(),
    nisn: String(s.nisn || '').trim(),
    nama: String(s.name || s.nama || '').trim(),
    jenis_kelamin: s.gender || s.jenis_kelamin || 'L',
    jurusan: String(s.majorName || s.major || s.jurusan || '').trim(),
    tingkat: String(s.level || s.tingkat || 'X').trim(),
    kelas: String(s.className || s.class || s.kelas || '').trim(),
    status: s.status || 'Aktif'
  }),

  studentFromBackend: (r: any) => {
    const pts = Number(r.points || r.poin || r.totalPelanggaran || 0);
    return {
      id: String(r.id || r.id_siswa || r.nis || ''),
      nis: String(r.nis || ''),
      nisn: String(r.nisn || ''),
      name: String(r.nama || r.name || ''),
      gender: (r.jenis_kelamin || r.jenisKelamin || r.gender || 'L') as 'L' | 'P',
      className: String(r.kelas || r.class || r.nama_kelas || ''),
      class: String(r.kelas || r.class || r.nama_kelas || ''),
      majorName: String(r.jurusan || r.major || r.nama_jurusan || ''),
      major: String(r.jurusan || r.major || r.nama_jurusan || ''),
      level: String(r.tingkat || r.level || 'X'),
      status: String(r.status || 'Aktif') as any,
      points: pts,
      totalPelanggaran: pts,
      disciplineStatus: r.disciplineStatus || (pts >= 100 ? 'Skorsing' : pts >= 50 ? 'Peringatan_2' : pts >= 25 ? 'Peringatan_1' : 'Aman'),
      createdAt: r.created_at || r.createdAt || '',
      updatedAt: r.updated_at || r.updatedAt || ''
    };
  },

  // User
  userToBackend: (u: any) => ({
    id: u.id || undefined,
    username: String(u.username || '').trim(),
    nama: String(u.name || u.nama || '').trim(),
    role: u.role || 'kesiswaan',
    email: String(u.email || '').trim(),
    password: u.passwordHash || u.password || '',
    status: u.status || 'Aktif'
  }),

  userFromBackend: (r: any) => ({
    id: String(r.id || r.username || ''),
    username: String(r.username || ''),
    name: String(r.nama || r.name || ''),
    role: (r.role || 'kesiswaan') as any,
    email: String(r.email || ''),
    passwordHash: String(r.password || r.passwordHash || ''),
    status: (r.status || 'Aktif') as any,
    createdAt: r.createdAt || r.created_at || '',
    updatedAt: r.updatedAt || r.updated_at || ''
  }),

  // Class
  classToBackend: (c: any) => ({
    id: c.id || undefined,
    kode: String(c.code || c.kode || c.name || '').trim(),
    nama: String(c.name || c.nama || '').trim(),
    tingkat: String(c.level || c.tingkat || 'X').trim(),
    jurusan: String(c.majorName || c.major || c.jurusan || '').trim(),
    wali_kelas: String(c.waliKelas || c.wali_kelas || '').trim(),
    status: c.isActive !== false ? 'Aktif' : 'Nonaktif'
  }),

  classFromBackend: (r: any) => ({
    id: String(r.id || r.kode || r.code || r.nama || ''),
    code: String(r.kode || r.code || r.nama || ''),
    name: String(r.nama || r.name || ''),
    level: String(r.tingkat || r.level || 'X'),
    majorId: String(r.jurusan_id || ''),
    majorName: String(r.jurusan || r.major || r.majorName || ''),
    waliKelas: String(r.wali_kelas || r.waliKelas || ''),
    isActive: r.status !== 'Nonaktif' && r.isActive !== false
  }),

  // Major
  majorToBackend: (m: any) => ({
    id: m.id || undefined,
    kode: String(m.code || m.kode || m.name || '').trim(),
    nama: String(m.name || m.nama || '').trim(),
    deskripsi: String(m.description || m.deskripsi || '').trim(),
    kaprog: String(m.kaprog || '').trim(),
    status: m.isActive !== false ? 'Aktif' : 'Nonaktif'
  }),

  majorFromBackend: (r: any) => ({
    id: String(r.id || r.kode || r.code || r.nama || ''),
    code: String(r.kode || r.code || r.nama || ''),
    name: String(r.nama || r.name || ''),
    description: String(r.deskripsi || r.description || ''),
    kaprog: String(r.kaprog || ''),
    isActive: r.status !== 'Nonaktif' && r.isActive !== false
  }),

  // Master Violation
  violationToBackend: (v: any) => ({
    id: v.id || undefined,
    kode: String(v.code || v.kode || '').trim(),
    code: String(v.code || v.kode || '').trim(),
    nama: String(v.name || v.nama || v.nama_pelanggaran || '').trim(),
    name: String(v.name || v.nama || v.nama_pelanggaran || '').trim(),
    nama_pelanggaran: String(v.name || v.nama || v.nama_pelanggaran || '').trim(),
    kategori: String(v.category || v.kategori || 'Kedisiplinan').trim(),
    category: String(v.category || v.kategori || 'Kedisiplinan').trim(),
    poin: Number(v.points !== undefined ? v.points : (v.poin !== undefined ? v.poin : (v.point || 0))),
    points: Number(v.points !== undefined ? v.points : (v.poin !== undefined ? v.poin : (v.point || 0))),
    tindakan: String(v.action || v.tindakan || 'Teguran Lisan').trim(),
    action: String(v.action || v.tindakan || 'Teguran Lisan').trim(),
    status: v.status || 'Aktif',
    deskripsi: String(v.description || v.deskripsi || '').trim()
  }),

  violationFromBackend: (r: any) => ({
    id: String(r.id || r.kode || r.code || ''),
    code: String(r.kode || r.code || r.id || ''),
    name: String(r.nama_pelanggaran || r.nama || r.name || ''),
    category: String(r.kategori || r.category || 'Kedisiplinan'),
    points: Number(r.poin !== undefined ? r.poin : (r.points !== undefined ? r.points : (r.point || 0))),
    point: Number(r.poin !== undefined ? r.poin : (r.points !== undefined ? r.points : (r.point || 0))),
    action: String(r.tindakan || r.action || 'Teguran Lisan'),
    status: (r.status === 'Nonaktif' || r.status === 'Non-Aktif') ? 'Non-Aktif' : 'Aktif',
    description: String(r.deskripsi || r.description || '')
  }),

  // Transaction (Record Violation)
  transactionToBackend: (t: any) => ({
    id: t.id || undefined,
    no_transaksi: t.id || t.no_transaksi || t.noTransaksi || undefined,
    type: 'pelanggaran',
    tanggal: String(t.date || t.tanggal || new Date().toISOString().split('T')[0]).trim(),
    waktu: String(t.time || t.waktu || '07:00').trim(),
    id_siswa: String(t.studentId || t.id_siswa || '').trim(),
    nis: String(t.studentNis || t.nis || t.studentId || '').trim(),
    studentNis: String(t.studentNis || t.nis || t.studentId || '').trim(),
    nama_siswa: String(t.studentName || t.nama_siswa || t.nama || '').trim(),
    studentName: String(t.studentName || t.nama_siswa || t.nama || '').trim(),
    kelas: String(t.className || t.studentClass || t.kelas || t.class || '').trim(),
    studentClass: String(t.className || t.studentClass || t.kelas || t.class || '').trim(),
    jurusan: String(t.majorName || t.jurusan || '').trim(),
    majorName: String(t.majorName || t.jurusan || '').trim(),
    tingkat: String(t.level || t.tingkat || 'X').trim(),
    level: String(t.level || t.tingkat || 'X').trim(),
    id_pelanggaran: String(t.itemId || t.violationId || t.id_pelanggaran || '').trim(),
    violationId: String(t.itemId || t.violationId || t.id_pelanggaran || '').trim(),
    kode_pelanggaran: String(t.violationCode || t.kode || t.code || '').trim(),
    nama_pelanggaran: String(t.itemName || t.violationName || t.nama_pelanggaran || '').trim(),
    itemName: String(t.itemName || t.violationName || t.nama_pelanggaran || '').trim(),
    kategori: String(t.itemCategory || t.category || t.kategori || 'Kedisiplinan').trim(),
    itemCategory: String(t.itemCategory || t.category || t.kategori || 'Kedisiplinan').trim(),
    poin: Number(t.points !== undefined ? t.points : (t.poin !== undefined ? t.poin : 0)),
    points: Number(t.points !== undefined ? t.points : (t.poin !== undefined ? t.poin : 0)),
    keterangan: String(t.notes || t.keterangan || t.catatan || '').trim(),
    notes: String(t.notes || t.keterangan || t.catatan || '').trim(),
    petugas: String(t.officerName || t.pelapor || 'Admin').trim(),
    officerName: String(t.officerName || t.pelapor || 'Admin').trim(),
    officerRole: String(t.officerRole || t.officer_role || 'admin').trim(),
    officerEmail: String(t.officerEmail || t.officer_email || '').trim(),
    tahun_ajaran: String(t.academicYear || t.tahun_ajaran || '2025/2026').trim(),
    semester: String(t.semester || 'Ganjil').trim()
  }),

  transactionFromBackend: (r: any) => {
    const pts = Number(r.poin !== undefined ? r.poin : (r.points !== undefined ? r.points : 0));
    const studentNis = String(r.studentNis || r.nis || r.id_siswa || r.studentId || '');
    const studentName = String(r.studentName || r.nama_siswa || r.nama || '');
    const className = String(r.className || r.studentClass || r.kelas || r.class || '');
    const majorName = String(r.majorName || r.jurusan || '');
    const level = String(r.level || r.tingkat || (className.startsWith('XII') ? 'XII' : className.startsWith('XI') ? 'XI' : className.startsWith('X') ? 'X' : 'X'));
    const itemName = String(r.itemName || r.violationName || r.nama_pelanggaran || '');
    const itemCategory = String(r.itemCategory || r.category || r.kategori || 'Kedisiplinan');
    const officerName = String(r.officerName || r.petugas || r.pelapor || 'Admin');
    const notes = String(r.notes || r.keterangan || r.catatan || '');

    return {
      id: String(r.id || r.no_transaksi || r.noTransaksi || ''),
      noTransaksi: String(r.no_transaksi || r.noTransaksi || r.id || ''),
      type: 'pelanggaran' as const,
      studentId: String(r.id_siswa || r.studentId || studentNis),
      studentNis: studentNis,
      studentName: studentName,
      studentClass: className,
      className: className,
      majorName: majorName,
      level: level,
      violationId: String(r.id_pelanggaran || r.violationId || r.itemId || ''),
      violationCode: String(r.kode_pelanggaran || r.violationCode || ''),
      violationName: itemName,
      itemName: itemName,
      category: itemCategory as any,
      itemCategory: itemCategory,
      points: pts,
      date: String(r.tanggal || r.date || new Date().toISOString().split('T')[0]),
      time: String(r.waktu || r.time || '07:00'),
      location: String(r.lokasi || r.location || 'Lingkungan Sekolah'),
      officerName: officerName,
      reportedBy: officerName,
      officerRole: String(r.officer_role || r.officerRole || 'admin'),
      officerEmail: String(r.officer_email || r.officerEmail || ''),
      notes: notes,
      academicYear: String(r.tahun_ajaran || r.academicYear || '2025/2026'),
      semester: String(r.semester || 'Ganjil'),
      createdAt: String(r.created_at || r.createdAt || '')
    };
  },

  // Settings
  settingToBackend: (s: any) => ({
    schoolName: String(s.schoolName || '').trim(),
    npsn: String(s.npsn || '').trim(),
    address: String(s.address || '').trim(),
    phone: String(s.phone || '').trim(),
    email: String(s.email || '').trim(),
    headmasterName: String(s.headmasterName || '').trim(),
    headmasterNip: String(s.headmasterNip || '').trim(),
    logoUrl: String(s.logoUrl || '').trim(),
    defaultPoints: Number(s.defaultPoints || 100),
    academicYear: String(s.academicYear || '2025/2026').trim(),
    semester: String(s.semester || 'Ganjil').trim()
  }),

  settingFromBackend: (r: any) => ({
    schoolName: String(r.schoolName || r.nama_sekolah || 'SMART POINT SISWA'),
    npsn: String(r.npsn || ''),
    address: String(r.address || r.alamat || ''),
    phone: String(r.phone || r.telepon || ''),
    email: String(r.email || ''),
    headmasterName: String(r.headmasterName || r.kepala_sekolah || ''),
    headmasterNip: String(r.headmasterNip || r.nip_kepala_sekolah || ''),
    logoUrl: String(r.logoUrl || r.logo || ''),
    defaultPoints: Number(r.defaultPoints || r.poin_awal || 100),
    academicYear: String(r.academicYear || r.tahun_ajaran || '2025/2026'),
    semester: (r.semester || 'Ganjil') as any
  })
};

// Strongly-typed API Service
export const ApiService = {
  // Auth
  login: async (email: string, passwordHash: string) => {
    return callApi('login', { email, password: passwordHash });
  },

  logout: async () => {
    return callApi('logout');
  },

  getSession: async () => {
    return callApi('getSession');
  },

  requestPasswordReset: async (data: { username: string; nama: string; email: string; nomorWhatsapp: string; alasan: string }) => {
    return callApi('requestPasswordReset', data);
  },

  getPasswordResetRequests: async () => {
    return callApi('getPasswordResetRequests');
  },

  processPasswordResetRequest: async (data: { requestId: string; status: 'Disetujui' | 'Ditolak'; newPassword?: string; adminName: string; catatanAdmin?: string }) => {
    return callApi('processPasswordResetRequest', data);
  },

  // Dashboard
  getDashboard: async () => {
    return callApi('getDashboard');
  },

  // System / Health
  ping: async () => {
    return callApi('ping');
  },

  // Students
  getStudents: async () => {
    const res = await callApi('getStudents');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(Mappers.studentFromBackend);
    }
    return res;
  },

  saveStudent: async (student: any) => {
    const payload = Mappers.studentToBackend(student);
    return callApi('saveStudent', { student: payload });
  },

  deleteStudent: async (id: string) => {
    return callApi('deleteStudent', { id });
  },

  importStudents: async (students: any[]) => {
    const mapped = students.map(Mappers.studentToBackend);
    return callApi('importStudents', { students: mapped });
  },

  // Classes
  getClasses: async () => {
    const res = await callApi('getClasses');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(Mappers.classFromBackend);
    }
    return res;
  },

  saveClass: async (classItem: any) => {
    const payload = Mappers.classToBackend(classItem);
    return callApi('saveClass', { class: payload });
  },

  deleteClass: async (id: string) => {
    return callApi('deleteClass', { id });
  },

  // Majors
  getMajors: async () => {
    const res = await callApi('getMajors');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(Mappers.majorFromBackend);
    }
    return res;
  },

  saveMajor: async (majorItem: any) => {
    const payload = Mappers.majorToBackend(majorItem);
    return callApi('saveMajor', { major: payload });
  },

  deleteMajor: async (id: string) => {
    return callApi('deleteMajor', { id });
  },

  // Master Violations
  getViolations: async () => {
    const res = await callApi('getViolations');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(Mappers.violationFromBackend);
    }
    return res;
  },

  saveViolation: async (violation: any) => {
    const payload = Mappers.violationToBackend(violation);
    return callApi('saveViolation', { violation: payload });
  },

  deleteViolation: async (id: string) => {
    return callApi('deleteViolation', { id });
  },

  importViolations: async (violations: any[]) => {
    const mapped = violations.map(Mappers.violationToBackend);
    return callApi('importViolations', { violations: mapped });
  },

  // Transactions (Catat Pelanggaran)
  getTransactions: async () => {
    const res = await callApi('getTransactions');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(Mappers.transactionFromBackend);
    }
    return res;
  },

  addTransaction: async (transaction: any) => {
    const payload = Mappers.transactionToBackend(transaction);
    return callApi('addTransaction', { transaction: payload });
  },

  deleteTransaction: async (id: string) => {
    return callApi('deleteTransaction', { id });
  },

  // Reports
  getReports: async () => {
    return callApi('getReports');
  },

  updateDisciplineStatus: async (studentId: string, newStatus: string, userName: string, userRole: string) => {
    return callApi('updateDisciplineStatus', { studentId, newStatus, userName, userRole });
  },

  // Users
  getUsers: async () => {
    const res = await callApi('getUsers');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(Mappers.userFromBackend);
    }
    return res;
  },

  saveUser: async (user: any) => {
    const payload = Mappers.userToBackend(user);
    return callApi('saveUser', { user: payload });
  },

  deleteUser: async (id: string) => {
    return callApi('deleteUser', { id });
  },

  // Settings
  getSettings: async () => {
    const res = await callApi('getSettings');
    if (res.success && res.data) {
      res.data = Mappers.settingFromBackend(res.data);
    }
    return res;
  },

  saveSettings: async (settings: any) => {
    const payload = Mappers.settingToBackend(settings);
    return callApi('saveSettings', { settings: payload });
  },

  // Discipline Matrix Master Rule Engine
  getDisciplineMatrix: async () => {
    return callApi('getDisciplineMatrix');
  },

  getDisciplineRuleByPoint: async (point: number) => {
    return callApi('getDisciplineRuleByPoint', { point });
  },

  saveDisciplineRule: async (rule: any, userName?: string, userRole?: string) => {
    return callApi('saveDisciplineRule', { rule, userName, userRole });
  },

  updateDisciplineRule: async (rule: any, userName?: string, userRole?: string) => {
    return callApi('updateDisciplineRule', { rule, userName, userRole });
  },

  deleteDisciplineRule: async (id: string, userName?: string, userRole?: string) => {
    return callApi('deleteDisciplineRule', { id, userName, userRole });
  },

  reorderDisciplineRule: async (ruleOrders: any[], userName?: string, userRole?: string) => {
    return callApi('reorderDisciplineRule', { ruleOrders, userName, userRole });
  },

  toggleDisciplineRule: async (id: string, isActive: boolean, userName?: string, userRole?: string) => {
    return callApi('toggleDisciplineRule', { id, isActive, userName, userRole });
  },

  // Backup & Restore & Google Drive & Connection
  connectGoogleDrive: async (folderIdOrUrl: string, userName?: string) => {
    return callApi('connectGoogleDrive', { folderId: folderIdOrUrl, userName });
  },

  validateGoogleDrive: async (folderIdOrUrl: string, userName?: string) => {
    return callApi('validateGoogleDrive', { folderId: folderIdOrUrl, userName });
  },

  getDriveStatus: async () => {
    return callApi('getDriveStatus');
  },

  getBackupFiles: async () => {
    return callApi('getBackupFiles');
  },

  backupDatabase: async (filename?: string, scope?: string, userName?: string) => {
    return callApi('backupDatabase', { filename, scope, userName });
  },

  restoreDatabase: async (fileId?: string, backupData?: any, userName?: string) => {
    return callApi('restoreDatabase', { fileId, backupData, userName });
  },

  resetDriveConnection: async (userName?: string) => {
    return callApi('resetDriveConnection', { userName });
  },

  getBackupData: async () => {
    return callApi('getBackupData');
  },

  restoreBackupData: async (backupData: any) => {
    return callApi('restoreBackupData', { backupData });
  },

  testAndConnectSpreadsheet: async (spreadsheetIdOrUrl: string, userName?: string) => {
    return callApi('testAndConnectSpreadsheet', { spreadsheetId: spreadsheetIdOrUrl, userName });
  },

  getSpreadsheetStatus: async () => {
    return callApi('getSpreadsheetStatus');
  },

  resetSpreadsheetConnection: async (userName?: string) => {
    return callApi('resetSpreadsheetConnection', { userName });
  },

  // Class Promotion
  getActiveAcademicYear: async () => {
    return callApi('getActiveAcademicYear');
  },

  getPromotionPreview: async (oldYear?: string, newYear?: string) => {
    return callApi('getPromotionPreview', { oldYear, newYear });
  },

  executePromotion: async (previewItems: any[], oldYear: string, newYear: string, processedBy: string) => {
    return callApi('executePromotion', { previewItems, oldYear, newYear, processedBy });
  },

  rollbackPromotion: async (userName: string, userRole: string) => {
    return callApi('rollbackPromotion', { userName, userRole });
  },

  getPromotionHistory: async () => {
    return callApi('getPromotionHistory');
  },

  // Maintenance
  getMaintenanceStatus: async () => {
    return callApi('getMaintenanceStatus');
  },

  setMaintenanceMode: async (enabled: boolean, settingsPartial: any, userName: string, role: string) => {
    return callApi('setMaintenanceMode', { enabled, settingsPartial, userName, role });
  }
};
