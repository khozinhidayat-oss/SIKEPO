/**
 * Auth.gs - Authentication & User Session Management
 */

function ensureUsersTable() {
  try {
    var ss = Database.getSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('users');
    if (!sheet) {
      sheet = ss.insertSheet('users');
    }
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      if (data.length === 0 || !data[0][0]) {
        sheet.clear();
        sheet.appendRow([
          'User ID', 'Nama Lengkap', 'NIP/NIK', 'Email', 'Username',
          'Password Hash', 'Role', 'Status', 'Nomor HP',
          'Tanggal Dibuat', 'Terakhir Login', 'Dibuat Oleh', 'Diubah Oleh', 'Timestamp'
        ]);
      }
      var passAdmin = hashPassword('admin123');
      var passDefault = hashPassword('password123');
      var now = new Date().toISOString();
      
      sheet.appendRow(['usr-1', 'Budi Santoso, S.Kom (Admin)', '19850315 201001 1 008', 'admin@sekolah.sch.id', 'admin', passAdmin, 'admin', 'Aktif', '081234567890', now, now, 'System', 'System', now]);
      sheet.appendRow(['usr-2', 'Siti Rahmawati, S.Pd (Kesiswaan)', '19880722 201202 2 005', 'kesiswaan@sekolah.sch.id', 'kesiswaan', passDefault, 'kesiswaan', 'Aktif', '081234567891', now, now, 'System', 'System', now]);
      sheet.appendRow(['usr-3', 'Ahmad Dahlan, M.Pd (Guru BK)', '19900110 201503 1 002', 'guru@sekolah.sch.id', 'guru', passDefault, 'guru', 'Aktif', '081234567892', now, now, 'System', 'System', now]);
    }
  } catch(e) {
    console.error('Error in ensureUsersTable:', e);
  }
}

var Auth = {
  login: function(inputEmailOrUsername, password) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
      ensureUsersTable();
      var users = Database.getTableData('users');
      var target = String(inputEmailOrUsername || '').toLowerCase().trim();
      var inputPass = String(password || '').trim();
      
      function getVal(u, keys) {
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          if (u[key] !== undefined && u[key] !== null && String(u[key]).trim() !== '') {
            return String(u[key]).trim();
          }
        }
        return '';
      }

      var user = null;
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var email = getVal(u, ['Email', 'email', 'EMAIL']).toLowerCase();
        var username = getVal(u, ['Username', 'username', 'USERNAME']).toLowerCase();

        var isMatch = (email === target || username === target);
        if (isMatch) {
          user = u;
          break;
        }
      }
      
      // 1. Username / Email Check
      if (!user) {
        console.warn('LOGIN DIAGNOSTIC: Target user not found: ' + target);
        return { success: false, message: 'Email/Username tidak ditemukan dalam sistem.' };
      }
      
      // 2. Strict Password Check against Database Hash or Password
      var passHashInDb = getVal(user, ['Password Hash', 'passwordHash', 'Password', 'password']);
      var inputHash = hashPassword(inputPass);
      
      var isPassValid = (
        (passHashInDb && (passHashInDb === inputPass || passHashInDb === inputHash))
      );
      
      if (!isPassValid) {
        console.warn('LOGIN DIAGNOSTIC: Incorrect password for user: ' + target);
        return { success: false, message: 'Password yang Anda masukkan salah.' };
      }

      // 3. Account Status Check AFTER Password Validation
      var statusRaw = getVal(user, ['Status', 'status', 'STATUS', 'is_active', 'active', 'account_status']).toLowerCase();
      var isActive = (
        statusRaw === 'aktif' ||
        statusRaw === 'active' ||
        statusRaw === 'true' ||
        statusRaw === '1' ||
        statusRaw === 'ya' ||
        statusRaw === 'enabled' ||
        statusRaw === ''
      );

      console.log('LOGIN DIAGNOSTIC: User: ' + target + ' | Status Raw: "' + statusRaw + '" | IsActive: ' + isActive);

      if (!isActive) {
        return { success: false, message: 'Akun Anda dalam status Non-Aktif. Hubungi Administrator.' };
      }

      // 4. Role Validation
      var role = getVal(user, ['Role', 'role']) || 'admin';
      var roleClean = role.toLowerCase().trim();
      var isRoleValid = (roleClean === 'admin' || roleClean === 'kesiswaan' || roleClean === 'guru' || roleClean === 'bk' || roleClean === 'superadmin');
      
      if (!isRoleValid) {
        console.warn('LOGIN DIAGNOSTIC: Invalid role encountered: ' + role);
        return { success: false, message: 'Akses Ditolak: Peran akun Anda tidak memuat hak akses yang valid.' };
      }
      
      var userId = getVal(user, ['User ID', 'id', 'userId']) || 'usr-1';
      var name = getVal(user, ['Nama Lengkap', 'name', 'Nama']) || target;
      var userEmail = getVal(user, ['Email', 'email']) || target;
      var nowIso = new Date().toISOString();

      // Update Terakhir Login in Database Table
      try {
        if (user.id) {
          Database.updateRow('users', user.id, { lastLogin: nowIso, 'Terakhir Login': nowIso });
        }
      } catch (lErr) {
        console.warn('Could not update last login timestamp:', lErr);
      }

      var session = {
        isLoggedIn: true,
        userId: userId,
        email: userEmail,
        name: name,
        role: role.toLowerCase(),
        loginTime: new Date().toISOString()
      };
      
      UserProperties.setProperty('CURRENT_USER', JSON.stringify(session));
      Database.logActivity(name, role, 'LOGIN', 'User berhasil login ke sistem');
      
      return { success: true, user: session };
    } catch(err) {
      return { success: false, message: 'Terjadi kesalahan sistem saat login: ' + err.message };
    } finally {
      lock.releaseLock();
    }
  },
  
  logout: function() {
    try {
      UserProperties.deleteProperty('CURRENT_USER');
      return { success: true };
    } catch(e) {
      return { success: true };
    }
  },
  
  getCurrentUserSession: function() {
    try {
      var prop = UserProperties.getProperty('CURRENT_USER');
      if (prop) return JSON.parse(prop);
    } catch(e) {}
    return { isLoggedIn: false };
  },

  requestPasswordReset: function(username, nama, email, nomorWhatsapp, alasan) {
    try {
      var unClean = String(username || '').trim().toLowerCase();
      var emClean = String(email || '').trim().toLowerCase();
      
      var users = Database.getTableData('users') || [];
      var matchedUser = null;
      
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var uName = String(u.username || u.Username || '').trim().toLowerCase();
        var uEmail = String(u.email || u.Email || '').trim().toLowerCase();
        
        if ((unClean && uName === unClean) || (emClean && uEmail === emClean)) {
          matchedUser = u;
          break;
        }
      }
      
      if (!matchedUser) {
        return {
          success: false,
          message: 'Username atau Email tidak terdaftar dalam database sistem.'
        };
      }
      
      var statusRaw = String(matchedUser.status || matchedUser.Status || '').trim().toLowerCase();
      if (statusRaw === 'nonaktif' || statusRaw === 'inactive' || statusRaw === 'dihapus') {
        return {
          success: false,
          message: 'Akun Anda dalam status Nonaktif. Silakan hubungi Administrator secara langsung.'
        };
      }
      
      var reqId = 'req-' + Date.now();
      var nowIso = new Date().toISOString();
      
      var record = {
        id: reqId,
        tanggal: nowIso,
        username: String(username || matchedUser.username || matchedUser.Username || '').trim(),
        nama: String(nama || matchedUser.nama || matchedUser.Nama || matchedUser.name || '').trim(),
        email: emClean || String(matchedUser.email || matchedUser.Email || ''),
        nomor_whatsapp: String(nomorWhatsapp || ''),
        alasan: String(alasan || ''),
        status: 'Menunggu Persetujuan',
        diproses_oleh: '',
        tanggal_proses: ''
      };
      
      Database.insertRow('password_reset_requests', record);
      Database.logActivity(record.nama, 'user', 'REQUEST_RESET_PASSWORD', 'Mengajukan permintaan reset password: ' + record.username);
      
      return {
        success: true,
        message: 'Permintaan reset password berhasil dikirim. Silakan menunggu Administrator memproses permintaan Anda.'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Gagal mengajukan reset password: ' + err.message
      };
    }
  },

  getPasswordResetRequests: function() {
    try {
      var rows = Database.getTableData('password_reset_requests') || [];
      var result = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        result.push({
          id: r.id || '',
          tanggal: r.tanggal || '',
          username: r.username || '',
          nama: r.nama || '',
          email: r.email || '',
          nomorWhatsapp: r.nomor_whatsapp || r.nomorWhatsapp || '',
          alasan: r.alasan || '',
          status: r.status || 'Menunggu Persetujuan',
          diprosesOleh: r.diproses_oleh || r.diprosesOleh || '',
          tanggalProses: r.tanggal_proses || r.tanggalProses || ''
        });
      }
      return result;
    } catch(err) {
      console.error('Error in getPasswordResetRequests:', err);
      return [];
    }
  },

  processPasswordResetRequest: function(requestId, status, newPassword, adminName, catatanAdmin) {
    try {
      var ss = Database.getSpreadsheet();
      if (!ss) return { success: false, message: 'Spreadsheet tidak terhubung.' };
      
      var actualSheet = Database.resolveSheetName(ss, 'password_reset_requests');
      var sheet = ss.getSheetByName(actualSheet);
      if (!sheet) return { success: false, message: 'Sheet password_reset_requests tidak ditemukan.' };
      
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) return { success: false, message: 'Data permintaan reset password kosong.' };
      
      var headers = data[0];
      var idColIdx = headers.indexOf('id');
      var statusColIdx = headers.indexOf('status');
      var diprosesOlehColIdx = headers.indexOf('diproses_oleh');
      var tanggalProsesColIdx = headers.indexOf('tanggal_proses');
      var usernameColIdx = headers.indexOf('username');
      
      if (idColIdx === -1) return { success: false, message: 'Kolom ID tidak ditemukan.' };
      
      var targetRowIdx = -1;
      var targetUsername = '';
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idColIdx]) === String(requestId)) {
          targetRowIdx = i + 1; // 1-indexed sheet row
          if (usernameColIdx !== -1) targetUsername = data[i][usernameColIdx];
          break;
        }
      }
      
      if (targetRowIdx === -1) {
        return { success: false, message: 'Data permintaan reset password tidak ditemukan.' };
      }
      
      var nowIso = new Date().toISOString();
      
      if (statusColIdx !== -1) sheet.getRange(targetRowIdx, statusColIdx + 1).setValue(status);
      if (diprosesOlehColIdx !== -1) sheet.getRange(targetRowIdx, diprosesOlehColIdx + 1).setValue(adminName || 'Admin');
      if (tanggalProsesColIdx !== -1) sheet.getRange(targetRowIdx, tanggalProsesColIdx + 1).setValue(nowIso);
      
      // If approved, update user's password in users sheet
      if (status === 'Disetujui' && newPassword) {
        var usersSheetName = Database.resolveSheetName(ss, 'users');
        var uSheet = ss.getSheetByName(usersSheetName);
        if (uSheet) {
          var uData = uSheet.getDataRange().getValues();
          if (uData.length > 1) {
            var uHeaders = uData[0];
            var uUsernameCol = uHeaders.indexOf('username');
            var uEmailCol = uHeaders.indexOf('email');
            var uPassCol = uHeaders.indexOf('password');
            if (uPassCol === -1) uPassCol = uHeaders.indexOf('passwordHash');
            
            var targetPassHash = hashPassword(newPassword);
            
            for (var u = 1; u < uData.length; u++) {
              var uUn = String(uData[u][uUsernameCol] || '').toLowerCase();
              var uEm = String(uData[u][uEmailCol] || '').toLowerCase();
              if (uUn === String(targetUsername).toLowerCase() || uEm === String(targetUsername).toLowerCase()) {
                if (uPassCol !== -1) {
                  uSheet.getRange(u + 1, uPassCol + 1).setValue(targetPassHash);
                }
                break;
              }
            }
          }
        }
      }
      
      Database.logActivity(
        adminName || 'Admin',
        'admin',
        'PROCESS_RESET_PASSWORD',
        'Memproses permintaan reset password ' + requestId + ' menjadi ' + status + ' untuk user ' + targetUsername
      );
      
      return {
        success: true,
        message: 'Permintaan reset password berhasil diproses (' + status + ').'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Gagal memproses permintaan reset password: ' + err.message
      };
    }
  }
};

function hashPassword(pass) {
  if (!pass) return '';
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass);
  var str = '';
  for (var i = 0; i < raw.length; i++) {
    var byteVal = raw[i];
    if (byteVal < 0) byteVal += 256;
    var byteStr = byteVal.toString(16);
    if (byteStr.length == 1) byteStr = '0' + byteStr;
    str += byteStr;
  }
  return str;
}
