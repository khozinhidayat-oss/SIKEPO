/**
 * Backup.gs - Backup & Data Export Utilities (Object Module Pattern)
 */

var Backup = {
  exportFull: function() {
    try {
      var session = Auth.getCurrentUserSession();
      if (!session || session.role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang dapat melakukan backup data.' };
      }

      var students = Student.getAll();
      var violations = MasterViolation.getAll();
      var transactions = Violation.getAll();
      var users = User.getAll();
      var settings = Setting.get();

      var backupData = {
        app: 'SMART POINT SISWA',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        createdBy: session.name || 'Admin',
        data: {
          students: students,
          violations: violations,
          transactions: transactions,
          users: users,
          settings: settings
        }
      };

      Database.logActivity(session.name, session.role, 'BACKUP_DATA', 'Backup full database berhasil dieksport');

      return {
        success: true,
        message: 'Backup data berhasil dibuat.',
        timestamp: backupData.timestamp,
        backupJson: JSON.stringify(backupData),
        data: backupData
      };
    } catch (err) {
      console.error('Error in Backup.exportFull:', err);
      return { success: false, message: 'Gagal membuat backup data: ' + err.message };
    }
  },

  importFull: function(backupData) {
    try {
      var session = Auth.getCurrentUserSession();
      if (!session || session.role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang dapat melakukan restore data.' };
      }

      if (!backupData) {
        return { success: false, message: 'Data restore kosong atau format tidak sesuai.' };
      }

      var parsed = backupData;
      if (typeof backupData === 'string') {
        parsed = JSON.parse(backupData);
      }

      var payload = parsed.data || parsed;

      // Restore Students
      if (Array.isArray(payload.students)) {
        payload.students.forEach(function(s) { Student.save(s); });
      }

      // Restore Violations
      if (Array.isArray(payload.violations)) {
        payload.violations.forEach(function(v) { MasterViolation.save(v); });
      }

      // Restore Transactions
      if (Array.isArray(payload.transactions)) {
        payload.transactions.forEach(function(t) { Violation.record(t); });
      }

      // Restore Users
      if (Array.isArray(payload.users)) {
        payload.users.forEach(function(u) { User.save(u); });
      }

      // Restore Settings
      if (payload.settings) {
        Setting.save(payload.settings);
      }

      Database.logActivity(session.name, session.role, 'RESTORE_DATA', 'Restore database berhasil diproses');

      return { success: true, message: 'Restore data berhasil diproses.' };
    } catch (err) {
      console.error('Error in Backup.importFull:', err);
      return { success: false, message: 'Gagal merestore data: ' + err.message };
    }
  }
};

// Global legacy alias
function backupAllData() {
  return Backup.exportFull();
}
