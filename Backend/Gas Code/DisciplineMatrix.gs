/**
 * DisciplineMatrix.gs - Master Rule Engine & CRUD Services for Discipline Rules Matrix
 * Serves as the Single Source of Truth for discipline rules across the system.
 */

var DisciplineMatrix = {
  getSHEET_NAME: function() {
    return 'master_matriks_kedisiplinan';
  },

  getDefaultRules: function() {
    var nowIso = new Date().toISOString();
    return [
      {
        id: 'rule-1',
        ruleName: 'Kategori Aman & Terbina (Poin 0 - 19)',
        minPoint: 0,
        maxPoint: 19,
        statusKedisiplinan: 'Baik',
        jenisPembinaan: 'Pembinaan Rutin / Pencegahan',
        tindakanSekolah: 'Teguran Lisan 1',
        suratDiterbitkan: 'Tidak Ada',
        pemanggilanOrtu: 'Tidak',
        homeVisit: 'Tidak',
        konselingBk: 'Tidak',
        rekomendasiTindakLanjut: 'Pertahankan Perilaku Baik',
        priority: 1,
        isActive: 'TRUE',
        keterangan: 'Siswa dalam kondisi terdisiplin dan belum ada penanganan khusus.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-2',
        ruleName: 'Peringatan Lisan & Bimbingan BK (Poin 20 - 29)',
        minPoint: 20,
        maxPoint: 29,
        statusKedisiplinan: 'Perlu Pembinaan',
        jenisPembinaan: 'Pembinaan Wali Kelas & Guru BK',
        tindakanSekolah: 'Teguran Lisan 2 & Bimbingan BK',
        suratDiterbitkan: 'Surat Peringatan Lisan',
        pemanggilanOrtu: 'Tidak',
        homeVisit: 'Tidak',
        konselingBk: 'Ya',
        rekomendasiTindakLanjut: 'Konseling Motivasi & Pendampingan Karakter',
        priority: 2,
        isActive: 'TRUE',
        keterangan: 'Siswa mulai memerlukan perhatian dan bimbingan wali kelas & BK.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-3',
        ruleName: 'Surat Peringatan 1 / SP1 (Poin 30 - 39)',
        minPoint: 30,
        maxPoint: 39,
        statusKedisiplinan: 'Perlu Pembinaan',
        jenisPembinaan: 'Pembinaan Wali Kelas, BK & Kesiswaan',
        tindakanSekolah: 'Peringatan Tertulis 1 (SP1)',
        suratDiterbitkan: 'Surat Peringatan 1 (SP1)',
        pemanggilanOrtu: 'Ya',
        homeVisit: 'Tidak',
        konselingBk: 'Ya',
        rekomendasiTindakLanjut: 'Pemanggilan Orang Tua / Wali Siswa ke Sekolah',
        priority: 3,
        isActive: 'TRUE',
        keterangan: 'Penerbitan Surat Peringatan 1 dan pemanggilan orang tua.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-4',
        ruleName: 'Surat Peringatan 2 / SP2 (Poin 40 - 49)',
        minPoint: 40,
        maxPoint: 49,
        statusKedisiplinan: 'Pembinaan Intensif',
        jenisPembinaan: 'Pembinaan Intensif Kesiswaan & Kaprog',
        tindakanSekolah: 'Peringatan Tertulis 2 (SP2)',
        suratDiterbitkan: 'Surat Peringatan 2 (SP2)',
        pemanggilanOrtu: 'Ya',
        homeVisit: 'Tidak',
        konselingBk: 'Ya',
        rekomendasiTindakLanjut: 'Pemanggilan Ortu & Perjanjian Tertulis 1',
        priority: 4,
        isActive: 'TRUE',
        keterangan: 'Penanganan intensif oleh kesiswaan dan kaprog.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-5',
        ruleName: 'Surat Peringatan 3 / SP3 (Poin 50 - 59)',
        minPoint: 50,
        maxPoint: 59,
        statusKedisiplinan: 'Pembinaan Intensif',
        jenisPembinaan: 'Pembinaan Khusus Tim Kedisiplinan & BK',
        tindakanSekolah: 'Peringatan Tertulis 3 (SP3)',
        suratDiterbitkan: 'Surat Peringatan 3 (SP3)',
        pemanggilanOrtu: 'Ya',
        homeVisit: 'Ya',
        konselingBk: 'Ya',
        rekomendasiTindakLanjut: 'Home Visit & Peringatan Terakhir',
        priority: 5,
        isActive: 'TRUE',
        keterangan: 'Home visit dan peringatan keras sebelum skorsing.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-6',
        ruleName: 'Skorsing Ringan & Pengawasan Khusus (Poin 60 - 79)',
        minPoint: 60,
        maxPoint: 79,
        statusKedisiplinan: 'Pengawasan Khusus',
        jenisPembinaan: 'Pengawasan Khusus Kepala Sekolah & Kesiswaan',
        tindakanSekolah: 'Skorsing Sementara (1-3 Hari)',
        suratDiterbitkan: 'Surat Skorsing / Peringatan Keras',
        pemanggilanOrtu: 'Ya',
        homeVisit: 'Ya',
        konselingBk: 'Ya',
        rekomendasiTindakLanjut: 'Skorsing Sementara & Evaluasi Perilaku Ketat',
        priority: 6,
        isActive: 'TRUE',
        keterangan: 'Siswa menjalani skorsing sementara dan pengawasan ketat.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-7',
        ruleName: 'Skorsing Berat & Konferensi Kasus (Poin 80 - 99)',
        minPoint: 80,
        maxPoint: 99,
        statusKedisiplinan: 'Sangat Berat',
        jenisPembinaan: 'Konferensi Kasus & Evaluasi Pleno',
        tindakanSekolah: 'Skorsing Berat (1 Minggu) & Konferensi Kasus',
        suratDiterbitkan: 'Surat Skorsing Berat',
        pemanggilanOrtu: 'Ya',
        homeVisit: 'Ya',
        konselingBk: 'Ya',
        rekomendasiTindakLanjut: 'Konferensi Kasus Bersama Komite & Kepala Sekolah',
        priority: 7,
        isActive: 'TRUE',
        keterangan: 'Konferensi kasus tingkat sekolah sebelum penindakan akhir.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      },
      {
        id: 'rule-8',
        ruleName: 'Dikembalikan kepada Orang Tua (Poin 100+)',
        minPoint: 100,
        maxPoint: 999,
        statusKedisiplinan: 'Dikembalikan kepada Orang Tua',
        jenisPembinaan: 'Pengembalian Hak Pendidikan',
        tindakanSekolah: 'Pengembalian Siswa Kepada Orang Tua / Wali',
        suratDiterbitkan: 'Surat Keputusan Pengembalian Siswa',
        pemanggilanOrtu: 'Ya',
        homeVisit: 'Tidak',
        konselingBk: 'Tidak',
        rekomendasiTindakLanjut: 'Pemberhentian / Dikembalikan Kepada Orang Tua',
        priority: 8,
        isActive: 'TRUE',
        keterangan: 'Batas poin maksimal sekolah tercapai, siswa dikembalikan.',
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: 'System',
        updatedBy: 'System'
      }
    ];
  },

  getAll: function() {
    try {
      var rows = Database.getTableData(this.getSHEET_NAME()) || [];
      if (!rows || rows.length === 0) {
        // Seed default rules if sheet is empty
        var defaults = this.getDefaultRules();
        for (var i = 0; i < defaults.length; i++) {
          Database.insertRow(this.getSHEET_NAME(), defaults[i]);
        }
        return defaults;
      }

      var rules = rows.map(function(r) {
        return {
          id: String(r.id || ''),
          ruleName: String(r.ruleName || r.nama_aturan || r['Nama Aturan'] || ''),
          minPoint: Number(r.minPoint !== undefined ? r.minPoint : (r.min_point || r['Minimal Point'] || 0)),
          maxPoint: Number(r.maxPoint !== undefined ? r.maxPoint : (r.max_point || r['Maksimal Point'] || 0)),
          statusKedisiplinan: String(r.statusKedisiplinan || r.status_kedisiplinan || r['Status Kedisiplinan'] || 'Baik'),
          jenisPembinaan: String(r.jenisPembinaan || r.jenis_pembinaan || r['Jenis Pembinaan'] || ''),
          tindakanSekolah: String(r.tindakanSekolah || r.tindakan_sekolah || r['Tindakan Sekolah'] || ''),
          suratDiterbitkan: String(r.suratDiterbitkan || r.surat_diterbitkan || r['Surat yang Diterbitkan'] || ''),
          pemanggilanOrtu: String(r.pemanggilanOrtu || r['Pemanggilan Orang Tua']) === 'TRUE' || String(r.pemanggilanOrtu || r['Pemanggilan Orang Tua']) === 'Ya',
          homeVisit: String(r.homeVisit || r['Home Visit']) === 'TRUE' || String(r.homeVisit || r['Home Visit']) === 'Ya',
          konselingBk: String(r.konselingBk || r['Konseling BK']) === 'TRUE' || String(r.konselingBk || r['Konseling BK']) === 'Ya',
          rekomendasiTindakLanjut: String(r.rekomendasiTindakLanjut || r.rekomendasi || r['Rekomendasi Tindak Lanjut'] || ''),
          priority: Number(r.priority || r.prioritas || r['Prioritas'] || 1),
          isActive: String(r.isActive || r.is_active || r['Status Aktif'] || 'TRUE').toUpperCase() === 'TRUE' || String(r.isActive || r['Status Aktif']) === 'Aktif' || r.isActive === true,
          keterangan: String(r.keterangan || r.description || r['Keterangan'] || ''),
          createdAt: String(r.createdAt || r.created_at || new Date().toISOString()),
          updatedAt: String(r.updatedAt || r.updated_at || new Date().toISOString()),
          createdBy: String(r.createdBy || r.created_by || 'Admin'),
          updatedBy: String(r.updatedBy || r.updated_by || 'Admin')
        };
      });

      // Sort by priority ascending
      rules.sort(function(a, b) {
        return (a.priority - b.priority) || (a.minPoint - b.minPoint);
      });

      return rules;
    } catch (err) {
      console.error('Error in DisciplineMatrix.getAll:', err);
      return this.getDefaultRules();
    }
  },

  getRuleByPoint: function(points) {
    try {
      var p = Math.max(0, Number(points) || 0);
      var all = this.getAll();
      var activeRules = all.filter(function(r) { return r.isActive; });

      activeRules.sort(function(a, b) { return a.priority - b.priority; });

      for (var i = 0; i < activeRules.length; i++) {
        var rule = activeRules[i];
        if (p >= rule.minPoint && p <= rule.maxPoint) {
          return rule;
        }
      }

      // If point exceeds highest active rule
      if (activeRules.length > 0) {
        var highest = activeRules[activeRules.length - 1];
        if (p > highest.maxPoint) return highest;
      }

      return activeRules[0] || this.getDefaultRules()[0];
    } catch (err) {
      console.error('Error in DisciplineMatrix.getRuleByPoint:', err);
      return this.getDefaultRules()[0];
    }
  },

  validatePointRange: function(ruleId, minPoint, maxPoint, isActive) {
    if (minPoint > maxPoint) {
      return { valid: false, message: 'Minimal Point (' + minPoint + ') harus lebih kecil atau sama dengan Maksimal Point (' + maxPoint + ').' };
    }

    if (!isActive) {
      return { valid: true };
    }

    var all = this.getAll();
    var activeRules = all.filter(function(r) {
      return r.isActive && String(r.id) !== String(ruleId);
    });

    for (var i = 0; i < activeRules.length; i++) {
      var existing = activeRules[i];
      // Check overlap: !(newMax < existingMin || newMin > existingMax)
      if (!(maxPoint < existing.minPoint || minPoint > existing.maxPoint)) {
        return {
          valid: false,
          message: 'Konflik Rentang Poin: Rentang (' + minPoint + ' - ' + maxPoint + ') bertumpang tindih dengan aturan aktif "' + existing.ruleName + '" (' + existing.minPoint + ' - ' + existing.maxPoint + '). Selesaikan atau nonaktifkan aturan lain terlebih dahulu.'
        };
      }
    }

    return { valid: true };
  },

  save: function(ruleData, userName, userRole) {
    try {
      var session = Auth.getCurrentUserSession();
      var name = userName || (session ? session.name : 'Admin');
      var role = userRole || (session ? session.role : 'admin');

      if (role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya peran Admin yang diizinkan mengelola Matriks Aturan Kedisiplinan.' };
      }

      if (!ruleData.ruleName || String(ruleData.ruleName).trim() === '') {
        return { success: false, message: 'Nama Aturan wajib diisi.' };
      }

      if (!ruleData.statusKedisiplinan || String(ruleData.statusKedisiplinan).trim() === '') {
        return { success: false, message: 'Status Kedisiplinan wajib diisi.' };
      }

      if (!ruleData.jenisPembinaan || String(ruleData.jenisPembinaan).trim() === '') {
        return { success: false, message: 'Jenis Pembinaan wajib diisi.' };
      }

      var minPoint = Number(ruleData.minPoint || 0);
      var maxPoint = Number(ruleData.maxPoint || 0);
      var isActive = ruleData.isActive !== false && String(ruleData.isActive).toUpperCase() !== 'FALSE';

      var validation = this.validatePointRange(ruleData.id || '', minPoint, maxPoint, isActive);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      var isUpdate = !!ruleData.id;
      var ruleId = isUpdate ? String(ruleData.id) : ('rule-' + Date.now());
      var nowIso = new Date().toISOString();

      var recordToSave = {
        id: ruleId,
        ruleName: String(ruleData.ruleName).trim(),
        minPoint: minPoint,
        maxPoint: maxPoint,
        statusKedisiplinan: String(ruleData.statusKedisiplinan).trim(),
        jenisPembinaan: String(ruleData.jenisPembinaan).trim(),
        tindakanSekolah: String(ruleData.tindakanSekolah || '').trim(),
        suratDiterbitkan: String(ruleData.suratDiterbitkan || 'Tidak Ada').trim(),
        pemanggilanOrtu: (ruleData.pemanggilanOrtu === true || ruleData.pemanggilanOrtu === 'Ya' || ruleData.pemanggilanOrtu === 'TRUE') ? 'Ya' : 'Tidak',
        homeVisit: (ruleData.homeVisit === true || ruleData.homeVisit === 'Ya' || ruleData.homeVisit === 'TRUE') ? 'Ya' : 'Tidak',
        konselingBk: (ruleData.konselingBk === true || ruleData.konselingBk === 'Ya' || ruleData.konselingBk === 'TRUE') ? 'Ya' : 'Tidak',
        rekomendasiTindakLanjut: String(ruleData.rekomendasiTindakLanjut || '').trim(),
        priority: Number(ruleData.priority || 1),
        isActive: isActive ? 'TRUE' : 'FALSE',
        keterangan: String(ruleData.keterangan || '').trim(),
        updatedAt: nowIso,
        updatedBy: name
      };

      var existingList = this.getAll();
      var oldRecord = existingList.find(function(r) { return String(r.id) === ruleId; });

      if (isUpdate && oldRecord) {
        recordToSave.createdAt = oldRecord.createdAt || nowIso;
        recordToSave.createdBy = oldRecord.createdBy || 'Admin';
        Database.updateRow(this.getSHEET_NAME(), ruleId, recordToSave);
        Database.logActivity(name, role, 'UPDATE_DISCIPLINE_RULE', 'Mengubah Aturan Matriks [' + recordToSave.ruleName + ']. Sebelum: ' + JSON.stringify(oldRecord) + ' | Sesudah: ' + JSON.stringify(recordToSave));
      } else {
        recordToSave.createdAt = nowIso;
        recordToSave.createdBy = name;
        Database.insertRow(this.getSHEET_NAME(), recordToSave);
        Database.logActivity(name, role, 'ADD_DISCIPLINE_RULE', 'Menambah Aturan Matriks Kedisiplinan Baru [' + recordToSave.ruleName + ']: ' + JSON.stringify(recordToSave));
      }

      return {
        success: true,
        message: 'Aturan Matriks Kedisiplinan berhasil ' + (isUpdate ? 'diperbarui' : 'ditambahkan') + '.',
        data: recordToSave
      };
    } catch (err) {
      console.error('Error in DisciplineMatrix.save:', err);
      return { success: false, message: 'Gagal menyimpan aturan kedisiplinan: ' + err.message };
    }
  },

  remove: function(ruleId, userName, userRole) {
    try {
      var session = Auth.getCurrentUserSession();
      var name = userName || (session ? session.name : 'Admin');
      var role = userRole || (session ? session.role : 'admin');

      if (role !== 'admin') {
        return { success: false, message: 'Akses ditolak: Hanya Admin yang diizinkan menghapus aturan kedisiplinan.' };
      }

      var existingList = this.getAll();
      var oldRecord = existingList.find(function(r) { return String(r.id) === String(ruleId); });

      var deleted = Database.deleteRow(this.getSHEET_NAME(), ruleId);
      if (deleted) {
        Database.logActivity(name, role, 'DELETE_DISCIPLINE_RULE', 'Menghapus Aturan Matriks Kedisiplinan ID: ' + ruleId + ' [' + (oldRecord ? oldRecord.ruleName : '') + ']');
        return { success: true, message: 'Aturan kedisiplinan berhasil dihapus.' };
      } else {
        return { success: false, message: 'Aturan kedisiplinan tidak ditemukan.' };
      }
    } catch (err) {
      console.error('Error in DisciplineMatrix.remove:', err);
      return { success: false, message: 'Gagal menghapus aturan: ' + err.message };
    }
  },

  toggleActive: function(ruleId, isActive, userName, userRole) {
    try {
      var existingList = this.getAll();
      var target = existingList.find(function(r) { return String(r.id) === String(ruleId); });
      if (!target) {
        return { success: false, message: 'Aturan tidak ditemukan.' };
      }

      if (isActive) {
        var validation = this.validatePointRange(ruleId, target.minPoint, target.maxPoint, true);
        if (!validation.valid) {
          return { success: false, message: validation.message };
        }
      }

      target.isActive = !!isActive;
      target.updatedAt = new Date().toISOString();
      target.updatedBy = userName || 'Admin';

      return this.save(target, userName, userRole);
    } catch (err) {
      console.error('Error in DisciplineMatrix.toggleActive:', err);
      return { success: false, message: 'Gagal mengubah status aktif aturan: ' + err.message };
    }
  },

  reorder: function(ruleOrders, userName, userRole) {
    try {
      if (!Array.isArray(ruleOrders)) {
        return { success: false, message: 'Data urutan tidak valid.' };
      }

      for (var i = 0; i < ruleOrders.length; i++) {
        var item = ruleOrders[i];
        if (item && item.id) {
          Database.updateRow(this.getSHEET_NAME(), item.id, {
            priority: Number(item.priority || (i + 1)),
            updatedAt: new Date().toISOString(),
            updatedBy: userName || 'Admin'
          });
        }
      }

      Database.logActivity(userName || 'Admin', userRole || 'admin', 'REORDER_DISCIPLINE_RULES', 'Mengubah urutan prioritas Matriks Aturan Kedisiplinan.');
      return { success: true, message: 'Urutan prioritas aturan kedisiplinan berhasil diperbarui.' };
    } catch (err) {
      console.error('Error in DisciplineMatrix.reorder:', err);
      return { success: false, message: 'Gagal mengubah urutan aturan: ' + err.message };
    }
  }
};
