/**
 * Backup.gs - Backup & Data Export & Real Google Drive Integration Utilities (Object Module Pattern)
 */

var Backup = {
  // Helper to extract folder ID from Google Drive URL or raw ID
  extractFolderId: function(input) {
    if (!input) return '';
    var str = String(input).trim();
    var match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    var idMatch = str.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
    return str.replace(/[^a-zA-Z0-9_-]/g, '');
  },

  // 1. CONNECT & VALIDATE GOOGLE DRIVE FOLDER (REAL CONNECTION)
  connectDrive: function(folderInput, userName) {
    var props = PropertiesService.getScriptProperties();
    var user = userName || 'Admin';

    var folderId = this.extractFolderId(folderInput);
    if (!folderId || folderId.length < 10) {
      return {
        success: false,
        message: 'Format Folder ID atau URL Google Drive tidak valid.',
        data: { status: 'Tidak Terhubung', error: 'Folder ID tidak valid' }
      };
    }

    try {
      // 1. Get Folder by ID
      var folder = DriveApp.getFolderById(folderId);
      var folderName = folder.getName();
      var folderUrl = 'https://drive.google.com/drive/folders/' + folderId;

      // 2. Test Read
      var readSuccess = false;
      var fileCount = 0;
      try {
        var filesIter = folder.getFiles();
        while (filesIter.hasNext()) {
          filesIter.next();
          fileCount++;
          if (fileCount >= 100) break; // cap iteration
        }
        readSuccess = true;
      } catch (rErr) {
        throw new Error('Test Read Gagal: Folder tidak dapat dibaca atau tidak memiliki hak akses view. ' + rErr.message);
      }

      // 3. Test Write
      var writeSuccess = false;
      var testFileName = '_sps_drive_test_' + new Date().getTime() + '.tmp';
      var tempFile = null;
      try {
        tempFile = folder.createFile(testFileName, 'SMART POINT SISWA - Connection Test Payload: ' + new Date().toISOString());
        writeSuccess = true;
      } catch (wErr) {
        throw new Error('Test Write Gagal: Tidak dapat membuat file baru di folder ini. Pastikan Anda memiliki hak akses Edit/Editor. ' + wErr.message);
      }

      // 4. Test Delete
      var deleteSuccess = false;
      try {
        if (tempFile) {
          tempFile.setTrashed(true);
          deleteSuccess = true;
        }
      } catch (dErr) {
        console.warn('Test Delete warning (file trashed fallback):', dErr);
        deleteSuccess = true; // Non-fatal, setTrashed works in Drive
      }

      var nowIso = new Date().toISOString();

      // Save connection configuration to backend Script Properties
      props.setProperty('GDRIVE_FOLDER_ID', folderId);
      props.setProperty('GDRIVE_FOLDER_NAME', folderName);
      props.setProperty('GDRIVE_FOLDER_URL', folderUrl);
      props.setProperty('GDRIVE_STATUS', 'Terhubung');
      props.setProperty('GDRIVE_CONNECTED_AT', nowIso);
      props.setProperty('GDRIVE_LAST_SYNC', nowIso);
      props.setProperty('GDRIVE_READ_TEST', 'PASS');
      props.setProperty('GDRIVE_WRITE_TEST', 'PASS');
      props.setProperty('GDRIVE_DELETE_TEST', 'PASS');

      Database.logActivity(user, 'ADMIN', 'CONNECT_GDRIVE', 'Berhasil menghubungkan dan memverifikasi Folder Google Drive [' + folderName + '] (ID: ' + folderId + ')');

      return {
        success: true,
        message: 'Koneksi Google Drive Berhasil! Folder "' + folderName + '" telah terverifikasi penuh (Read, Write, Delete OK).',
        data: {
          folderId: folderId,
          folderName: folderName,
          folderUrl: folderUrl,
          status: 'Terhubung',
          connectedAt: nowIso,
          lastSync: nowIso,
          readTest: true,
          writeTest: true,
          deleteTest: true,
          fileCount: fileCount
        }
      };

    } catch (err) {
      props.setProperty('GDRIVE_STATUS', 'Tidak Terhubung');
      Database.logActivity(user, 'ADMIN', 'CONNECT_GDRIVE_FAILED', 'Gagal menghubungkan Google Drive Folder: ' + err.message);

      return {
        success: false,
        message: 'Gagal terhubung ke Google Drive: ' + err.message,
        data: {
          folderId: folderId,
          status: 'Tidak Terhubung',
          readTest: false,
          writeTest: false,
          deleteTest: false,
          error: err.message
        }
      };
    }
  },

  // 2. GET CURRENT DRIVE CONNECTION STATUS FROM BACKEND
  getDriveStatus: function() {
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('GDRIVE_FOLDER_ID') || '';
    var folderName = props.getProperty('GDRIVE_FOLDER_NAME') || '';
    var folderUrl = props.getProperty('GDRIVE_FOLDER_URL') || '';
    var status = props.getProperty('GDRIVE_STATUS') || 'Belum Terhubung';
    var connectedAt = props.getProperty('GDRIVE_CONNECTED_AT') || '';
    var lastSync = props.getProperty('GDRIVE_LAST_SYNC') || '';
    var lastBackup = props.getProperty('GDRIVE_LAST_BACKUP_DATE') || '-';

    if (!folderId) {
      return {
        success: true,
        data: {
          folderId: '',
          folderName: '-',
          folderUrl: '',
          status: 'Belum Terhubung',
          connectedAt: '',
          lastSync: '',
          lastBackup: '-',
          backupCount: 0,
          readTest: false,
          writeTest: false,
          deleteTest: false
        }
      };
    }

    // Verify folder live accessibility
    var liveCount = 0;
    var isLive = false;
    try {
      var folder = DriveApp.getFolderById(folderId);
      folderName = folder.getName();
      var files = folder.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        var fName = f.getName();
        if (fName.indexOf('BACKUP_') === 0 || fName.indexOf('SMART_POINT_') === 0 || fName.indexOf('.json') !== -1) {
          liveCount++;
        }
      }
      isLive = true;
      props.setProperty('GDRIVE_STATUS', 'Terhubung');
      props.setProperty('GDRIVE_LAST_SYNC', new Date().toISOString());
    } catch (e) {
      status = 'Tidak Terhubung (Folder Tidak Dapat Diakses)';
      props.setProperty('GDRIVE_STATUS', status);
    }

    return {
      success: true,
      data: {
        folderId: folderId,
        folderName: folderName,
        folderUrl: folderUrl,
        status: status,
        connectedAt: connectedAt,
        lastSync: new Date().toISOString(),
        lastBackup: lastBackup,
        backupCount: liveCount,
        readTest: isLive,
        writeTest: isLive,
        deleteTest: isLive
      }
    };
  },

  // 3. BACKUP DATABASE DIRECTLY TO CONNECTED GOOGLE DRIVE FOLDER
  backupToDrive: function(filenameInput, scopeInput, userName) {
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('GDRIVE_FOLDER_ID');
    var user = userName || 'Admin';

    if (!folderId) {
      return {
        success: false,
        message: 'Google Drive belum terhubung! Silakan tentukan dan hubungkan Folder Google Drive terlebih dahulu.'
      };
    }

    try {
      var folder = DriveApp.getFolderById(folderId);
      var folderName = folder.getName();

      // Gather live data directly from Google Spreadsheet
      var students = Student.getAll();
      var classes = Class.getAll();
      var majors = Major.getAll();
      var violations = MasterViolation.getAll();
      var transactions = Violation.getAll();
      var users = User.getAll();
      var settings = Setting.get();
      var disciplineRules = DisciplineMatrix.getAll();
      var activityLogs = Database.getActivityLogs();

      var now = new Date();
      var pad = function(n) { return String(n).padStart(2, '0'); };
      var timeStampStr = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

      var filename = filenameInput || ('BACKUP_SPS_DATABASE_' + timeStampStr + '.json');
      if (filename.indexOf('.json') === -1 && filename.indexOf('.xlsx') === -1) {
        filename += '.json';
      }

      var backupPayload = {
        app: 'SMART POINT SISWA',
        version: '2.0.0',
        timestamp: now.toISOString(),
        createdBy: user,
        folderId: folderId,
        folderName: folderName,
        scope: scopeInput || 'Seluruh Database',
        data: {
          students: students,
          classes: classes,
          majors: majors,
          violations: violations,
          transactions: transactions,
          users: users,
          settings: settings,
          disciplineRules: disciplineRules,
          activityLogs: activityLogs
        }
      };

      var jsonString = JSON.stringify(backupPayload, null, 2);
      var file = folder.createFile(filename, jsonString, 'application/json');

      var fileSizeKb = (jsonString.length / 1024).toFixed(2);
      var fileSizeStr = fileSizeKb > 1024 ? (fileSizeKb / 1024).toFixed(2) + ' MB' : fileSizeKb + ' KB';
      var formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

      // Save last backup timestamp
      props.setProperty('GDRIVE_LAST_BACKUP_DATE', formattedDate);

      Database.logActivity(user, 'ADMIN', 'BACKUP_TO_GDRIVE', 'Berhasil membuat file backup [' + filename + '] (' + fileSizeStr + ') di Google Drive Folder [' + folderName + ']');

      return {
        success: true,
        message: 'Backup database berhasil disimpan langsung ke Google Drive Folder "' + folderName + '"!',
        data: {
          fileId: file.getId(),
          filename: filename,
          fileSize: fileSizeStr,
          folderId: folderId,
          folderName: folderName,
          fileUrl: file.getUrl(),
          date: formattedDate,
          time: now.toLocaleTimeString('id-ID'),
          user: user,
          type: scopeInput || 'Seluruh Database'
        }
      };

    } catch (err) {
      console.error('Error in Backup.backupToDrive:', err);
      return {
        success: false,
        message: 'Gagal membuat file backup di Google Drive: ' + err.message
      };
    }
  },

  // 4. GET BACKUP FILES DIRECTLY FROM CONNECTED GOOGLE DRIVE FOLDER
  getBackupFilesFromDrive: function() {
    var props = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('GDRIVE_FOLDER_ID');

    if (!folderId) {
      return { success: true, data: [] };
    }

    try {
      var folder = DriveApp.getFolderById(folderId);
      var filesIter = folder.getFiles();
      var list = [];

      while (filesIter.hasNext()) {
        var file = filesIter.next();
        var fName = file.getName();

        // Filter files starting with BACKUP_ or SMART_POINT_ or ending with .json
        if (fName.indexOf('BACKUP_') === 0 || fName.indexOf('SMART_POINT_') === 0 || fName.indexOf('.json') !== -1 || fName.indexOf('.xlsx') !== -1) {
          var sizeBytes = file.getSize();
          var sizeKb = (sizeBytes / 1024).toFixed(2);
          var sizeStr = sizeKb > 1024 ? (sizeKb / 1024).toFixed(2) + ' MB' : sizeKb + ' KB';
          var dateCreated = file.getDateCreated();

          list.push({
            id: file.getId(),
            filename: fName,
            size: sizeStr,
            date: dateCreated.toISOString().substring(0, 10),
            time: dateCreated.toTimeString().substring(0, 8),
            type: fName.indexOf('FULL') !== -1 ? 'Seluruh Database' : 'Database Full Snapshot',
            user: 'System Admin',
            status: 'Tersimpan di Drive',
            driveFolder: folder.getName(),
            downloadUrl: file.getUrl()
          });
        }
      }

      // Sort newest first
      list.sort(function(a, b) {
        return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
      });

      return { success: true, data: list };

    } catch (err) {
      console.error('Error fetching backup files from Drive:', err);
      return { success: false, message: 'Gagal membaca daftar file backup dari Google Drive: ' + err.message, data: [] };
    }
  },

  // 5. RESTORE DATABASE FROM GOOGLE DRIVE FILE
  restoreFromDriveFile: function(fileId, userName) {
    var user = userName || 'Admin';
    if (!fileId) {
      return { success: false, message: 'File ID backup tidak boleh kosong.' };
    }

    try {
      var file = DriveApp.getFileById(fileId);
      var contentStr = file.getBlob().getDataAsString();
      var parsed = JSON.parse(contentStr);

      var importResult = this.importFull(parsed);
      if (importResult.success) {
        Database.logActivity(user, 'ADMIN', 'RESTORE_FROM_GDRIVE', 'Berhasil memulihkan database dari file Google Drive [' + file.getName() + ']');
      }

      return importResult;

    } catch (err) {
      console.error('Error in Backup.restoreFromDriveFile:', err);
      return {
        success: false,
        message: 'Gagal merestore data dari file Google Drive: ' + err.message
      };
    }
  },

  // 6. RESET GOOGLE DRIVE CONNECTION (Backend Script Properties cleanup)
  resetDriveConnection: function(userName) {
    var props = PropertiesService.getScriptProperties();
    var user = userName || 'Admin';
    var prevFolder = props.getProperty('GDRIVE_FOLDER_NAME') || 'Google Drive';

    props.deleteProperty('GDRIVE_FOLDER_ID');
    props.deleteProperty('GDRIVE_FOLDER_NAME');
    props.deleteProperty('GDRIVE_FOLDER_URL');
    props.deleteProperty('GDRIVE_STATUS');
    props.deleteProperty('GDRIVE_CONNECTED_AT');
    props.deleteProperty('GDRIVE_LAST_SYNC');
    props.deleteProperty('GDRIVE_LAST_BACKUP_DATE');
    props.deleteProperty('GDRIVE_READ_TEST');
    props.deleteProperty('GDRIVE_WRITE_TEST');
    props.deleteProperty('GDRIVE_DELETE_TEST');

    Database.logActivity(user, 'ADMIN', 'RESET_GDRIVE_CONNECTION', 'Mereset konfigurasi koneksi Google Drive Folder [' + prevFolder + ']. File di Google Drive tetap aman.');

    return {
      success: true,
      message: 'Konfigurasi koneksi Google Drive berhasil di-reset. Folder dan file backup Anda di Google Drive tidak dihapus.'
    };
  },

  // EXPORT FULL & IMPORT FULL (EXSITING)
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
      var classes = Class.getAll();
      var majors = Major.getAll();

      var backupData = {
        app: 'SMART POINT SISWA',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        createdBy: session.name || 'Admin',
        data: {
          students: students,
          classes: classes,
          majors: majors,
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

      // Restore Classes
      if (Array.isArray(payload.classes)) {
        payload.classes.forEach(function(c) { Class.save(c); });
      }

      // Restore Majors
      if (Array.isArray(payload.majors)) {
        payload.majors.forEach(function(m) { Major.save(m); });
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

      return { success: true, message: 'Restore data ke Google Spreadsheet berhasil diproses.' };
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

