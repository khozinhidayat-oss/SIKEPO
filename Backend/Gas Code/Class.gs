/**
 * Class.gs - Master Data Kelas Management
 */
var Class = {
  getAll: function() {
    return Database.getTableData('classes');
  },

  save: function(data) {
    var session = Auth.getCurrentUserSession();
    if (!data.id) {
      data.id = 'cls-' + Date.now();
      data.createdAt = new Date().toISOString();
      Database.insertRow('classes', data);
      Database.logActivity(session.name, session.role, 'TAMBAH_KELAS', 'Menambah kelas: ' + data.name);
    } else {
      Database.updateRow('classes', data.id, data);
      Database.logActivity(session.name, session.role, 'EDIT_KELAS', 'Mengubah kelas: ' + data.name);
    }
    return { success: true, data: data };
  },

  remove: function(id) {
    var session = Auth.getCurrentUserSession();
    Database.deleteRow('classes', id);
    Database.logActivity(session.name, session.role, 'HAPUS_KELAS', 'Menghapus kelas ID: ' + id);
    return { success: true };
  }
};
