/**
 * Setting.gs - System Settings & Threshold Configuration Services (Object Module Pattern)
 */

var Setting = {
  get: function() {
    try {
      var rows = Database.getTableData('settings') || [];
      var defaultSettings = {
        schoolName: 'SMK Negeri 1 Demak',
        schoolAddress: 'Jl. Raya Demak - Kudus No. 1, Demak',
        pointThreshold: 75,
        academicYear: '2025/2026',
        semester: 'Ganjil',
        maintenanceMode: false
      };

      if (rows.length > 0) {
        var result = {};
        for (var i = 0; i < rows.length; i++) {
          var key = rows[i].key || rows[i].Key || rows[i][0];
          var val = rows[i].value || rows[i].Value || rows[i][1];
          if (key) result[key] = val;
        }

        return {
          schoolName: result['Nama Sekolah'] || result['schoolName'] || defaultSettings.schoolName,
          schoolAddress: result['Alamat Sekolah'] || result['schoolAddress'] || defaultSettings.schoolAddress,
          pointThreshold: Number(result['Threshold Point Warning'] || result['pointThreshold'] || defaultSettings.pointThreshold),
          academicYear: result['Tahun Ajaran Aktif'] || result['academicYear'] || defaultSettings.academicYear,
          semester: result['Semester Aktif'] || result['semester'] || defaultSettings.semester,
          logoUrl: result['Logo Sekolah'] || result['logoUrl'] || ''
        };
      }

      return defaultSettings;
    } catch (err) {
      console.error('Error in Setting.get:', err);
      return {
        schoolName: 'SMK Negeri 1 Demak',
        schoolAddress: 'Demak',
        pointThreshold: 75,
        academicYear: '2025/2026',
        semester: 'Ganjil'
      };
    }
  },

  save: function(newSettings) {
    try {
      var session = Auth.getCurrentUserSession();
      if (!session || session.role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang dapat memperbarui pengaturan sistem.' };
      }

      if (!newSettings) {
        return { success: false, message: 'Pengaturan baru tidak valid.' };
      }

      var nowIso = new Date().toISOString();

      if (newSettings.schoolName) {
        Database.insertRow('settings', { key: 'Nama Sekolah', value: newSettings.schoolName, updated_at: nowIso });
      }
      if (newSettings.academicYear) {
        Database.insertRow('settings', { key: 'Tahun Ajaran Aktif', value: newSettings.academicYear, updated_at: nowIso });
      }
      if (newSettings.semester) {
        Database.insertRow('settings', { key: 'Semester Aktif', value: newSettings.semester, updated_at: nowIso });
      }
      if (newSettings.pointThreshold !== undefined) {
        Database.insertRow('settings', { key: 'Threshold Point Warning', value: String(newSettings.pointThreshold), updated_at: nowIso });
      }

      Database.logActivity(session.name, session.role, 'UPDATE_SETTINGS', 'Pengaturan sistem diperbarui');
      return { success: true, message: 'Pengaturan sistem berhasil disimpan.', data: newSettings };
    } catch (err) {
      console.error('Error in Setting.save:', err);
      return { success: false, message: 'Gagal menyimpan pengaturan: ' + err.message };
    }
  }
};

// Global legacy RPC aliases
function getSystemSettings() {
  return Setting.get();
}

function updateSystemSettings(newSettings) {
  return Setting.save(newSettings);
}
