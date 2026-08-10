/**
 * Major.gs - Master Data Jurusan Management
 */
var Major = {
  getAll: function() {
    return Database.getTableData('majors');
  },

  save: function(data) {
    var session = Auth.getCurrentUserSession();
    if (!data.id) {
      data.id = 'mjr-' + Date.now();
      data.createdAt = new Date().toISOString();
      Database.insertRow('majors', data);
      Database.logActivity(session.name, session.role, 'TAMBAH_JURUSAN', 'Menambah jurusan: ' + data.name);
    } else {
      Database.updateRow('majors', data.id, data);
      Database.logActivity(session.name, session.role, 'EDIT_JURUSAN', 'Mengubah jurusan: ' + data.name);
    }
    return { success: true, data: data };
  },

  remove: function(id) {
    var session = Auth.getCurrentUserSession();
    Database.deleteRow('majors', id);
    Database.logActivity(session.name, session.role, 'HAPUS_JURUSAN', 'Menghapus jurusan ID: ' + id);
    return { success: true };
  }
};
