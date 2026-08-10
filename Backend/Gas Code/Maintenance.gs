/**
 * Maintenance.gs - Maintenance Mode & System Status Utilities (Object Module Pattern)
 */

var Maintenance = {
  getSettings: function() {
    try {
      var prop = PropertiesService.getScriptProperties().getProperty('MAINTENANCE_MODE');
      var reasonProp = PropertiesService.getScriptProperties().getProperty('MAINTENANCE_REASON');
      var enabled = prop === 'true';

      return {
        isMaintenance: enabled,
        enabled: enabled,
        reason: reasonProp || 'Sistem sedang dalam pemeliharaan rutin. Silakan kembali beberapa saat lagi.',
        updatedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error in Maintenance.getSettings:', err);
      return { isMaintenance: false, enabled: false, reason: '' };
    }
  },

  setMode: function(enabled, settingsPartial, userName, role) {
    try {
      var session = Auth.getCurrentUserSession();
      var executorName = userName || (session ? session.name : 'Admin');
      var executorRole = role || (session ? session.role : 'admin');

      if (executorRole !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang dapat merubah status maintenance.' };
      }

      var statusStr = enabled ? 'true' : 'false';
      PropertiesService.getScriptProperties().setProperty('MAINTENANCE_MODE', statusStr);

      if (settingsPartial && settingsPartial.reason) {
        PropertiesService.getScriptProperties().setProperty('MAINTENANCE_REASON', settingsPartial.reason);
      }

      Database.logActivity(executorName, executorRole, 'MAINTENANCE_MODE', 'Status maintenance diubah menjadi: ' + (enabled ? 'Aktif' : 'Non-Aktif'));

      return {
        success: true,
        message: 'Status pemeliharaan sistem berhasil diperbarui.',
        isMaintenance: enabled,
        enabled: enabled
      };
    } catch (err) {
      console.error('Error in Maintenance.setMode:', err);
      return { success: false, message: 'Gagal memperbarui mode maintenance: ' + err.message };
    }
  },

  checkStatus: function() {
    return this.getSettings();
  }
};

// Global legacy aliases
function checkMaintenanceStatus() {
  return Maintenance.checkStatus();
}

function setMaintenanceStatus(statusBool) {
  return Maintenance.setMode(statusBool);
}
