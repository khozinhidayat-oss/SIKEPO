/**
 * Student.gs - Student Management Module (Object Module Pattern)
 * Includes robust UPSERT (Update or Insert) & Deduplication Engine
 */

var Student = {
  getAll: function() {
    try {
      var rows = Database.getTableData('siswa') || [];
      if (rows.length === 0) {
        rows = Database.getTableData('student') || [];
      }
      return rows.map(function(r) {
        return {
          id: String(r.id || r.id_siswa || r.nis || ''),
          nis: String(r.nis || r.NIS || '').trim(),
          nisn: String(r.nisn || r.NISN || '').trim(),
          name: String(r.nama || r.Name || r.name || r.nama_siswa || '').trim(),
          nama: String(r.nama || r.Name || r.name || r.nama_siswa || '').trim(),
          gender: String(r.jenis_kelamin || r.gender || r.Jenis_Kelamin || 'L').trim(),
          jenisKelamin: String(r.jenis_kelamin || r.gender || r.Jenis_Kelamin || 'L').trim(),
          major: String(r.jurusan || r.Major || r.nama_jurusan || '').trim(),
          jurusan: String(r.jurusan || r.Major || r.nama_jurusan || '').trim(),
          level: String(r.tingkat || r.Level || r.Tingkat || 'X').trim(),
          tingkat: String(r.tingkat || r.Level || r.Tingkat || 'X').trim(),
          class: String(r.kelas || r.Class || r.nama_kelas || '').trim(),
          kelas: String(r.kelas || r.Class || r.nama_kelas || '').trim(),
          status: String(r.status || r.Status || 'Aktif').trim(),
          points: Number(r.points || r.poin || 0),
          createdAt: String(r.created_at || r.createdAt || ''),
          updatedAt: String(r.updated_at || r.updatedAt || '')
        };
      });
    } catch (err) {
      console.error('Error in Student.getAll:', err);
      return [];
    }
  },

  normalizeText: function(val) {
    if (!val) return '';
    return String(val).trim().replace(/\s+/g, ' ').toLowerCase();
  },

  findExisting: function(studentData, currentList) {
    var all = currentList || this.getAll();
    var nisn = this.normalizeText(studentData.nisn || studentData.NISN);
    var nis = this.normalizeText(studentData.nis || studentData.NIS);
    var id = this.normalizeText(studentData.id);
    var nama = this.normalizeText(studentData.nama || studentData.name || studentData.Name);
    var jurusan = this.normalizeText(studentData.jurusan || studentData.major || studentData.Major);
    var kelas = this.normalizeText(studentData.kelas || studentData.class || studentData.Class);

    // Priority 1: NISN
    if (nisn) {
      for (var i = 0; i < all.length; i++) {
        if (this.normalizeText(all[i].nisn) === nisn) return all[i];
      }
    }

    // Priority 2: NIS
    if (nis) {
      for (var j = 0; j < all.length; j++) {
        if (this.normalizeText(all[j].nis) === nis) return all[j];
      }
    }

    // Priority 3: ID Siswa
    if (id) {
      for (var k = 0; k < all.length; k++) {
        if (this.normalizeText(all[k].id) === id) return all[k];
      }
    }

    // Priority 4: Combination (Nama + Jurusan + Kelas)
    if (nama && jurusan && kelas) {
      for (var m = 0; m < all.length; m++) {
        if (this.normalizeText(all[m].nama) === nama &&
            this.normalizeText(all[m].jurusan) === jurusan &&
            this.normalizeText(all[m].kelas) === kelas) {
          return all[m];
        }
      }
    }

    return null;
  },

  getById: function(id) {
    if (!id) return null;
    var all = this.getAll();
    var cleanId = this.normalizeText(id);
    for (var i = 0; i < all.length; i++) {
      if (this.normalizeText(all[i].id) === cleanId || this.normalizeText(all[i].nis) === cleanId) {
        return all[i];
      }
    }
    return null;
  },

  save: function(studentData) {
    try {
      if (!studentData) {
        return { success: false, message: 'Data siswa belum lengkap.' };
      }

      var nis = String(studentData.nis || studentData.NIS || '').trim();
      var nisn = String(studentData.nisn || studentData.NISN || '').trim();
      var nama = String(studentData.nama || studentData.name || studentData.Name || '').trim();
      var jurusan = String(studentData.jurusan || studentData.major || studentData.Major || '').trim();
      var tingkat = String(studentData.tingkat || studentData.level || studentData.Level || '').trim();
      var kelas = String(studentData.kelas || studentData.class || studentData.Class || '').trim();
      var status = String(studentData.status || studentData.Status || 'Aktif').trim();
      var gender = String(studentData.jenisKelamin || studentData.gender || studentData.jenis_kelamin || 'L').trim();

      if (!nis || !nama || !jurusan || !tingkat || !kelas || !status) {
        return {
          success: false,
          message: 'Data siswa belum lengkap. Mohon isi NIS, Nama, Jurusan, Tingkat, Kelas, dan Status.'
        };
      }

      var nowIso = new Date().toISOString();
      var existing = this.findExisting(studentData);

      var session = Auth.getCurrentUserSession();
      var sessionUser = session && session.name ? session.name : 'System';
      var sessionRole = session && session.role ? session.role : 'admin';

      if (existing) {
        var record = {
          id: existing.id,
          nis: nis || existing.nis,
          nisn: nisn || existing.nisn || '',
          nama: nama,
          jenis_kelamin: gender,
          jurusan: jurusan,
          tingkat: tingkat,
          kelas: kelas,
          status: status,
          updated_at: nowIso
        };

        var updated = Database.updateRow('siswa', existing.id, record);
        if (!updated && existing.nis) {
          updated = Database.updateRow('siswa', existing.nis, record);
        }

        Database.logActivity(sessionUser, sessionRole, 'EDIT_SISWA', 'Mengubah data siswa: ' + nama + ' (NIS: ' + nis + ')');
        return { success: true, message: 'Data siswa berhasil diperbarui.', data: record, isUpdate: true };
      } else {
        var studentId = studentData.id ? String(studentData.id).trim() : ('std-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        var newRecord = {
          id: studentId,
          nis: nis,
          nisn: nisn,
          nama: nama,
          jenis_kelamin: gender,
          jurusan: jurusan,
          tingkat: tingkat,
          kelas: kelas,
          status: status,
          created_at: nowIso,
          updated_at: nowIso
        };

        Database.insertRow('siswa', newRecord);
        Database.logActivity(sessionUser, sessionRole, 'TAMBAH_SISWA', 'Menambah siswa baru: ' + nama + ' (NIS: ' + nis + ')');
        return { success: true, message: 'Data siswa berhasil disimpan.', data: newRecord, isInsert: true };
      }
    } catch (err) {
      console.error('Error in Student.save:', err);
      return { success: false, message: 'Gagal menyimpan data siswa: ' + err.message };
    }
  },

  remove: function(id) {
    try {
      if (!id) {
        return { success: false, message: 'ID siswa wajib diisi.' };
      }

      var session = Auth.getCurrentUserSession();
      var sessionUser = session && session.name ? session.name : 'System';
      var sessionRole = session && session.role ? session.role : 'admin';

      var deleted = Database.deleteRow('siswa', id);
      if (!deleted) {
        deleted = Database.deleteRow('student', id);
      }

      Database.logActivity(sessionUser, sessionRole, 'HAPUS_SISWA', 'Menghapus data siswa ID/NIS: ' + id);
      return { success: true, message: 'Data siswa berhasil dihapus.' };
    } catch (err) {
      console.error('Error in Student.remove:', err);
      return { success: false, message: 'Gagal menghapus data siswa: ' + err.message };
    }
  },

  importBatch: function(studentsList) {
    try {
      if (!Array.isArray(studentsList) || studentsList.length === 0) {
        return { success: false, message: 'Data import siswa kosong.' };
      }

      var totalExcel = studentsList.length;
      var validCount = 0;
      var insertCount = 0;
      var updateCount = 0;
      var duplicateCount = 0;
      var failCount = 0;

      // 1. In-file deduplication and normalization
      var cleanIncoming = [];
      var seenExcelKeys = {};

      for (var i = 0; i < studentsList.length; i++) {
        var raw = studentsList[i];
        if (!raw) continue;

        var nis = String(raw.nis || raw.NIS || '').trim();
        var nisn = String(raw.nisn || raw.NISN || '').trim();
        var nama = String(raw.nama || raw.name || raw.Name || '').trim();
        var jurusan = String(raw.jurusan || raw.majorName || raw.major || '').trim();
        var tingkat = String(raw.tingkat || raw.level || raw.Level || 'X').trim();
        var kelas = String(raw.kelas || raw.className || raw.class || '').trim();
        var status = String(raw.status || raw.Status || 'Aktif').trim();
        var gender = String(raw.jenisKelamin || raw.gender || raw.jenis_kelamin || 'L').trim();

        if (!nis && !nama) {
          failCount++;
          continue;
        }

        var excelKey = nisn ? ('nisn:' + nisn.toLowerCase()) : (nis ? ('nis:' + nis.toLowerCase()) : ('composite:' + nama.toLowerCase() + '|' + jurusan.toLowerCase() + '|' + kelas.toLowerCase()));

        if (seenExcelKeys[excelKey]) {
          duplicateCount++;
          continue;
        }
        seenExcelKeys[excelKey] = true;

        cleanIncoming.push({
          nis: nis,
          nisn: nisn,
          nama: nama,
          jenisKelamin: gender,
          jurusan: jurusan,
          tingkat: tingkat,
          kelas: kelas,
          status: status
        });
      }

      validCount = cleanIncoming.length;

      // 2. Load current spreadsheet records
      var currentRecords = this.getAll();

      // 3. Process each cleaned record via UPSERT
      for (var j = 0; j < cleanIncoming.length; j++) {
        var item = cleanIncoming[j];
        var existing = this.findExisting(item, currentRecords);

        if (existing) {
          var isChanged = false;
          if (this.normalizeText(existing.nama) !== this.normalizeText(item.nama)) isChanged = true;
          if (this.normalizeText(existing.gender) !== this.normalizeText(item.jenisKelamin)) isChanged = true;
          if (this.normalizeText(existing.jurusan) !== this.normalizeText(item.jurusan)) isChanged = true;
          if (this.normalizeText(existing.tingkat) !== this.normalizeText(item.tingkat)) isChanged = true;
          if (this.normalizeText(existing.kelas) !== this.normalizeText(item.kelas)) isChanged = true;
          if (this.normalizeText(existing.status) !== this.normalizeText(item.status)) isChanged = true;

          if (isChanged) {
            var saveRes = this.save(item);
            if (saveRes && saveRes.success) {
              updateCount++;
            } else {
              failCount++;
            }
          } else {
            duplicateCount++;
          }
        } else {
          var saveResNew = this.save(item);
          if (saveResNew && saveResNew.success) {
            insertCount++;
            currentRecords.push({
              id: saveResNew.data ? saveResNew.data.id : '',
              nis: item.nis,
              nisn: item.nisn,
              nama: item.nama,
              gender: item.jenisKelamin,
              jurusan: item.jurusan,
              tingkat: item.tingkat,
              kelas: item.kelas,
              status: item.status
            });
          } else {
            failCount++;
          }
        }
      }

      var finalTotal = this.getAll().length;

      var session = Auth.getCurrentUserSession();
      Database.logActivity(
        session ? session.name : 'System',
        session ? session.role : 'admin',
        'IMPORT_SISWA',
        'Import Excel: Total ' + totalExcel + ', Baru: ' + insertCount + ', Update: ' + updateCount + ', Duplikat/Sama: ' + duplicateCount + ', Gagal: ' + failCount + ', Total Sheet: ' + finalTotal
      );

      return {
        success: true,
        message: 'Import data siswa selesai (UPSERT). Baru: ' + insertCount + ', Update: ' + updateCount + ', Duplikat: ' + duplicateCount,
        data: {
          totalExcel: totalExcel,
          validCount: validCount,
          insertCount: insertCount,
          updateCount: updateCount,
          duplicateCount: duplicateCount,
          failCount: failCount,
          totalInSpreadsheet: finalTotal
        }
      };
    } catch (err) {
      console.error('Error in Student.importBatch:', err);
      return { success: false, message: 'Gagal import batch siswa: ' + err.message };
    }
  }
};

// Global legacy fallback function definitions
function getAllStudents() {
  return Student.getAll();
}

function saveStudentRecord(data) {
  return Student.save(data);
}

function deleteStudent(id) {
  return Student.remove(id);
}

