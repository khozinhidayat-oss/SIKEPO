/**
 * SMART POINT SISWA - Google Apps Script REST API Handler
 * Handles HTTP GET and POST requests for decoupled Frontend (Vercel)
 */

function handleApiRequest(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var method = e && e.postData ? 'POST' : 'GET';

  var body = {};
  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch(err) {
      body = {};
    }
  }

  // Merge parameters
  var params = Object.assign({}, (e ? e.parameter : {}) || {}, body);
  if (!action && params.action) {
    action = params.action;
  }

  Logger.log('[API REQUEST] Method: ' + method + ' | Action: ' + action + ' | Timestamp: ' + new Date().toISOString());

  try {
    var responseData;
    switch (action) {
      // AUTH ENDPOINTS
      case 'login':
        responseData = Auth.login(params.email || params.username, params.password);
        break;

      case 'logout':
        responseData = Auth.logout();
        break;

      case 'getSession':
        responseData = { success: true, data: Auth.getCurrentUserSession() };
        break;

      case 'requestPasswordReset':
        responseData = Auth.requestPasswordReset(params.username, params.nama, params.email, params.nomorWhatsapp, params.alasan);
        break;

      case 'getPasswordResetRequests':
        responseData = { success: true, data: Auth.getPasswordResetRequests() };
        break;

      case 'processPasswordResetRequest':
        responseData = Auth.processPasswordResetRequest(params.requestId, params.status, params.newPassword, params.adminName, params.catatanAdmin);
        break;

      // DASHBOARD ENDPOINT
      case 'getDashboard':
        responseData = Dashboard.getMetrics();
        break;

      // STUDENTS ENDPOINTS
      case 'getStudents':
        responseData = { success: true, data: Student.getAll() };
        break;

      case 'saveStudent':
        responseData = Student.save(params.student || params);
        break;

      case 'deleteStudent':
        responseData = Student.remove(params.id);
        break;

      case 'importStudents':
        responseData = Student.importBatch(params.students);
        break;

      // VIOLATIONS & TRANSACTIONS ENDPOINTS
      case 'getViolations':
        responseData = { success: true, data: MasterViolation.getAll() };
        break;

      case 'saveViolation':
        responseData = MasterViolation.save(params.violation || params);
        break;

      case 'deleteViolation':
        responseData = MasterViolation.remove(params.id);
        break;

      case 'importViolations':
        responseData = MasterViolation.importBatch(params.violations || params.items || []);
        break;

      case 'getTransactions':
        responseData = { success: true, data: Violation.getAll() };
        break;

      case 'addTransaction':
        responseData = Violation.record(params.transaction || params);
        break;

      case 'deleteTransaction':
        responseData = Violation.remove(params.id);
        break;

      // REPORTS ENDPOINTS
      case 'getReports':
        responseData = { success: true, data: Report.getPointSummaries() };
        break;

      case 'updateDisciplineStatus':
        responseData = Report.updateDisciplineStatus(params.studentId, params.newStatus, params.userName, params.userRole);
        break;

      // USERS ENDPOINTS
      case 'getUsers':
        responseData = { success: true, data: User.getAll() };
        break;

      case 'saveUser':
        responseData = User.save(params.user || params);
        break;

      case 'deleteUser':
        responseData = User.remove(params.id);
        break;

      // SETTINGS ENDPOINTS
      case 'getSettings':
        responseData = { success: true, data: Setting.get() };
        break;

      case 'saveSettings':
        responseData = Setting.save(params.settings || params);
        break;

      // DISCIPLINE MATRIX ENDPOINTS
      case 'getDisciplineMatrix':
      case 'getDisciplineRules':
        responseData = { success: true, data: DisciplineMatrix.getAll() };
        break;

      case 'getDisciplineRuleByPoint':
      case 'getDisciplineRuleByPoints':
        responseData = { success: true, data: DisciplineMatrix.getRuleByPoint(params.point !== undefined ? params.point : params.points) };
        break;

      case 'saveDisciplineRule':
      case 'updateDisciplineRule':
        responseData = DisciplineMatrix.save(params.rule || params, params.userName, params.userRole);
        break;

      case 'deleteDisciplineRule':
        responseData = DisciplineMatrix.remove(params.id || params.ruleId, params.userName, params.userRole);
        break;

      case 'reorderDisciplineRule':
      case 'reorderDisciplineRules':
        responseData = DisciplineMatrix.reorder(params.ruleOrders || params.orders, params.userName, params.userRole);
        break;

      case 'toggleDisciplineRule':
        responseData = DisciplineMatrix.toggleActive(params.id || params.ruleId, params.isActive, params.userName, params.userRole);
        break;

      // BACKUP & RESTORE & SPREADSHEET CONNECTION ENDPOINTS
      case 'getBackupData':
        responseData = Backup.exportFull();
        break;

      case 'restoreBackupData':
        responseData = Backup.importFull(params.backupData || params.backup);
        break;

      case 'testAndConnectSpreadsheet':
      case 'verifySpreadsheetConnection':
        responseData = Database.verifyAndConnectSpreadsheet(params.spreadsheetId || params.spreadsheetUrl || params.url, params.userName || 'Admin');
        break;

      case 'getSpreadsheetStatus':
        responseData = Database.getSpreadsheetStatus();
        break;

      case 'resetSpreadsheetConnection':
        responseData = Database.resetSpreadsheetConnection(params.userName || 'Admin');
        break;

      // PROMOTION ENDPOINTS
      case 'getActiveAcademicYear':
        responseData = getActiveAcademicYear();
        break;

      case 'getPromotionPreview':
        responseData = Promotion.getPreview(params.oldYear, params.newYear);
        break;

      case 'executePromotion':
        responseData = Promotion.execute(params.previewItems, params.oldYear, params.newYear, params.processedBy);
        break;

      case 'rollbackPromotion':
        responseData = Promotion.rollback(params.userName, params.userRole);
        break;

      case 'getPromotionHistory':
        responseData = Promotion.getHistory();
        break;

      // MAINTENANCE ENDPOINTS
      case 'getMaintenanceStatus':
        responseData = { success: true, data: Maintenance.getSettings() };
        break;

      case 'setMaintenanceMode':
        responseData = Maintenance.setMode(params.enabled, params.settingsPartial, params.userName, params.role);
        break;

      // MASTER DATA KELAS & JURUSAN
      case 'getClasses':
        responseData = { success: true, data: Class.getAll() };
        break;

      case 'saveClass':
        responseData = Class.save(params.class || params.data || params);
        break;

      case 'deleteClass':
        responseData = Class.remove(params.id);
        break;

      case 'getMajors':
        responseData = { success: true, data: Major.getAll() };
        break;

      case 'saveMajor':
        responseData = Major.save(params.major || params.data || params);
        break;

      case 'deleteMajor':
        responseData = Major.remove(params.id);
        break;

      // DEFAULT
      default:
        responseData = {
          success: true,
          message: 'SMART POINT SISWA REST API active',
          version: '2.0.0',
          timestamp: new Date().toISOString()
        };
        break;
    }

    Logger.log('[API RESPONSE] Action: ' + action + ' | Success: ' + (responseData && responseData.success));
    return responseJSON(responseData);

  } catch (err) {
    Logger.log('[API ERROR] Action: ' + action + ' | Error: ' + err.toString());
    return responseJSON({
      success: false,
      message: err.message || 'Server error occurred',
      error: err.toString()
    });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
