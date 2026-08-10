/**
 * User.gs - User Account Management Services (Object Module Pattern)
 */

var User = {
  getAll: function() {
    try {
      ensureUsersTable();
      var rows = Database.getTableData('users') || [];
      return rows.map(function(u) {
        return {
          id: String(u.id || u['User ID'] || ''),
          name: String(u.nama || u['Nama Lengkap'] || u.name || u.Nama || ''),
          nama: String(u.nama || u['Nama Lengkap'] || u.name || u.Nama || ''),
          username: String(u.username || u.Username || ''),
          email: String(u.email || u.Email || ''),
          role: String(u.role || u.Role || 'admin').toLowerCase(),
          status: String(u.status || u.Status || 'Aktif'),
          nipNik: String(u.nip_nik || u['NIP/NIK'] || u.nipNik || ''),
          phoneNumber: String(u.nomor_hp || u['Nomor HP'] || u.phoneNumber || ''),
          lastLogin: String(u.terakhir_login || u['Terakhir Login'] || u.lastLogin || ''),
          createdAt: String(r_createdAt(u))
        };
      });
    } catch (err) {
      console.error('Error in User.getAll:', err);
      return [];
    }
  },

  getById: function(id) {
    if (!id) return null;
    var all = this.getAll();
    var cleanId = String(id).trim().toLowerCase();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id.toLowerCase() === cleanId || all[i].username.toLowerCase() === cleanId) {
        return all[i];
      }
    }
    return null;
  },

  save: function(userData) {
    try {
      if (!userData) {
        return { success: false, message: 'Data pengguna tidak lengkap.' };
      }

      ensureUsersTable();
      var session = Auth.getCurrentUserSession();
      if (!session || session.role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang dapat mengelola akun pengguna.' };
      }

      var username = String(userData.username || userData.Username || '').trim();
      var nama = String(userData.nama || userData.name || userData['Nama Lengkap'] || '').trim();
      var email = String(userData.email || userData.Email || '').trim().toLowerCase();
      var role = String(userData.role || userData.Role || 'admin').trim().toLowerCase();
      var status = String(userData.status || userData.Status || 'Aktif').trim();

      if (!username || !nama || !email) {
        return { success: false, message: 'Username, Nama Lengkap, dan Email wajib diisi.' };
      }

      var userId = userData.id ? String(userData.id).trim() : '';
      var nowIso = new Date().toISOString();

      var record = {
        id: userId || ('usr-' + Date.now()),
        nama: nama,
        username: username,
        email: email,
        role: role,
        status: status,
        nip_nik: String(userData.nipNik || userData['NIP/NIK'] || ''),
        nomor_hp: String(userData.phoneNumber || userData['Nomor HP'] || ''),
        updated_at: nowIso
      };

      if (userData.password || userData.passwordHash) {
        var rawPass = userData.password || 'password123';
        record.password = hashPassword(rawPass);
        record.passwordHash = hashPassword(rawPass);
      }

      if (userId) {
        var updated = Database.updateRow('users', userId, record);
        if (!updated) {
          updated = Database.updateRow('users', username, record);
        }
        if (!updated) {
          record.created_at = nowIso;
          Database.insertRow('users', record);
        }
        Database.logActivity(session.name, session.role, 'EDIT_USER', 'Mengubah user: ' + username + ' (' + role + ')');
        return { success: true, message: 'Data pengguna berhasil diperbarui.', data: record };
      } else {
        record.created_at = nowIso;
        if (!record.password) {
          record.password = hashPassword('password123');
          record.passwordHash = hashPassword('password123');
        }
        Database.insertRow('users', record);
        Database.logActivity(session.name, session.role, 'TAMBAH_USER', 'Menambah user: ' + username + ' (' + role + ')');
        return { success: true, message: 'Data pengguna berhasil disimpan.', data: record };
      }
    } catch (err) {
      console.error('Error in User.save:', err);
      return { success: false, message: 'Gagal menyimpan data pengguna: ' + err.message };
    }
  },

  remove: function(id) {
    try {
      if (!id) {
        return { success: false, message: 'ID pengguna wajib diisi.' };
      }

      var session = Auth.getCurrentUserSession();
      if (!session || session.role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang dapat menghapus akun pengguna.' };
      }

      Database.deleteRow('users', id);
      Database.logActivity(session.name, session.role, 'HAPUS_USER', 'Menghapus akun pengguna ID/Username: ' + id);
      return { success: true, message: 'Akun pengguna berhasil dihapus.' };
    } catch (err) {
      console.error('Error in User.remove:', err);
      return { success: false, message: 'Gagal menghapus pengguna: ' + err.message };
    }
  }
};

function r_createdAt(obj) {
  return obj.created_at || obj['Tanggal Dibuat'] || obj.createdAt || '';
}

// Global legacy RPC aliases
function getAllUsers() {
  return User.getAll();
}

function saveUserRecord(userData) {
  return User.save(userData);
}

function deleteUser(id) {
  return User.remove(id);
}
