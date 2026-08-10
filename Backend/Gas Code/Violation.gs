/**
 * Violation.gs - Master Data & Input Pelanggaran Siswa Services (Object Module Pattern)
 */

var MasterViolation = {
  getAll: function() {
    try {
      var rows = Database.getTableData('master_pelanggaran') || [];
      return rows.map(function(r) {
        return {
          id: String(r.id || r.kode || ''),
          code: String(r.kode || r.code || r.id || ''),
          kode: String(r.kode || r.code || r.id || ''),
          name: String(r.nama_pelanggaran || r.name || r.nama || ''),
          namaPelanggaran: String(r.nama_pelanggaran || r.name || r.nama || ''),
          category: String(r.kategori || r.category || 'Kedisiplinan'),
          kategori: String(r.kategori || r.category || 'Kedisiplinan'),
          points: Number(r.poin !== undefined ? r.poin : (r.points !== undefined ? r.points : (r.point || 0))),
          poin: Number(r.poin !== undefined ? r.poin : (r.points !== undefined ? r.points : (r.point || 0))),
          action: String(r.tindakan || r.action || 'Teguran Lisan'),
          tindakan: String(r.tindakan || r.action || 'Teguran Lisan'),
          status: String(r.status || 'Aktif')
        };
      });
    } catch (err) {
      console.error('Error in MasterViolation.getAll:', err);
      return [];
    }
  },

  save: function(data) {
    try {
      if (!data) return { success: false, message: 'Data pelanggaran tidak valid.' };

      var session = Auth.getCurrentUserSession();
      var id = data.id ? String(data.id) : (data.code || data.kode ? String(data.code || data.kode) : ('PLG-' + Date.now()));
      var record = {
        id: id,
        kode: data.kode || data.code || id,
        nama_pelanggaran: data.nama_pelanggaran || data.name || data.nama || data.namaPelanggaran || '',
        kategori: data.kategori || data.category || 'Kedisiplinan',
        poin: Number(data.poin !== undefined ? data.poin : (data.points !== undefined ? data.points : (data.point || 0))),
        tindakan: data.tindakan || data.action || 'Teguran Lisan',
        status: data.status || 'Aktif'
      };

      if (data.id) {
        Database.updateRow('master_pelanggaran', data.id, record);
        Database.logActivity(session.name || 'Admin', session.role || 'admin', 'EDIT_MASTER_PELANGGARAN', 'Mengubah pelanggaran: ' + record.nama_pelanggaran);
      } else {
        Database.insertRow('master_pelanggaran', record);
        Database.logActivity(session.name || 'Admin', session.role || 'admin', 'TAMBAH_MASTER_PELANGGARAN', 'Menambah pelanggaran: ' + record.nama_pelanggaran);
      }

      return { success: true, message: 'Master pelanggaran berhasil disimpan.', data: record };
    } catch (err) {
      console.error('Error in MasterViolation.save:', err);
      return { success: false, message: 'Gagal menyimpan master pelanggaran: ' + err.message };
    }
  },

  remove: function(id) {
    try {
      if (!id) return { success: false, message: 'ID pelanggaran wajib diisi.' };
      var session = Auth.getCurrentUserSession();
      Database.deleteRow('master_pelanggaran', id);
      Database.logActivity(session.name || 'Admin', session.role || 'admin', 'HAPUS_MASTER_PELANGGARAN', 'Menghapus master pelanggaran ID: ' + id);
      return { success: true, message: 'Master pelanggaran berhasil dihapus.' };
    } catch (err) {
      console.error('Error in MasterViolation.remove:', err);
      return { success: false, message: 'Gagal menghapus master pelanggaran: ' + err.message };
    }
  },

  importBatch: function(items) {
    try {
      if (!items || !Array.isArray(items)) {
        return { success: false, message: 'Data batch import tidak valid.' };
      }
      var session = Auth.getCurrentUserSession();
      var existing = this.getAll();
      var existingMap = {};
      existing.forEach(function(item) {
        if (item.code) existingMap[String(item.code).trim().toUpperCase()] = item;
      });

      var inserted = 0;
      var updated = 0;

      items.forEach(function(data) {
        var code = String(data.code || data.kode || '').trim().toUpperCase();
        var record = {
          id: data.id || (code ? 'PLG-' + code : ('PLG-' + Date.now() + '-' + Math.floor(Math.random()*1000))),
          kode: code,
          nama_pelanggaran: data.name || data.nama_pelanggaran || data.nama || '',
          kategori: data.category || data.kategori || 'Kedisiplinan',
          poin: Number(data.points !== undefined ? data.points : (data.poin !== undefined ? data.poin : (data.point || 0))),
          tindakan: data.action || data.tindakan || 'Teguran Lisan',
          status: data.status || 'Aktif'
        };

        if (code && existingMap[code]) {
          record.id = existingMap[code].id;
          Database.updateRow('master_pelanggaran', record.id, record);
          updated++;
        } else {
          Database.insertRow('master_pelanggaran', record);
          inserted++;
        }
      });

      Database.logActivity(session.name || 'Admin', session.role || 'admin', 'IMPORT_MASTER_PELANGGARAN', 'Import batch master pelanggaran: ' + inserted + ' baru, ' + updated + ' diperbarui.');
      return {
        success: true,
        message: 'Import master pelanggaran berhasil.',
        inserted: inserted,
        updated: updated
      };
    } catch (err) {
      console.error('Error in MasterViolation.importBatch:', err);
      return { success: false, message: 'Gagal import batch master pelanggaran: ' + err.message };
    }
  }
};

var Violation = {
  getAll: function() {
    try {
      var rows = Database.getTableData('transaksi_pelanggaran') || [];
      if (rows.length === 0) {
        rows = Database.getTableData('transactions') || [];
      }
      return rows.map(function(t) {
        var studentNis = String(t.studentNis || t.nis || t.id_siswa || t.studentId || '');
        var studentName = String(t.studentName || t.nama_siswa || t.nama || '');
        var className = String(t.className || t.studentClass || t.kelas || t.class || '');
        var majorName = String(t.majorName || t.jurusan || '');
        var level = String(t.level || t.tingkat || (className.startsWith('XII') ? 'XII' : className.startsWith('XI') ? 'XI' : className.startsWith('X') ? 'X' : 'X'));
        var itemName = String(t.itemName || t.violationName || t.nama_pelanggaran || '');
        var itemCategory = String(t.itemCategory || t.category || t.kategori || 'Kedisiplinan');
        var officerName = String(t.officerName || t.petugas || t.pelapor || 'Admin');
        var notes = String(t.notes || t.keterangan || t.catatan || '');
        var pts = Number(t.poin !== undefined ? t.poin : (t.points !== undefined ? t.points : 0));

        return {
          id: String(t.id || t.no_transaksi || t.noTransaksi || ''),
          no_transaksi: String(t.no_transaksi || t.noTransaksi || t.id || ''),
          noTransaksi: String(t.no_transaksi || t.noTransaksi || t.id || ''),
          type: 'pelanggaran',
          studentId: String(t.studentId || t.id_siswa || studentNis),
          id_siswa: String(t.id_siswa || t.studentId || studentNis),
          studentNis: studentNis,
          nis: studentNis,
          studentName: studentName,
          nama_siswa: studentName,
          class: className,
          className: className,
          studentClass: className,
          kelas: className,
          majorName: majorName,
          jurusan: majorName,
          level: level,
          tingkat: level,
          violationId: String(t.violationId || t.id_pelanggaran || t.itemId || ''),
          id_pelanggaran: String(t.id_pelanggaran || t.violationId || t.itemId || ''),
          violationCode: String(t.kode_pelanggaran || t.violationCode || ''),
          kode_pelanggaran: String(t.kode_pelanggaran || t.violationCode || ''),
          violationName: itemName,
          itemName: itemName,
          nama_pelanggaran: itemName,
          category: itemCategory,
          itemCategory: itemCategory,
          kategori: itemCategory,
          points: pts,
          poin: pts,
          action: String(t.tindakan || t.action || ''),
          tindakan: String(t.tindakan || t.action || ''),
          date: String(t.tanggal || t.date || new Date().toISOString().split('T')[0]),
          tanggal: String(t.tanggal || t.date || new Date().toISOString().split('T')[0]),
          time: String(t.waktu || t.time || '07:00'),
          waktu: String(t.waktu || t.time || '07:00'),
          location: String(t.lokasi || t.location || 'Lingkungan Sekolah'),
          notes: notes,
          keterangan: notes,
          officerName: officerName,
          petugas: officerName,
          pelapor: officerName,
          officer_role: String(t.officer_role || t.officerRole || 'admin'),
          officerRole: String(t.officer_role || t.officerRole || 'admin'),
          officer_email: String(t.officer_email || t.officerEmail || ''),
          officerEmail: String(t.officer_email || t.officerEmail || ''),
          created_at: String(t.created_at || t.createdAt || '')
        };
      });
    } catch (err) {
      console.error('Error in Violation.getAll:', err);
      return [];
    }
  },

  record: function(payload) {
    try {
      if (!payload) return { success: false, message: 'Data transaksi pelanggaran tidak valid.' };

      var session = Auth.getCurrentUserSession();
      var officerName = payload.officerName || payload.petugas || payload.pelapor || (session && session.name ? session.name : 'Admin');
      var officerRole = payload.officerRole || payload.officer_role || (session && session.role ? session.role : 'admin');

      var isEdit = Boolean(payload.id || payload.no_transaksi);
      var trxId = payload.id || payload.no_transaksi || ('trx-' + Date.now());
      var nowIso = new Date().toISOString();

      var studentNis = String(payload.studentNis || payload.nis || payload.studentId || payload.id_siswa || '').trim();
      var studentName = String(payload.studentName || payload.nama_siswa || payload.nama || '').trim();
      var className = String(payload.className || payload.studentClass || payload.kelas || payload.class || '').trim();
      var majorName = String(payload.majorName || payload.jurusan || '').trim();
      var level = String(payload.level || payload.tingkat || (className.startsWith('XII') ? 'XII' : className.startsWith('XI') ? 'XI' : className.startsWith('X') ? 'X' : 'X')).trim();
      var itemName = String(payload.itemName || payload.violationName || payload.nama_pelanggaran || '').trim();
      var itemCategory = String(payload.itemCategory || payload.category || payload.kategori || 'Kedisiplinan').trim();
      var notes = String(payload.notes || payload.keterangan || payload.catatan || '').trim();
      var pts = Number(payload.points !== undefined ? payload.points : (payload.poin !== undefined ? payload.poin : 0));

      var record = {
        id: trxId,
        no_transaksi: trxId,
        type: 'pelanggaran',
        tanggal: payload.date || payload.tanggal || nowIso.split('T')[0],
        waktu: payload.time || payload.waktu || '07:00',
        id_siswa: payload.studentId || payload.id_siswa || studentNis,
        studentId: payload.studentId || payload.id_siswa || studentNis,
        nis: studentNis,
        studentNis: studentNis,
        nama_siswa: studentName,
        studentName: studentName,
        kelas: className,
        className: className,
        studentClass: className,
        jurusan: majorName,
        majorName: majorName,
        tingkat: level,
        level: level,
        id_pelanggaran: payload.itemId || payload.violationId || payload.id_pelanggaran || '',
        violationId: payload.itemId || payload.violationId || payload.id_pelanggaran || '',
        kode_pelanggaran: payload.violationCode || payload.kode_pelanggaran || '',
        nama_pelanggaran: itemName,
        violationName: itemName,
        itemName: itemName,
        kategori: itemCategory,
        category: itemCategory,
        itemCategory: itemCategory,
        poin: pts,
        points: pts,
        keterangan: notes,
        notes: notes,
        petugas: officerName,
        officerName: officerName,
        pelapor: officerName,
        officer_role: officerRole,
        officerRole: officerRole,
        officer_email: payload.officerEmail || '',
        officerEmail: payload.officerEmail || '',
        created_at: payload.createdAt || payload.created_at || nowIso
      };

      if (isEdit) {
        var updated = Database.updateRow('transaksi_pelanggaran', trxId, record);
        if (!updated) {
          Database.insertRow('transaksi_pelanggaran', record);
        }
        Database.logActivity(officerName, officerRole, 'EDIT_PELANGGARAN', 'Siswa: ' + record.nama_siswa + ' (' + record.poin + ' Poin)');
      } else {
        Database.insertRow('transaksi_pelanggaran', record);
        Database.logActivity(officerName, officerRole, 'INPUT_PELANGGARAN', 'Siswa: ' + record.nama_siswa + ' (' + record.poin + ' Poin)');
      }

      return { success: true, message: 'Transaksi pelanggaran berhasil dicatat.', transactionId: trxId, data: record };
    } catch (err) {
      console.error('Error in Violation.record:', err);
      return { success: false, message: 'Gagal mencatat transaksi pelanggaran: ' + err.message };
    }
  },

  remove: function(id) {
    try {
      if (!id) return { success: false, message: 'ID transaksi pelanggaran wajib diisi.' };
      var session = Auth.getCurrentUserSession();
      Database.deleteRow('transaksi_pelanggaran', id);
      Database.deleteRow('transactions', id);
      Database.logActivity(session.name || 'Admin', session.role || 'admin', 'HAPUS_PELANGGARAN', 'Menghapus transaksi pelanggaran ID: ' + id);
      return { success: true, message: 'Transaksi pelanggaran berhasil dihapus.' };
    } catch (err) {
      console.error('Error in Violation.remove:', err);
      return { success: false, message: 'Gagal menghapus transaksi pelanggaran: ' + err.message };
    }
  }
};

// Global legacy RPC aliases
function getMasterViolations() {
  return MasterViolation.getAll();
}

function saveTransaction(payload) {
  return Violation.record(payload);
}
