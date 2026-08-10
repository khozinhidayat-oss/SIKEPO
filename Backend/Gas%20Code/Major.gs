/**
 * Major.gs - Master Data Jurusan Management (Google Spreadsheet DB)
 */
var Major = {
  getAll: function() {
    var raw = Database.getTableData('jurusan');
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      raw = Database.getTableData('majors');
    }
    
    // Normalize read fields for backward compatibility and clean mapping
    return (raw || []).map(function(r) {
      return {
        id: String(r.id || r.kode || r.code || ''),
        kode: String(r.kode || r.code || ''),
        nama_jurusan: String(r.nama_jurusan || r.nama || r.name || ''),
        deskripsi: String(r.deskripsi || r.description || ''),
        kaprog: String(r.kaprog || ''),
        status: String(r.status || 'Aktif'),
        created_at: String(r.created_at || r.createdAt || ''),
        updated_at: String(r.updated_at || r.updatedAt || '')
      };
    });
  },

  save: function(data) {
    var session = Auth.getCurrentUserSession();
    var now = new Date().toISOString();
    
    var id = data.id || ('mjr-' + Date.now());
    var normalized = {
      id: id,
      kode: String(data.kode || data.code || '').trim(),
      nama_jurusan: String(data.nama_jurusan || data.nama || data.name || '').trim(),
      deskripsi: String(data.deskripsi || data.description || '').trim(),
      kaprog: String(data.kaprog || '').trim(),
      status: (data.status === 'Nonaktif' || data.isActive === false) ? 'Nonaktif' : 'Aktif',
      updated_at: now
    };

    if (!data.id) {
      normalized.created_at = now;
      Database.insertRow('jurusan', normalized);
      Database.logActivity(session.name, session.role, 'TAMBAH_JURUSAN', 'Menambah jurusan: ' + normalized.nama_jurusan);
    } else {
      Database.updateRow('jurusan', normalized.id, normalized);
      Database.logActivity(session.name, session.role, 'EDIT_JURUSAN', 'Mengubah jurusan: ' + normalized.nama_jurusan);
    }

    Logger.log('[MAJOR] SAVE SUCCESSFUL: ' + JSON.stringify(normalized));
    return { success: true, message: 'Data jurusan berhasil disimpan ke Google Spreadsheet.', data: normalized };
  },

  remove: function(id) {
    var session = Auth.getCurrentUserSession();
    Database.deleteRow('jurusan', id);
    Database.logActivity(session.name, session.role, 'HAPUS_JURUSAN', 'Menghapus jurusan ID: ' + id);
    return { success: true, message: 'Data jurusan berhasil dihapus dari Google Spreadsheet.' };
  }
};
