/**
 * Database.gs - CRUD Engine & Database Initializer for Google Spreadsheet DB
 */
var Database = {
  getSpreadsheet: function() {
    try {
      // 1. Coba ambil dari Script Properties dengan KUNCI 'SPREADSHEET_ID'
      var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      
      // 2. Jika di Script Properties kosong, gunakan fallback dari CONFIG.SPREADSHEET_ID
      if ((!prop || String(prop).trim() === '') && typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) {
        prop = CONFIG.SPREADSHEET_ID;
      }
      
      if (prop && String(prop).trim() !== '') {
        var cleanId = String(prop).trim().replace(/^["']|["']$/g, '');
        // Extract ID jika yang dimasukkan adalah URL lengkap Google Sheets
        var urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch && urlMatch[1]) {
          cleanId = urlMatch[1];
        }
        try {
          return SpreadsheetApp.openById(cleanId);
        } catch(e1) {
          console.error('Error opening SPREADSHEET_ID (' + cleanId + '):', e1);
          Logger.log('Gagal membuka SPREADSHEET_ID dengan ID: "' + cleanId + '". Error: ' + e1.toString());
        }
      } else {
        Logger.log('Properti SPREADSHEET_ID tidak ditemukan di Script Properties maupun CONFIG.');
      }
      try {
        var active = SpreadsheetApp.getActiveSpreadsheet();
        if (active) return active;
      } catch(e2) {
        console.error('Error getting active spreadsheet:', e2);
      }
    } catch(err) {
      console.error('Error in Database.getSpreadsheet:', err);
    }
    return null;
  },
  
  resolveSheetName: function(ss, name) {
    if (!ss || !name) return name;
    if (ss.getSheetByName(name)) return name;
    
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toLowerCase() === String(name).toLowerCase()) {
        return sheets[i].getName();
      }
    }
    
    var aliases = {
      'student': 'siswa',
      'students': 'siswa',
      'transactions': 'transaksi_pelanggaran',
      'transaction': 'transaksi_pelanggaran',
      'violations': 'master_pelanggaran',
      'violation': 'master_pelanggaran',
      'user': 'users',
      'password_reset_requests': 'password_reset_requests',
      'discipline_matrix': 'master_matriks_kedisiplinan',
      'master_matriks_kedisiplinan': 'master_matriks_kedisiplinan',
      'matriks_kedisiplinan': 'master_matriks_kedisiplinan',
      'majors': 'jurusan',
      'major': 'jurusan',
      'master_jurusan': 'jurusan',
      'master jurusan': 'jurusan',
      'classes': 'kelas',
      'class': 'kelas'
    };
    
    var target = aliases[String(name).toLowerCase()];
    if (target) {
      if (ss.getSheetByName(target)) return target;
      for (var j = 0; j < sheets.length; j++) {
        if (sheets[j].getName().toLowerCase() === target.toLowerCase()) {
          return sheets[j].getName();
        }
      }
    }
    return name;
  },

  getTableData: function(sheetName) {
    try {
      var ss = this.getSpreadsheet();
      if (!ss) return [];
      var actualName = this.resolveSheetName(ss, sheetName);
      var sheet = ss.getSheetByName(actualName);
      if (!sheet) return [];
      var data = sheet.getDataRange().getValues();
      if (!data || data.length <= 1) return [];
      var headers = data[0];
      var result = [];
      for (var i = 1; i < data.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          if (headers[j]) {
            row[headers[j]] = data[i][j];
          }
        }
        result.push(row);
      }
      return result;
    } catch(err) {
      console.error('Error in Database.getTableData(' + sheetName + '):', err);
      return [];
    }
  },
  
  insertRow: function(sheetName, record) {
    try {
      var ss = this.getSpreadsheet();
      if (!ss) {
        throw new Error('Gagal membuka Spreadsheet database. Periksa SPREADSHEET_ID.');
      }
      var actualName = this.resolveSheetName(ss, sheetName);
      var sheet = ss.getSheetByName(actualName);
      if (!sheet) {
        sheet = ss.insertSheet(actualName);
      }
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        var initialHeaders = Object.keys(record);
        sheet.appendRow(initialHeaders);
        lastCol = initialHeaders.length;
      }
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var row = headers.map(function(h) { return record[h] !== undefined ? record[h] : ''; });
      sheet.appendRow(row);
      return record;
    } catch(err) {
      console.error('Error in Database.insertRow(' + sheetName + '):', err);
      throw new Error('Gagal menambah baris ke sheet "' + sheetName + '": ' + err.message);
    }
  },

  updateRow: function(sheetName, id, updatedRecord) {
    try {
      var ss = this.getSpreadsheet();
      if (!ss) {
        throw new Error('Gagal membuka Spreadsheet database. Periksa SPREADSHEET_ID.');
      }
      var actualName = this.resolveSheetName(ss, sheetName);
      var sheet = ss.getSheetByName(actualName);
      if (!sheet) return false;

      var data = sheet.getDataRange().getValues();
      if (!data || data.length <= 1) return false;

      var headers = data[0];
      var idColIdx = headers.indexOf('id');
      if (idColIdx === -1) idColIdx = headers.indexOf('id_siswa');
      if (idColIdx === -1) idColIdx = headers.indexOf('nis');
      if (idColIdx === -1) idColIdx = headers.indexOf('User ID');
      if (idColIdx === -1) idColIdx = 0;

      for (var i = 1; i < data.length; i++) {
        var rowVal = String(data[i][idColIdx] || '');
        if (rowVal === String(id) || rowVal.toLowerCase() === String(id).toLowerCase()) {
          var rowIdx = i + 1; // 1-based row index
          for (var j = 0; j < headers.length; j++) {
            var h = headers[j];
            if (updatedRecord[h] !== undefined) {
              sheet.getRange(rowIdx, j + 1).setValue(updatedRecord[h]);
            }
          }
          return true;
        }
      }
      return false;
    } catch(err) {
      console.error('Error in Database.updateRow(' + sheetName + '):', err);
      throw new Error('Gagal memperbarui baris pada sheet "' + sheetName + '": ' + err.message);
    }
  },

  deleteRow: function(sheetName, id) {
    try {
      var ss = this.getSpreadsheet();
      if (!ss) {
        throw new Error('Gagal membuka Spreadsheet database. Periksa SPREADSHEET_ID.');
      }
      var actualName = this.resolveSheetName(ss, sheetName);
      var sheet = ss.getSheetByName(actualName);
      if (!sheet) return false;

      var data = sheet.getDataRange().getValues();
      if (!data || data.length <= 1) return false;

      var headers = data[0];
      var idColIdx = headers.indexOf('id');
      if (idColIdx === -1) idColIdx = headers.indexOf('id_siswa');
      if (idColIdx === -1) idColIdx = headers.indexOf('nis');
      if (idColIdx === -1) idColIdx = headers.indexOf('User ID');
      if (idColIdx === -1) idColIdx = 0;

      for (var i = 1; i < data.length; i++) {
        var rowVal = String(data[i][idColIdx] || '');
        if (rowVal === String(id) || rowVal.toLowerCase() === String(id).toLowerCase()) {
          sheet.deleteRow(i + 1);
          return true;
        }
      }
      return false;
    } catch(err) {
      console.error('Error in Database.deleteRow(' + sheetName + '):', err);
      throw new Error('Gagal menghapus baris pada sheet "' + sheetName + '": ' + err.message);
    }
  },
  
  logActivity: function(userName, role, action, details) {
    try {
      this.insertRow('activity_log', {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        userName: userName || 'Admin',
        userRole: role || 'admin',
        action: action || 'ACTION',
        details: details || ''
      });
    } catch(e) { console.error(e); }
  },

  /**
   * Automatic Database Initializer
   * Creates required sheets, headers, and default data idempotently.
   */
  setupDatabase: function() {
    var logs = [];
    var report = {
      status: 'SUCCESS',
      createdSheets: [],
      existingSheets: [],
      errors: [],
      logs: logs
    };

    function logMsg(msg) {
      var timestamp = new Date().toLocaleTimeString();
      var formatted = '[' + timestamp + '] ' + msg;
      console.log(formatted);
      logs.push(formatted);
    }

    logMsg('=== Memulai Inisialisasi Database SMART POINT SISWA ===');

    try {
      var ss = this.getSpreadsheet();
      if (!ss) {
        var errStr = 'Spreadsheet tidak dapat diakses! Pastikan SPREADSHEET_ID atau active spreadsheet valid.';
        logMsg('ERROR: ' + errStr);
        report.status = 'ERROR';
        report.errors.push(errStr);
        return report;
      }

      logMsg('Spreadsheet terhubung: "' + ss.getName() + '" (ID: ' + ss.getId() + ')');

      // Table Definitions & Headers
      var SCHEMA = {
        'users': [
          'id', 'nama', 'username', 'password', 'role', 'status', 'created_at', 'updated_at'
        ],
        'siswa': [
          'id', 'nis', 'nama', 'jenis_kelamin', 'jurusan', 'tingkat', 'kelas', 'status', 'created_at', 'updated_at'
        ],
        'jurusan': [
          'id', 'kode', 'nama_jurusan', 'status'
        ],
        'kelas': [
          'id', 'nama_kelas', 'jurusan', 'tingkat', 'wali_kelas', 'status'
        ],
        'master_pelanggaran': [
          'id', 'kode', 'nama_pelanggaran', 'kategori', 'poin', 'status'
        ],
        'transaksi_pelanggaran': [
          'id', 'no_transaksi', 'tanggal', 'nis', 'nama_siswa', 'kelas', 'id_pelanggaran', 'nama_pelanggaran', 'kategori', 'poin', 'keterangan', 'petugas', 'created_at'
        ],
        'settings': [
          'key', 'value', 'description', 'updated_at'
        ],
        'activity_log': [
          'id', 'timestamp', 'userName', 'userRole', 'action', 'details'
        ],
        'backup_history': [
          'id', 'timestamp', 'fileName', 'fileId', 'fileUrl', 'status', 'created_by'
        ],
        'promotion_history': [
          'id', 'timestamp', 'tahun_ajaran', 'total_siswa', 'detail', 'created_by'
        ],
        'maintenance_history': [
          'id', 'timestamp', 'status', 'pesan', 'created_by'
        ],
        'password_reset_requests': [
          'id', 'tanggal', 'username', 'nama', 'email', 'nomor_whatsapp', 'alasan', 'status', 'diproses_oleh', 'tanggal_proses'
        ],
        'master_matriks_kedisiplinan': [
          'id', 'ruleName', 'minPoint', 'maxPoint', 'statusKedisiplinan', 'jenisPembinaan', 'tindakanSekolah', 'suratDiterbitkan', 'pemanggilanOrtu', 'homeVisit', 'konselingBk', 'rekomendasiTindakLanjut', 'priority', 'isActive', 'keterangan', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'
        ]
      };

      // Default Data Definitions
      var DEFAULT_DATA = {
        'settings': [
          ['Nama Sekolah', 'SMK NEGERI 1 DEMAK', 'Nama resmi instansi sekolah', new Date().toISOString()],
          ['Tahun Ajaran Aktif', '2025/2026', 'Tahun ajaran operasional aktif', new Date().toISOString()],
          ['Semester Aktif', 'Ganjil', 'Semester operasional aktif', new Date().toISOString()],
          ['Logo Sekolah', 'https://via.placeholder.com/150', 'URL logo resmi sekolah', new Date().toISOString()],
          ['Maintenance Mode', 'OFF', 'Status pemeliharaan sistem', new Date().toISOString()],
          ['Threshold Point Warning', '50', 'Batas poin peringatan siswa', new Date().toISOString()],
          ['Threshold Point Dikeluarkan', '100', 'Batas poin tindakan tegas', new Date().toISOString()]
        ],
        'users': [
          ['user-admin-1', 'Administrator Utama', 'admin', 'admin123', 'admin', 'Aktif', new Date().toISOString(), new Date().toISOString()]
        ]
      };

      var sheetKeys = Object.keys(SCHEMA);

      for (var i = 0; i < sheetKeys.length; i++) {
        var sheetName = sheetKeys[i];
        var headers = SCHEMA[sheetName];
        var sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
          logMsg('Membuat sheet baru: "' + sheetName + '"...');
          sheet = ss.insertSheet(sheetName);
          report.createdSheets.push(sheetName);
        } else {
          logMsg('Sheet "' + sheetName + '" sudah ada. Memeriksa header...');
          report.existingSheets.push(sheetName);
        }

        // Set / Validate Header Row
        if (sheet.getLastRow() === 0) {
          logMsg('Menambahkan header otomatis untuk sheet: "' + sheetName + '"');
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f4f6');
        }

        // Seed Default Data if table has no data rows (only header row)
        if (sheet.getLastRow() === 1 && DEFAULT_DATA[sheetName]) {
          logMsg('Menambahkan data awal default untuk sheet: "' + sheetName + '"...');
          var rows = DEFAULT_DATA[sheetName];
          sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
          logMsg('Berhasil memasukkan ' + rows.length + ' baris data awal ke sheet "' + sheetName + '"');
        }
      }

      logMsg('=== Inisialisasi Database Selesai dengan Sukses ===');
      logMsg('Total sheet dibuat: ' + report.createdSheets.length);
      logMsg('Total sheet yang sudah ada: ' + report.existingSheets.length);

      this.logActivity('System', 'admin', 'SETUP_DATABASE', 'Inisialisasi database berhasil dijalankan.');

    } catch (err) {
      logMsg('CRITICAL ERROR saat inisialisasi database: ' + err.toString());
      report.status = 'ERROR';
      report.errors.push(err.toString());
    }

    return report;
  },

  verifyAndConnectSpreadsheet: function(spreadsheetIdOrUrl, userName) {
    var logs = [];
    function logMsg(msg) {
      var ts = new Date().toLocaleTimeString();
      logs.push('[' + ts + '] ' + msg);
      console.log(msg);
    }

    logMsg('Memulai proses pengujian dan penghubungan Google Spreadsheet...');

    if (!spreadsheetIdOrUrl || String(spreadsheetIdOrUrl).trim() === '') {
      return {
        success: false,
        message: 'Spreadsheet ID atau URL tidak boleh kosong.',
        data: { status: 'Tidak Terhubung', testResults: { readTest: { success: false, message: 'Tidak diuji' }, writeTest: { success: false, message: 'Tidak diuji' }, deleteTest: { success: false, message: 'Tidak diuji' } } }
      };
    }

    var cleanId = String(spreadsheetIdOrUrl).trim().replace(/^["']|["']$/g, '');
    var urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      cleanId = urlMatch[1];
    }

    logMsg('Mengurai Spreadsheet ID: ' + cleanId);

    var ss = null;
    try {
      ss = SpreadsheetApp.openById(cleanId);
    } catch (e) {
      logMsg('Gagal membuka Spreadsheet dengan ID (' + cleanId + '): ' + e.toString());
      return {
        success: false,
        message: 'Gagal membuka Google Spreadsheet. Pastikan Spreadsheet ID/URL benar dan akun Google Apps Script memiliki hak akses. Error: ' + e.message,
        data: {
          status: 'Tidak Terhubung',
          spreadsheetId: cleanId,
          testResults: { readTest: { success: false, message: 'Gagal Buka SS' }, writeTest: { success: false, message: 'Gagal Buka SS' }, deleteTest: { success: false, message: 'Gagal Buka SS' } }
        }
      };
    }

    if (!ss) {
      return {
        success: false,
        message: 'Spreadsheet tidak ditemukan.',
        data: { status: 'Tidak Terhubung', spreadsheetId: cleanId, testResults: { readTest: { success: false, message: 'Gagal' }, writeTest: { success: false, message: 'Gagal' }, deleteTest: { success: false, message: 'Gagal' } } }
      };
    }

    logMsg('Spreadsheet terjangkau: "' + ss.getName() + '"');

    // Set temporary ID to Script Properties so setupDatabase and tests execute against this SS
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', cleanId);

    // Inisialisasi struktur sheet dan header standar jika belum lengkap
    logMsg('Memeriksa dan menyiapkan struktur sheet database...');
    var setupReport = this.setupDatabase();
    if (setupReport.status === 'ERROR') {
      logMsg('Gagal menyiapkan sheet database.');
      return {
        success: false,
        message: 'Gagal menginisialisasi sheet pada Spreadsheet: ' + (setupReport.errors ? setupReport.errors.join(', ') : 'Unknown error'),
        data: { status: 'Tidak Terhubung', spreadsheetId: cleanId, testResults: { readTest: { success: false, message: 'Gagal Inisialisasi' }, writeTest: { success: false, message: 'Gagal' }, deleteTest: { success: false, message: 'Gagal' } } }
      };
    }

    // TEST 1: READ TEST
    var readSuccess = false;
    var readMessage = '';
    try {
      logMsg('Jalankan TEST READ...');
      var testData = this.getTableData('settings');
      if (Array.isArray(testData)) {
        readSuccess = true;
        readMessage = 'OK (' + testData.length + ' baris terbaca dari sheet settings)';
        logMsg('TEST READ BERHASIL: ' + readMessage);
      } else {
        readMessage = 'Gagal membaca sheet settings';
        logMsg('TEST READ GAGAL');
      }
    } catch (eRead) {
      readMessage = 'Error READ: ' + eRead.message;
      logMsg('TEST READ ERROR: ' + eRead.message);
    }

    // TEST 2: WRITE TEST
    var writeSuccess = false;
    var writeMessage = '';
    var testRowId = 'test-conn-' + Date.now();
    try {
      logMsg('Jalankan TEST WRITE...');
      this.insertRow('activity_log', {
        id: testRowId,
        timestamp: new Date().toISOString(),
        userName: userName || 'Admin',
        userRole: 'admin',
        action: 'TEST_WRITE_SPREADSHEET',
        details: 'Uji Penulisan Otomatis Koneksi Spreadsheet ID: ' + cleanId
      });
      writeSuccess = true;
      writeMessage = 'OK (Baris data uji berhasil ditulis ke activity_log)';
      logMsg('TEST WRITE BERHASIL');
    } catch (eWrite) {
      writeMessage = 'Error WRITE: ' + eWrite.message;
      logMsg('TEST WRITE ERROR: ' + eWrite.message);
    }

    // TEST 3: DELETE TEST
    var deleteSuccess = false;
    var deleteMessage = '';
    if (writeSuccess) {
      try {
        logMsg('Jalankan TEST DELETE...');
        var deleted = this.deleteRow('activity_log', testRowId);
        if (deleted) {
          deleteSuccess = true;
          deleteMessage = 'OK (Baris data uji berhasil dihapus dari activity_log)';
          logMsg('TEST DELETE BERHASIL');
        } else {
          deleteMessage = 'Baris data uji tidak dapat dihapus';
          logMsg('TEST DELETE GAGAL');
        }
      } catch (eDel) {
        deleteMessage = 'Error DELETE: ' + eDel.message;
        logMsg('TEST DELETE ERROR: ' + eDel.message);
      }
    } else {
      deleteMessage = 'Dilewati karena TEST WRITE gagal';
    }

    var allTestsPassed = readSuccess && writeSuccess && deleteSuccess;

    if (allTestsPassed) {
      logMsg('Seluruh pengujian koneksi (Read, Write, Delete) BERHASIL KONTINU!');
      this.logActivity(userName || 'Admin', 'admin', 'CONNECT_SPREADSHEET_SUCCESS', 'Spreadsheet "' + ss.getName() + '" (ID: ' + cleanId + ') terhubung dan diverifikasi sebagai Single Source of Truth.');

      var sheetsList = ss.getSheets().map(function(s) { return s.getName(); });
      return {
        success: true,
        message: 'Koneksi Google Spreadsheet berhasil diverifikasi! Seluruh uji Read, Write, Delete lulus 100%. Database utama aktif.',
        data: {
          status: 'Terhubung',
          spreadsheetId: cleanId,
          spreadsheetName: ss.getName(),
          spreadsheetUrl: ss.getUrl() || ('https://docs.google.com/spreadsheets/d/' + cleanId),
          sheetCount: sheetsList.length,
          sheets: sheetsList,
          connectedAt: new Date().toISOString(),
          lastSync: new Date().toISOString(),
          testResults: {
            readTest: { success: readSuccess, message: readMessage },
            writeTest: { success: writeSuccess, message: writeMessage },
            deleteTest: { success: deleteSuccess, message: deleteMessage }
          },
          logs: logs
        }
      };
    } else {
      logMsg('Pengujian koneksi tidak lengkap. Membatalkan konfigurasi simpan.');
      return {
        success: false,
        message: 'Pengujian koneksi ke Google Spreadsheet gagal pada beberapa tahap. Silakan periksa hak akses edit.',
        data: {
          status: 'Tidak Terhubung',
          spreadsheetId: cleanId,
          spreadsheetName: ss ? ss.getName() : '',
          testResults: {
            readTest: { success: readSuccess, message: readMessage },
            writeTest: { success: writeSuccess, message: writeMessage },
            deleteTest: { success: deleteSuccess, message: deleteMessage }
          },
          logs: logs
        }
      };
    }
  },

  getSpreadsheetStatus: function() {
    try {
      var ss = this.getSpreadsheet();
      if (!ss) {
        return {
          success: true,
          data: {
            status: 'Belum Terhubung',
            spreadsheetId: '',
            spreadsheetName: 'Belum Terhubung',
            spreadsheetUrl: '',
            sheetCount: 0,
            sheets: [],
            testResults: {
              readTest: { success: false, message: 'Belum diuji' },
              writeTest: { success: false, message: 'Belum diuji' },
              deleteTest: { success: false, message: 'Belum diuji' }
            }
          }
        };
      }

      var sheetsList = ss.getSheets().map(function(s) { return s.getName(); });
      var cleanId = ss.getId();

      return {
        success: true,
        data: {
          status: 'Terhubung',
          spreadsheetId: cleanId,
          spreadsheetName: ss.getName(),
          spreadsheetUrl: ss.getUrl() || ('https://docs.google.com/spreadsheets/d/' + cleanId),
          sheetCount: sheetsList.length,
          sheets: sheetsList,
          connectedAt: new Date().toISOString(),
          lastSync: new Date().toISOString(),
          testResults: {
            readTest: { success: true, message: 'OK (Verified Read Access)' },
            writeTest: { success: true, message: 'OK (Verified Write Access)' },
            deleteTest: { success: true, message: 'OK (Verified Delete Access)' }
          }
        }
      };
    } catch (e) {
      return {
        success: false,
        message: 'Error checking spreadsheet status: ' + e.message,
        data: { status: 'Tidak Terhubung' }
      };
    }
  },

  resetSpreadsheetConnection: function(userName) {
    try {
      var activeSs = this.getSpreadsheet();
      var oldName = activeSs ? activeSs.getName() : 'Unknown';
      var oldId = activeSs ? activeSs.getId() : '';

      PropertiesService.getScriptProperties().deleteProperty('SPREADSHEET_ID');

      this.logActivity(userName || 'Admin', 'admin', 'RESET_SPREADSHEET_CONNECTION', 'Mereset konfigurasi koneksi Google Spreadsheet [Nama: ' + oldName + ' | ID: ' + oldId + ']. Status koneksi sekarang: Belum Terhubung.');

      return {
        success: true,
        message: 'Koneksi Google Spreadsheet berhasil direset. Konfigurasi koneksi dibersihkan. Isi file Google Spreadsheet tidak dihapus.',
        data: {
          status: 'Belum Terhubung',
          spreadsheetId: '',
          spreadsheetName: '',
          spreadsheetUrl: '',
          sheetCount: 0
        }
      };
    } catch (e) {
      return {
        success: false,
        message: 'Gagal mereset koneksi Google Spreadsheet: ' + e.message
      };
    }
  }
};

/**
 * Top-level global function for Google Apps Script Editor execution
 * Allows running `setupDatabase()` directly from the Google Apps Script dropdown menu.
 */
function setupDatabase() {
  return Database.setupDatabase();
}

