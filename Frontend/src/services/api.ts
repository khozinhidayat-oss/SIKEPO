/**
 * SMART POINT SISWA - API Service
 * Handles communication between Vercel Frontend and Google Apps Script REST API Backend
 */

const GAS_API_URL = ((import.meta as any).env && (import.meta as any).env.VITE_GAS_API_URL) ? (import.meta as any).env.VITE_GAS_API_URL : '';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export async function callApi<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResponse<T>> {
  if (!GAS_API_URL || GAS_API_URL.includes('YOUR_GAS_DEPLOYMENT_ID')) {
    // Return unconfigured flag so UI uses high-performance local persistent store
    return {
      success: true,
      message: 'Running in Local / Standalone Mode (GAS API URL not configured yet)',
      data: null
    };
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // GAS Web App CORS recommendation
      },
      body: JSON.stringify({
        action,
        ...payload
      }),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const json = JSON.parse(text);
    return json;
  } catch (error: any) {
    console.warn(`API call [${action}] error:`, error);
    return {
      success: false,
      message: error.message || 'Gagal terhubung ke backend Google Apps Script',
      error: String(error)
    };
  }
}


// REST API Endpoints Service Helper Object
export const ApiService = {
  // Auth
  login: (email: string, passwordHash: string) => callApi('login', { email, password: passwordHash }),
  logout: () => callApi('logout'),
  getSession: () => callApi('getSession'),

  // Dashboard
  getDashboard: () => callApi('getDashboard'),

  // Students
  getStudents: () => callApi('getStudents'),
  saveStudent: (student: any) => callApi('saveStudent', { student }),
  deleteStudent: (id: string) => callApi('deleteStudent', { id }),
  importStudents: (students: any[]) => callApi('importStudents', { students }),

  // Master Violations & Transactions
  getViolations: () => callApi('getViolations'),
  saveViolation: (violation: any) => callApi('saveViolation', { violation }),
  deleteViolation: (id: string) => callApi('deleteViolation', { id }),
  getTransactions: () => callApi('getTransactions'),
  addTransaction: (transaction: any) => callApi('addTransaction', { transaction }),
  deleteTransaction: (id: string) => callApi('deleteTransaction', { id }),

  // Reports
  getReports: () => callApi('getReports'),
  updateDisciplineStatus: (studentId: string, newStatus: string, userName: string, userRole: string) =>
    callApi('updateDisciplineStatus', { studentId, newStatus, userName, userRole }),

  // Users
  getUsers: () => callApi('getUsers'),
  saveUser: (user: any) => callApi('saveUser', { user }),
  deleteUser: (id: string) => callApi('deleteUser', { id }),

  // Settings
  getSettings: () => callApi('getSettings'),
  saveSettings: (settings: any) => callApi('saveSettings', { settings }),

  // Backup & Restore
  getBackupData: () => callApi('getBackupData'),
  restoreBackupData: (backupData: any) => callApi('restoreBackupData', { backupData }),

  // Promotion
  getPromotionPreview: (oldYear: string, newYear: string) => callApi('getPromotionPreview', { oldYear, newYear }),
  executePromotion: (previewItems: any[], oldYear: string, newYear: string, processedBy: string) =>
    callApi('executePromotion', { previewItems, oldYear, newYear, processedBy }),
  rollbackPromotion: (userName: string, userRole: string) => callApi('rollbackPromotion', { userName, userRole }),

  // Maintenance
  getMaintenanceStatus: () => callApi('getMaintenanceStatus'),
  setMaintenanceMode: (enabled: boolean, settingsPartial: any, userName: string, role: string) =>
    callApi('setMaintenanceMode', { enabled, settingsPartial, userName, role })
};
